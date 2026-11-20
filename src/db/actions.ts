import type { Block, Exercise, Mode, ModeTarget, Routine, RoutineItem, Session, SessionExercise, SetEntry } from '../types'
import { suggest } from '../lib/progression'
import { db, getSetting, setSetting, uid } from './db'

/** séries válidas da última sessão concluída em que o exercício apareceu */
export async function lastPerformance(
  exerciseId: string,
  beforeIso?: string,
): Promise<{ date: string; sets: SetEntry[]; mode: Mode } | undefined> {
  const sessions = (await db.sessions.where('exerciseIds').equals(exerciseId).toArray())
    .filter((s) => s.end && (!beforeIso || s.start < beforeIso))
    .sort((a, b) => b.start.localeCompare(a.start))
  for (const s of sessions) {
    const sets = s.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => e.sets)
      .filter((x) => x.done && !x.warmup)
    if (sets.length) return { date: s.start, sets, mode: s.mode }
  }
  return undefined
}

export const blankSet = (technique: SetEntry['technique'] = 'normal'): SetEntry => ({
  weight: 0,
  reps: 0,
  technique,
  done: false,
})

/** monta o exercício da sessão com séries em branco pré-preenchidas pela sugestão de progressão */
export async function buildSessionExercise(
  ex: Exercise | undefined,
  exerciseId: string,
  item: RoutineItem | undefined,
  mode: Mode,
  defaultRest: number,
): Promise<SessionExercise> {
  const target = item?.targets[mode]
  const last = await lastPerformance(exerciseId)
  const sug = suggest(last?.sets, target, ex?.equipment ?? 'barbell')
  const count = target?.sets ?? Math.max(sug.length, 3)
  return {
    uid: uid(),
    exerciseId,
    routineItemUid: item?.uid,
    superset: item?.superset,
    restSec: item?.restSec ?? defaultRest,
    target,
    suggested: sug.length ? sug : undefined,
    sets: Array.from({ length: count }, (_, i) => ({
      ...blankSet(target?.technique),
      weight: sug[i]?.weight ?? last?.sets[Math.min(i, last.sets.length - 1)]?.weight ?? 0,
      reps: 0,
      rir: undefined,
    })),
  }
}

export async function startSession(
  routine: Routine | undefined,
  block: Block | undefined,
  exById: Record<string, Exercise>,
): Promise<string> {
  const mode: Mode = block?.mode ?? (await getSetting<Mode>('defaultMode', 'high'))
  const defaultRest = await getSetting('defaultRest', 120)
  const exercises: SessionExercise[] = []
  for (const item of routine?.items ?? []) {
    exercises.push(await buildSessionExercise(exById[item.exerciseId], item.exerciseId, item, mode, defaultRest))
  }
  const session: Session = {
    id: uid(),
    start: new Date().toISOString(),
    routineId: routine?.id,
    routineName: routine?.name ?? 'Treino livre',
    blockId: block?.id,
    mode,
    exercises,
    exerciseIds: [...new Set(exercises.map((e) => e.exerciseId))],
  }
  await db.sessions.put(session)
  await setSetting('activeSessionId', session.id)
  return session.id
}

export async function saveSession(session: Session) {
  await db.sessions.put({ ...session, exerciseIds: [...new Set(session.exercises.map((e) => e.exerciseId))] })
}

/** encerra a sessão: descarta séries não feitas, avança a fila do programa. Retorna false se nada foi registrado. */
export async function finishSession(id: string): Promise<boolean> {
  const session = await db.sessions.get(id)
  if (!session) return false
  const exercises = session.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
    .filter((e) => e.sets.length)
  await setSetting('activeSessionId', '')
  if (!exercises.length) {
    await db.sessions.delete(id)
    return false
  }
  await saveSession({ ...session, exercises, end: session.end ?? new Date().toISOString() })
  if (session.routineId) {
    const routines = await db.routines.orderBy('order').toArray()
    const i = routines.findIndex((r) => r.id === session.routineId)
    if (i >= 0 && routines.length) await setSetting('nextRoutineId', routines[(i + 1) % routines.length].id)
  }
  return true
}

export async function discardSession(id: string) {
  await db.sessions.delete(id)
  if ((await getSetting('activeSessionId', '')) === id) await setSetting('activeSessionId', '')
}

/** inicia um novo bloco, encerrando o bloco ativo */
export async function startBlock(name: string, mode: Mode) {
  const now = new Date().toISOString()
  await db.transaction('rw', db.blocks, async () => {
    for (const b of await db.blocks.toArray()) if (!b.end) await db.blocks.update(b.id, { end: now })
    await db.blocks.put({ id: uid(), name, mode, start: now })
  })
}

/** sobrescreve o alvo de um modo em todos os exercícios de todas as rotinas; retorna quantos itens mudaram */
export async function applyModeTargetToRoutines(mode: Mode, target: ModeTarget): Promise<number> {
  let n = 0
  await db.transaction('rw', db.routines, async () => {
    for (const r of await db.routines.toArray()) {
      if (!r.items.length) continue
      n += r.items.length
      await db.routines.update(r.id, { items: r.items.map((it) => ({ ...it, targets: { ...it.targets, [mode]: { ...target } } })) })
    }
  })
  return n
}
