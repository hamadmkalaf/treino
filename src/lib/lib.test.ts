import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '../data/exercises'
import { EQUIP_LABEL, PATTERNS, SUBPART_BY_ID } from '../data/muscles'
import type { Exercise, Session, SetEntry } from '../types'
import { describeSet, e1rm, exerciseSeries, setLoad, subpartSets, weekStart } from './volume'
import { suggest } from './progression'
import { rankSubstitutes, similarity } from './substitution'
import { buildSessions, matchExercise, parseCsv, parseFitbod } from './fitbodImport'
import { exportBackup, importBackup } from './backup'
import { db, ensureSeed } from '../db/db'

const byId: Record<string, Exercise> = Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e]))
const set = (weight: number, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({
  weight,
  reps,
  technique: 'normal',
  done: true,
  ...extra,
})
const session = (start: string, exerciseId: string, sets: SetEntry[]): Session => ({
  id: start + exerciseId,
  start,
  routineName: 'T',
  mode: 'high',
  exercises: [{ uid: 'u', exerciseId, restSec: 90, sets }],
  exerciseIds: [exerciseId],
})

describe('biblioteca', () => {
  it('tem mais de 250 exercícios com ids únicos', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThan(250)
    expect(new Set(SEED_EXERCISES.map((e) => e.id)).size).toBe(SEED_EXERCISES.length)
  })
  it('usa apenas subpartes, equipamentos e padrões válidos', () => {
    for (const e of SEED_EXERCISES) {
      expect(EQUIP_LABEL[e.equipment], `${e.id} equip`).toBeTruthy()
      expect(PATTERNS[e.pattern], `${e.id} pattern`).toBeTruthy()
      expect(e.targets.some((t) => t.role === 'primary'), `${e.id} primário`).toBe(true)
      const ids = e.targets.map((t) => t.subpartId)
      expect(new Set(ids).size, `${e.id} alvo duplicado`).toBe(ids.length)
      for (const id of ids) expect(SUBPART_BY_ID[id], `${e.id} → ${id}`).toBeTruthy()
    }
  })
  it('cobre todas as subpartes como alvo primário', () => {
    const prim = new Set(SEED_EXERCISES.flatMap((e) => e.targets.filter((t) => t.role === 'primary').map((t) => t.subpartId)))
    for (const id of Object.keys(SUBPART_BY_ID)) expect(prim.has(id), id).toBe(true)
  })
  it('distingue as cabeças do bíceps', () => {
    const prim = (id: string) => byId[id].targets.filter((t) => t.role === 'primary').map((t) => t.subpartId)
    expect(prim('curl-incline')).toEqual(['bi-long'])
    expect(prim('curl-spider')).toEqual(['bi-short'])
    expect(prim('curl-hammer')).toContain('brachialis')
  })
})

describe('volume', () => {
  it('conta primário 1 e secundário 0,5, ignorando aquecimento e séries não feitas', () => {
    const s = session('2026-11-09T10:00:00', 'curl-incline', [
      set(10, 10),
      set(10, 9),
      set(5, 15, { warmup: true }),
      set(10, 8, { done: false }),
    ])
    const v = subpartSets([s], byId)
    expect(v['bi-long']).toBe(2)
    expect(v['bi-short']).toBe(1)
  })
  it('soma os segmentos no volume-carga e descreve técnicas', () => {
    const myo = set(20, 15, { technique: 'myoreps', segments: [{ weight: 20, reps: 4 }, { weight: 20, reps: 3 }] })
    expect(setLoad(myo)).toBe(20 * 22)
    expect(describeSet(myo)).toBe('20 × 15 +4+3')
    const drop = set(40, 10, { technique: 'dropset', segments: [{ weight: 30, reps: 8 }] })
    expect(describeSet(drop)).toBe('40 × 10 → 30 × 8')
  })
  it('calcula semana (segunda) e 1RM estimado', () => {
    expect(weekStart('2026-11-14T12:00:00')).toBe('2026-11-09')
    expect(weekStart('2026-11-09T00:30:00')).toBe('2026-11-09')
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.3, 1)
  })
  it('gera série histórica por exercício', () => {
    const pts = exerciseSeries(
      [session('2026-11-10T10:00:00', 'bench-bb', [set(80, 8)]), session('2026-11-03T10:00:00', 'bench-bb', [set(77.5, 8), set(70, 12)])],
      'bench-bb',
    )
    expect(pts.map((p) => p.topWeight)).toEqual([77.5, 80])
    expect(pts[0].sets).toBe(2)
  })
})

describe('progressão', () => {
  const target = { sets: 2, repMin: 8, repMax: 12, technique: 'normal' as const }
  it('sobe a carga quando todas as séries batem o topo', () => {
    expect(suggest([set(60, 12), set(60, 12)], target, 'barbell')).toEqual([
      { weight: 62.5, reps: 8 },
      { weight: 62.5, reps: 8 },
    ])
  })
  it('pede +1 rep quando ainda não bateu o topo', () => {
    expect(suggest([set(60, 12), set(60, 10)], target, 'barbell')).toEqual([
      { weight: 60, reps: 12 },
      { weight: 60, reps: 11 },
    ])
  })
  it('sem histórico não sugere nada; peso corporal progride em reps', () => {
    expect(suggest(undefined, target, 'barbell')).toEqual([])
    expect(suggest([set(0, 12)], { ...target, sets: 1 }, 'bodyweight')).toEqual([{ weight: 0, reps: 13 }])
  })
})

describe('substituição', () => {
  it('prioriza mesma subparte e padrão', () => {
    const subs = rankSubstitutes(byId['curl-incline'], SEED_EXERCISES)
    expect(subs[0].exercise.targets.find((t) => t.subpartId === 'bi-long')?.role).toBe('primary')
    expect(subs.every((s) => s.exercise.pattern === 'curl')).toBe(true)
    expect(similarity(byId['curl-incline'], byId['curl-bayesian'])).toBeGreaterThan(similarity(byId['curl-incline'], byId['curl-spider']))
  })
  it('filtra por equipamento e coloca favoritos primeiro', () => {
    const subs = rankSubstitutes(byId['bench-bb'], SEED_EXERCISES, { equipment: new Set(['dumbbell']), favorites: ['bench-machine'] })
    expect(subs[0].exercise.id).toBe('bench-machine')
    expect(subs.slice(1).every((s) => s.exercise.equipment === 'dumbbell')).toBe(true)
    expect(subs[1].exercise.id).toBe('bench-db')
  })
  it('não sugere exercícios de outro grupo muscular', () => {
    const subs = rankSubstitutes(byId['legext'], SEED_EXERCISES)
    expect(subs.length).toBeGreaterThan(0)
    for (const s of subs) expect(s.exercise.targets.some((t) => SUBPART_BY_ID[t.subpartId].groupId === 'quads')).toBe(true)
  })
})

describe('importação Fitbod', () => {
  const csv = [
    'Date,Exercise,Reps,Weight(kg),Duration(s),Distance(m),Incline,Resistance,isWarmup,Note,multiplier',
    '2025-03-05 17:30:54 +0000,Barbell Bench Press,10,60.0,0.0,0.0,0.0,0.0,false,,1.0',
    '2025-03-05 17:34:10 +0000,Barbell Bench Press,8,65.0,0.0,0.0,0.0,0.0,false,"pesado, mas ok",1.0',
    '2025-03-05 17:40:00 +0000,Hammer Curls,12,14.0,0.0,0.0,0.0,0.0,true,,2.0',
    '2025-03-05 17:50:00 +0000,Running,0,0.0,600.0,1500.0,0.0,0.0,false,,1.0',
    '2025-03-07 18:00:00 +0000,Exercicio Estranho,10,20.0,0.0,0.0,0.0,0.0,false,,1.0',
  ].join('\n')
  it('lê CSV com aspas e vírgulas', () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n1,2,3\n')).toEqual([
      ['a', 'b,c', 'd "e"'],
      ['1', '2', '3'],
    ])
  })
  it('interpreta linhas, ignora cardio e converte libras', () => {
    const rows = parseFitbod(csv)
    expect(rows).toHaveLength(4)
    expect(rows[1].note).toBe('pesado, mas ok')
    expect(rows[2].warmup).toBe(true)
    const lb = parseFitbod('Date,Exercise,Reps,Weight(lbs)\n2025-03-05 17:30:54 +0000,Deadlift,5,220')
    expect(lb[0].weightKg).toBeCloseTo(99.75, 2)
  })
  it('casa nomes e monta sessões por dia', () => {
    expect(matchExercise('Barbell Bench Press', SEED_EXERCISES)).toBe('bench-bb')
    expect(matchExercise('Hammer Curls', SEED_EXERCISES)).toBe('curl-hammer')
    expect(matchExercise('Lat Pulldown', SEED_EXERCISES)).toBe('pulldown-wide')
    expect(matchExercise('Exercicio Estranho', SEED_EXERCISES)).toBeUndefined()
    let n = 0
    const sessions = buildSessions(parseFitbod(csv), { 'Barbell Bench Press': 'bench-bb', 'Hammer Curls': 'curl-hammer' }, () => `id${n++}`)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].exercises.map((e) => e.sets.length)).toEqual([2, 1])
    expect(sessions[0].exerciseIds).toEqual(['bench-bb', 'curl-hammer'])
  })
})

describe('banco e backup', () => {
  it('semeia o programa inicial uma única vez e restaura backup', async () => {
    await ensureSeed()
    await ensureSeed()
    const routines = await db.routines.orderBy('order').toArray()
    expect(routines.map((r) => r.name)).toEqual(['Treino A', 'Treino B', 'Treino C', 'Upper', 'Lower'])
    await db.sessions.put(session('2026-11-10T10:00:00', 'bench-bb', [set(80, 8)]))
    const backup = JSON.parse(JSON.stringify(await exportBackup()))
    await db.sessions.clear()
    await db.routines.clear()
    await importBackup(backup)
    expect(await db.sessions.count()).toBe(1)
    expect(await db.routines.count()).toBe(5)
    expect((await db.sessions.where('exerciseIds').equals('bench-bb').toArray()).length).toBe(1)
    await expect(importBackup({ foo: 1 })).rejects.toThrow()
  })
})
