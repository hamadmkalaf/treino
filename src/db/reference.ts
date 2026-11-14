import { buildRoutines, buildSessions, matchExercise, parseFitbod, validateRoutineFile } from '../lib/fitbodImport'
import type { Exercise } from '../types'
import { db, DEFAULT_TARGETS, uid } from './db'

/**
 * Carrega os treinos de referência que acompanham o app (dados-importacao/): rotinas e histórico.
 * Pode ser repetido sem duplicar: rotinas com nome já existente são ignoradas e as sessões têm id fixo por dia.
 */
export async function loadReference(exercises: Exercise[]) {
  const [routinesRef, historyRef] = await Promise.all([
    import('../../dados-importacao/rotinas-referencia.json'),
    import('../../dados-importacao/historico-referencia.csv?raw'),
  ])
  const file = validateRoutineFile(routinesRef.default)
  const rows = parseFitbod(historyRef.default)

  const mapping: Record<string, string> = {}
  for (const name of [...file.routines.flatMap((r) => r.items.map((i) => i.name)), ...rows.map((r) => r.name)]) {
    if (name in mapping) continue
    const id = matchExercise(name, exercises)
    if (id) mapping[name] = id
  }

  const sessions = buildSessions(rows, mapping, uid).map((s) => ({ ...s, id: `ref-${s.start.slice(0, 10)}` }))
  let routines = 0
  await db.transaction('rw', db.routines, db.sessions, async () => {
    const existing = await db.routines.toArray()
    const names = new Set(existing.map((r) => r.name.toLowerCase()))
    const firstOrder = Math.max(-1, ...existing.map((r) => r.order)) + 1
    const fresh = buildRoutines(file, mapping, uid, firstOrder, DEFAULT_TARGETS).filter((r) => !names.has(r.name.toLowerCase()))
    await db.routines.bulkPut(fresh)
    await db.sessions.bulkPut(sessions)
    routines = fresh.length
  })
  return { routines, skipped: file.routines.length - routines, sessions: sessions.length, sets: rows.length }
}
