import { GROUP_BY_ID, MODE_LABEL, SUBPART_BY_ID, TECHNIQUE_LABEL } from '../data/muscles'
import type { Block, Exercise, Session } from '../types'
import { buildXlsx, type SheetData } from './xlsx'
import { dayKey, describeSet, e1rm, setLoad, setReps, workingSets } from './volume'

/** período do histórico (datas locais "aaaa-mm-dd", inclusivas); sem limite = tudo */
export interface HistoryRange {
  from?: string
  to?: string
}

export type RangePreset = '7' | '30' | '90' | '180' | '365' | 'all' | 'custom'

export const RANGE_PRESETS: { id: RangePreset; label: string }[] = [
  { id: '7', label: '7 dias' },
  { id: '30', label: '30 dias' },
  { id: '90', label: '3 meses' },
  { id: '180', label: '6 meses' },
  { id: '365', label: '12 meses' },
  { id: 'all', label: 'Tudo' },
  { id: 'custom', label: 'Personalizado' },
]

/** período dos últimos N dias, contando hoje */
export function presetRange(preset: RangePreset, today = new Date()): HistoryRange {
  if (preset === 'all' || preset === 'custom') return {}
  const from = new Date(today)
  from.setDate(from.getDate() - (Number(preset) - 1))
  return { from: dayKey(from), to: dayKey(today) }
}

/** sessões concluídas dentro do período, em ordem cronológica */
export function sessionsInRange(sessions: Session[], range: HistoryRange): Session[] {
  return sessions
    .filter((s) => {
      if (!s.end) return false
      const k = dayKey(new Date(s.start))
      return (!range.from || k >= range.from) && (!range.to || k <= range.to)
    })
    .sort((a, b) => a.start.localeCompare(b.start))
}

const minutes = (s: Session) => (s.end ? Math.max(1, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000)) : undefined)
const round1 = (n: number) => Math.round(n * 10) / 10

function primaryGroup(ex?: Exercise): string {
  const t = ex?.targets.find((x) => x.role === 'primary') ?? ex?.targets[0]
  const sub = t && SUBPART_BY_ID[t.subpartId]
  return sub ? (GROUP_BY_ID[sub.groupId]?.pt ?? '') : ''
}

/**
 * Monta a planilha do histórico com três abas:
 * - Séries: uma linha por série concluída (inclui aquecimento, marcado na coluna própria)
 * - Treinos: uma linha por sessão, com totais
 * - Exercícios: resumo por exercício no período
 */
export function historySheets(sessions: Session[], exById: Record<string, Exercise>, blocks: Block[] = []): SheetData[] {
  const blockName = Object.fromEntries(blocks.map((b) => [b.id, b.name]))
  const exName = (id: string) => exById[id]?.namePt ?? id

  const setRows: SheetData['rows'] = []
  const sessionRows: SheetData['rows'] = []
  const perExercise: Record<string, { sessions: Set<string>; sets: number; reps: number; load: number; topW: number; best: number; first: Date; last: Date }> = {}

  for (const s of sessions) {
    const start = new Date(s.start)
    let nSets = 0
    let nReps = 0
    let load = 0
    for (const se of s.exercises) {
      const ex = exById[se.exerciseId]
      let n = 0
      for (const set of se.sets) {
        if (!set.done) continue
        n++
        const reps = setReps(set)
        const l = setLoad(set)
        setRows.push([
          start,
          start,
          s.routineName,
          MODE_LABEL[s.mode],
          s.blockId ? (blockName[s.blockId] ?? '') : '',
          exName(se.exerciseId),
          primaryGroup(ex),
          se.substitutedFrom ? exName(se.substitutedFrom) : '',
          n,
          set.warmup ? 'sim' : '',
          set.weight,
          set.reps,
          set.rir ?? '',
          set.rir !== undefined ? 10 - set.rir : '',
          TECHNIQUE_LABEL[set.technique] ?? set.technique,
          set.segments?.length ? describeSet(set) : '',
          reps,
          round1(l),
          set.warmup ? '' : e1rm(set.weight, set.reps),
          [set.failure && 'falha', set.partials && 'parciais', set.negative && 'negativa'].filter(Boolean).join(', '),
          set.tempo ?? '',
          se.note ?? '',
        ])
      }
      const work = workingSets(se)
      if (work.length) {
        nSets += work.length
        const r = work.reduce((a, x) => a + setReps(x), 0)
        const l = work.reduce((a, x) => a + setLoad(x), 0)
        nReps += r
        load += l
        const agg = (perExercise[se.exerciseId] ??= { sessions: new Set(), sets: 0, reps: 0, load: 0, topW: 0, best: 0, first: start, last: start })
        agg.sessions.add(s.id)
        agg.sets += work.length
        agg.reps += r
        agg.load += l
        agg.topW = Math.max(agg.topW, ...work.map((x) => x.weight))
        agg.best = Math.max(agg.best, ...work.map((x) => e1rm(x.weight, x.reps)))
        if (start < agg.first) agg.first = start
        if (start > agg.last) agg.last = start
      }
    }
    sessionRows.push([
      start,
      start,
      s.routineName,
      MODE_LABEL[s.mode],
      s.blockId ? (blockName[s.blockId] ?? '') : '',
      minutes(s),
      s.exercises.filter((e) => workingSets(e).length).length,
      nSets,
      nReps,
      round1(load),
      s.notes ?? '',
    ])
  }

  const exerciseRows: SheetData['rows'] = Object.entries(perExercise)
    .sort((a, b) => exName(a[0]).localeCompare(exName(b[0]), 'pt'))
    .map(([id, a]) => [exName(id), primaryGroup(exById[id]), a.sessions.size, a.sets, a.reps, round1(a.load), a.topW, a.best, a.first, a.last])

  return [
    {
      name: 'Séries',
      columns: [
        { header: 'Data', format: 'date', width: 11 },
        { header: 'Hora', format: 'time', width: 7 },
        { header: 'Treino', width: 18 },
        { header: 'Modo', width: 12 },
        { header: 'Bloco', width: 14 },
        { header: 'Exercício', width: 32 },
        { header: 'Grupo muscular', width: 18 },
        { header: 'Substituiu', width: 24 },
        { header: 'Série', width: 6 },
        { header: 'Aquecimento', width: 12 },
        { header: 'Carga (kg)', format: 'decimal', width: 10 },
        { header: 'Reps', width: 6 },
        { header: 'RIR', width: 5 },
        { header: 'RPE', width: 5 },
        { header: 'Técnica', width: 11 },
        { header: 'Detalhe da técnica', width: 22 },
        { header: 'Reps totais', width: 10 },
        { header: 'Volume-carga (kg)', format: 'decimal', width: 16 },
        { header: '1RM est. (kg)', format: 'decimal', width: 12 },
        { header: 'Marcadores', width: 14 },
        { header: 'Cadência', width: 9 },
        { header: 'Nota do exercício', width: 24 },
      ],
      rows: setRows,
    },
    {
      name: 'Treinos',
      columns: [
        { header: 'Data', format: 'date', width: 11 },
        { header: 'Início', format: 'time', width: 7 },
        { header: 'Treino', width: 18 },
        { header: 'Modo', width: 12 },
        { header: 'Bloco', width: 14 },
        { header: 'Duração (min)', width: 12 },
        { header: 'Exercícios', width: 10 },
        { header: 'Séries válidas', width: 13 },
        { header: 'Reps totais', width: 11 },
        { header: 'Volume-carga (kg)', format: 'decimal', width: 16 },
        { header: 'Notas', width: 30 },
      ],
      rows: sessionRows,
    },
    {
      name: 'Exercícios',
      columns: [
        { header: 'Exercício', width: 32 },
        { header: 'Grupo muscular', width: 18 },
        { header: 'Sessões', width: 8 },
        { header: 'Séries válidas', width: 13 },
        { header: 'Reps totais', width: 11 },
        { header: 'Volume-carga (kg)', format: 'decimal', width: 16 },
        { header: 'Carga máx. (kg)', format: 'decimal', width: 14 },
        { header: 'Melhor 1RM est. (kg)', format: 'decimal', width: 18 },
        { header: 'Primeiro registro', format: 'date', width: 16 },
        { header: 'Último registro', format: 'date', width: 15 },
      ],
      rows: exerciseRows,
    },
  ]
}

export function historyXlsx(sessions: Session[], exById: Record<string, Exercise>, blocks: Block[] = []): Uint8Array {
  return buildXlsx(historySheets(sessions, exById, blocks))
}

export function historyFilename(range: HistoryRange, today = new Date()): string {
  const to = range.to ?? dayKey(today)
  return range.from ? `treino-historico-${range.from}_a_${to}.xlsx` : `treino-historico-completo-${to}.xlsx`
}
