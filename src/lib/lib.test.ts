import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { SEED_EXERCISES } from '../data/exercises'
import { EQUIP_LABEL, PATTERNS, SUBPART_BY_ID } from '../data/muscles'
import type { Exercise, Session, SetEntry } from '../types'
import { describeSet, e1rm, exerciseSeries, groupSets, groupTarget, setLoad, subpartSets, weekMode, weekStart } from './volume'
import { suggest } from './progression'
import { rankSubstitutes, similarity } from './substitution'
import { buildRoutines, buildSessions, matchExercise, parseCsv, parseFitbod, validateRoutineFile } from './fitbodImport'
import { exportBackup, importBackup } from './backup'
import { db, DEFAULT_TARGETS, ensureSeed, getModeDefaults, mergeModeDefaults, setSetting } from '../db/db'
import { applyModeTargetToRoutines } from '../db/actions'
import routinesRef from '../../dados-importacao/rotinas-referencia.json'
import historyRef from '../../dados-importacao/historico-referencia.csv?raw'

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

describe('importação de rotinas', () => {
  it('converte rotinas de referência usando padrões quando faltam séries/reps', () => {
    const f = validateRoutineFile({
      app: 'treino-rotinas',
      routines: [{ name: 'Teste', items: [{ name: 'Lat Pulldown', sets: 4, reps: null }, { name: 'Hammer Curls', sets: 3, reps: 10 }, { name: 'Desconhecido', sets: 3, reps: 8 }] }],
    })
    let n = 0
    const mapping = { 'Lat Pulldown': 'pulldown-wide', 'Hammer Curls': 'curl-hammer' }
    const [r] = buildRoutines(f, mapping, () => String(n++), 7, DEFAULT_TARGETS)
    expect(r.order).toBe(7)
    expect(r.items).toHaveLength(2)
    expect(r.items[0].targets.high).toMatchObject({ sets: 4, repMin: 8, repMax: 12 })
    expect(r.items[1].targets.high).toMatchObject({ sets: 3, repMin: 10, repMax: 12 })
    expect(r.items[1].targets.low).toMatchObject({ sets: 3, repMin: 8, repMax: 10 })
    expect(() => validateRoutineFile({ app: 'x' })).toThrow()
  })
  it('reconhece todos os exercícios dos dados de referência', () => {
    const names = new Set([
      ...validateRoutineFile(routinesRef).routines.flatMap((r) => r.items.map((i) => i.name)),
      ...parseFitbod(historyRef).map((r) => r.name),
    ])
    const unmatched = [...names].filter((n) => !matchExercise(n, SEED_EXERCISES))
    expect(unmatched).toEqual([])
    expect(matchExercise('Dumbbell Incline Bench Press', SEED_EXERCISES)).toBe('incline-db')
  })
})

describe('volume por grupo e alvos', () => {
  it('conta cada série uma vez por grupo, mesmo com várias subpartes do grupo', () => {
    const ex: Exercise = {
      id: 'x', namePt: 'x', nameEn: 'x', equipment: 'cable', pattern: 'curl', tension: 'mid',
      targets: [
        { subpartId: 'bi-long', role: 'primary' },
        { subpartId: 'bi-short', role: 'primary' },
        { subpartId: 'brachiorad', role: 'secondary' },
      ],
    }
    const s = session('2026-01-05T10:00:00', 'x', [set(20, 10), set(20, 10), set(20, 10, { warmup: true })])
    const g = groupSets([s], { x: ex })
    expect(g.biceps).toBe(2)
    expect(g.forearms).toBe(1)
    expect(subpartSets([s], { x: ex })['bi-long'] + subpartSets([s], { x: ex })['bi-short']).toBe(4)
  })
  it('primário prevalece sobre secundário no mesmo grupo', () => {
    const ex: Exercise = {
      id: 'y', namePt: 'y', nameEn: 'y', equipment: 'cable', pattern: 'row', tension: 'mid',
      targets: [{ subpartId: 'lat-upper', role: 'primary' }, { subpartId: 'rhomb', role: 'secondary' }],
    }
    expect(groupSets([session('2026-01-05T10:00:00', 'y', [set(50, 10)])], { y: ex }).back).toBe(1)
  })
  it('alvo por grupo usa o valor salvo do modo ou o padrão', () => {
    const t = { low: { biceps: { min: 4, max: 8 } } }
    expect(groupTarget(t, 'low', 'biceps')).toEqual({ min: 4, max: 8 })
    expect(groupTarget(t, 'low', 'triceps')).toEqual({ min: 6, max: 10 })
    expect(groupTarget(t, 'high', 'biceps')).toEqual({ min: 10, max: 20 })
  })
  it('modo da semana é o predominante', () => {
    const s = (mode: 'low' | 'high') => ({ ...session('2026-01-05T10:00:00', 'x', []), mode })
    expect(weekMode([])).toBeUndefined()
    expect(weekMode([s('low'), s('low'), s('high')])).toBe('low')
    expect(weekMode([s('low'), s('high')])).toBe('high')
  })
})

describe('padrões de low/high volume', () => {
  it('completa valores salvos com os padrões do app', async () => {
    expect(mergeModeDefaults({ low: { sets: 3 } }).low).toEqual({ ...DEFAULT_TARGETS.low, sets: 3 })
    await setSetting('modeDefaults', { high: { ...DEFAULT_TARGETS.high, repMin: 12, repMax: 15 } })
    const d = await getModeDefaults()
    expect(d.high.repMin).toBe(12)
    expect(d.low).toEqual(DEFAULT_TARGETS.low)
  })
  it('aplica o alvo de um modo a todas as rotinas sem mexer no outro modo', async () => {
    await db.routines.clear()
    const item = (uid: string) => ({ uid, exerciseId: 'curl-incline', targets: structuredClone(DEFAULT_TARGETS), restSec: 90 })
    await db.routines.bulkPut([
      { id: 'r1', name: 'A', order: 0, items: [item('a'), item('b')] },
      { id: 'r2', name: 'B', order: 1, items: [item('c')] },
    ])
    const target = { sets: 3, repMin: 5, repMax: 8, rir: 1, technique: 'myoreps' as const }
    expect(await applyModeTargetToRoutines('low', target)).toBe(3)
    const all = (await db.routines.toArray()).flatMap((r) => r.items)
    for (const it of all) {
      expect(it.targets.low).toEqual(target)
      expect(it.targets.high).toEqual(DEFAULT_TARGETS.high)
    }
  })
})
