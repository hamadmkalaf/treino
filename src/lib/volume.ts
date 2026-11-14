import type { Exercise, Session, SessionExercise, SetEntry } from '../types'

/** séries válidas para volume: concluídas e não-aquecimento */
export const workingSets = (se: SessionExercise): SetEntry[] => se.sets.filter((s) => s.done && !s.warmup)

/** volume-carga (kg × reps) de uma série, somando mini-séries / quedas */
export const setLoad = (s: SetEntry): number =>
  s.weight * s.reps + (s.segments ?? []).reduce((a, g) => a + g.weight * g.reps, 0)

export const setReps = (s: SetEntry): number => s.reps + (s.segments ?? []).reduce((a, g) => a + g.reps, 0)

export const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** segunda-feira (data local) da semana de uma data */
export function weekStart(iso: string | Date): string {
  const d = new Date(iso)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return dayKey(d)
}

/**
 * Séries por subparte muscular: alvo primário conta 1 série, secundário 0,5.
 * Uma série com técnica estruturada (myo-reps, drop-set, rest-pause) conta como 1 série.
 */
export function subpartSets(sessions: Session[], exById: Record<string, Exercise>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const session of sessions) {
    for (const se of session.exercises) {
      const ex = exById[se.exerciseId]
      if (!ex) continue
      const n = workingSets(se).length
      if (!n) continue
      for (const t of ex.targets) {
        out[t.subpartId] = (out[t.subpartId] ?? 0) + n * (t.role === 'primary' ? 1 : 0.5)
      }
    }
  }
  return out
}

/** agrupa sessões por semana (chave = segunda-feira) */
export function byWeek(sessions: Session[]): Record<string, Session[]> {
  const out: Record<string, Session[]> = {}
  for (const s of sessions) (out[weekStart(s.start)] ??= []).push(s)
  return out
}

/** 1RM estimado (Epley) */
export const e1rm = (weight: number, reps: number): number =>
  reps <= 0 ? 0 : reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10

export interface ExercisePoint {
  date: string
  topWeight: number
  topReps: number
  e1rm: number
  load: number
  sets: number
}

/** série histórica de um exercício (uma entrada por sessão, ordem cronológica) */
export function exerciseSeries(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const out: ExercisePoint[] = []
  for (const session of [...sessions].sort((a, b) => a.start.localeCompare(b.start))) {
    const sets = session.exercises.filter((e) => e.exerciseId === exerciseId).flatMap(workingSets)
    if (!sets.length) continue
    const top = sets.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a))
    out.push({
      date: session.start,
      topWeight: top.weight,
      topReps: top.reps,
      e1rm: Math.max(...sets.map((s) => e1rm(s.weight, s.reps))),
      load: Math.round(sets.reduce((a, s) => a + setLoad(s), 0)),
      sets: sets.length,
    })
  }
  return out
}

/** descreve uma série em texto: "60 × 12 +4+4+3" ou "40 × 10 → 30 × 8" */
export function describeSet(s: SetEntry): string {
  const base = `${fmt(s.weight)} × ${s.reps}`
  const seg = s.segments ?? []
  if (!seg.length) return base
  if (s.technique === 'dropset') return [base, ...seg.map((g) => `${fmt(g.weight)} × ${g.reps}`)].join(' → ')
  return `${base} ${seg.map((g) => `+${g.reps}`).join('')}`
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '').replace('.', ','))
