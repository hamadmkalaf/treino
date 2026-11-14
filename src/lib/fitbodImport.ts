import type { Exercise, Mode, ModeTarget, Routine, Session, SessionExercise } from '../types'
import { dayKey } from './volume'

export interface FitbodRow {
  date: Date
  name: string
  reps: number
  weightKg: number
  warmup: boolean
  note: string
}

/** parser de CSV com suporte a campos entre aspas */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cur += '"'
        i++
      } else if (c === '"') quoted = false
      else cur += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cur)
      cur = ''
      if (row.some((v) => v.trim() !== '')) rows.push(row)
      row = []
    } else cur += c
  }
  row.push(cur)
  if (row.some((v) => v.trim() !== '')) rows.push(row)
  return rows
}

function parseDate(v: string): Date {
  const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*([+-]\d{2}):?(\d{2})$/)
  if (m) return new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`)
  return new Date(v.trim().replace(' ', 'T'))
}

const LB = 0.45359237

/** lê o CSV exportado pelo Fitbod (colunas Date, Exercise, Reps, Weight(kg|lbs), isWarmup, Note...) */
export function parseFitbod(text: string): FitbodRow[] {
  const rows = parseCsv(text)
  if (rows.length < 2) throw new Error('Arquivo vazio ou sem cabeçalho.')
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ''))
  const col = (pred: (h: string) => boolean) => head.findIndex(pred)
  const iDate = col((h) => h === 'date')
  const iName = col((h) => h === 'exercise')
  const iReps = col((h) => h === 'reps')
  const iWeight = col((h) => h.startsWith('weight'))
  const iWarm = col((h) => h === 'iswarmup')
  const iNote = col((h) => h === 'note')
  if (iDate < 0 || iName < 0 || iReps < 0 || iWeight < 0)
    throw new Error('Cabeçalho não reconhecido: esperava colunas Date, Exercise, Reps e Weight.')
  const lbs = /lb/.test(head[iWeight])
  const out: FitbodRow[] = []
  for (const r of rows.slice(1)) {
    const date = parseDate(r[iDate] ?? '')
    const reps = Math.round(Number(r[iReps]))
    if (Number.isNaN(date.getTime()) || !r[iName]?.trim() || !(reps > 0)) continue
    const w = Number(r[iWeight]) || 0
    out.push({
      date,
      name: r[iName].trim(),
      reps,
      weightKg: Math.round((lbs ? w * LB : w) * 4) / 4,
      warmup: /^(true|1|yes)$/i.test((r[iWarm] ?? '').trim()),
      note: (r[iNote] ?? '').trim(),
    })
  }
  return out
}

const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(bicep|tricep)\b/g, '$1s')
    .replace(/\bcurls\b/g, 'curl')
    .replace(/\bcrunches\b/g, 'crunch')
    .replace(/\s+/g, ' ')
    .trim()

/** nomes usados pelo Fitbod → id na biblioteca */
const ALIASES: Record<string, string> = {
  'back squat': 'squat-bb',
  'barbell squat': 'squat-bb',
  deadlift: 'deadlift',
  'romanian deadlift': 'rdl-bb',
  'dumbbell romanian deadlift': 'rdl-db',
  'stiff legged barbell good morning': 'good-morning',
  'bent over barbell row': 'row-bb',
  'dumbbell row': 'row-db',
  'dumbbell bent over row': 'row-db',
  'seated cable row': 'row-cable-close',
  'cable row': 'row-cable-close',
  'lat pulldown': 'pulldown-wide',
  'machine row': 'row-machine',
  't bar row': 'row-tbar',
  'pull up': 'pullup',
  'chin up': 'chinup',
  'assisted pull up': 'pullup-assisted',
  dip: 'dip-chest',
  'assisted dip': 'dip-assisted',
  'bench dip': 'dip-bench',
  'push up': 'pushup',
  'incline dumbbell bench press': 'incline-db',
  'dumbbell incline bench press': 'incline-db',
  'incline bench press': 'incline-bb',
  'incline barbell bench press': 'incline-bb',
  'decline bench press': 'decline-bb',
  'machine bench press': 'bench-machine',
  'smith machine bench press': 'bench-smith',
  'machine fly': 'pec-deck',
  'cable crossover fly': 'crossover-mid',
  'cable crossover': 'crossover-mid',
  'dumbbell shoulder press': 'ohp-db',
  'barbell shoulder press': 'ohp-bb',
  'overhead press': 'ohp-bb',
  'machine shoulder press': 'ohp-machine',
  'cable lateral raise': 'lat-raise-cable',
  'lateral raise': 'lat-raise-db',
  'machine reverse fly': 'reverse-pec-deck',
  'dumbbell rear delt raise': 'reverse-fly-db',
  'cable face pull': 'face-pull',
  'dumbbell biceps curl': 'curl-db',
  'ez bar curl': 'curl-ez',
  'hammer curl': 'curl-hammer',
  'preacher curl': 'curl-preacher-ez',
  'machine preacher curl': 'curl-preacher-machine',
  'cable biceps curl': 'curl-cable',
  'incline dumbbell curl': 'curl-incline',
  'cable rope triceps extension': 'pushdown-rope',
  'cable triceps pushdown': 'pushdown-bar',
  'triceps pushdown': 'pushdown-bar',
  'cable rope overhead triceps extension': 'tri-oh-rope',
  skullcrusher: 'skull-ez',
  'skull crusher': 'skull-ez',
  'dumbbell triceps extension': 'tri-oh-db',
  'leg press': 'legpress-45',
  'leg extension': 'legext',
  'leg curl': 'legcurl-lying',
  'seated leg curl': 'legcurl-seated',
  'lying hamstrings curl': 'legcurl-lying',
  'hip thrust': 'hip-thrust-bb',
  'machine hip abductor': 'abduction-machine',
  'machine hip adductor': 'adduction-machine',
  'hip abduction': 'abduction-machine',
  'hip adduction': 'adduction-machine',
  'bulgarian split squat': 'bulgarian-db',
  'dumbbell lunge': 'lunge-reverse',
  'walking lunge': 'lunge-walking',
  'calf raise': 'calf-standing',
  'standing machine calf raise': 'calf-standing',
  'seated machine calf press': 'calf-seated',
  'calf press': 'calf-legpress',
  'back extensions': 'back-ext',
  'hanging leg raise': 'legraise-hanging',
  'hanging knee raise': 'kneeraise-hanging',
  'leg raise': 'legraise-lying',
  'ab crunch machine': 'crunch-machine',
  'russian twist': 'russian-twist',
  'dumbbell shrug': 'shrug-db',
  'dumbbell pullover': 'pullover-db',
  'dumbbell fly': 'fly-db',
  'close grip bench press': 'bench-close',
  'arnold dumbbell press': 'arnold-press',
  'dumbbell front raise': 'front-raise-db',
  'upright row': 'upright-row-bb',
  'goblet squat': 'squat-goblet',
  'kettlebell swing': 'kb-swing',
  'dumbbell back fly': 'reverse-fly-incline',
  'incline dumbbell row': 'row-db-incline',
  'hammerstrength iso row': 'row-plate',
  'hammerstrength low row': 'row-plate',
  'hammerstrength high row': 'row-plate-high',
  'standing machine calf press': 'calf-standing',
  'behind the back cable biceps curl': 'curl-cable',
  'cable shoulder external rotation': 'ext-rot-cable',
  'cable shoulder external rotation at 90': 'ext-rot-cable',
  'cable shoulder internal rotation': 'int-rot-cable',
  'cable shoulder internal rotation at 90': 'int-rot-cable',
  'dumbbell stiff legged deadlift': 'stiff',
  'cable wood chop': 'woodchop',
  'cable one arm triceps side extension': 'pushdown-uni',
}

/** tenta casar um nome do Fitbod com um exercício da biblioteca; retorna o id ou undefined */
export function matchExercise(name: string, exercises: Exercise[]): string | undefined {
  const n = norm(name)
  const byId = new Set(exercises.map((e) => e.id))
  const exact = exercises.find((e) => norm(e.nameEn) === n || norm(e.namePt) === n)
  if (exact) return exact.id
  if (ALIASES[n] && byId.has(ALIASES[n])) return ALIASES[n]
  // semelhança por conjunto de palavras
  const a = new Set(n.split(' '))
  let best: { id: string; score: number } | undefined
  for (const e of exercises) {
    const b = new Set(norm(e.nameEn).split(' '))
    const inter = [...a].filter((t) => b.has(t)).length
    const score = inter / (a.size + b.size - inter)
    if (!best || score > best.score) best = { id: e.id, score }
  }
  return best && best.score >= 0.75 ? best.id : undefined
}

/**
 * Converte linhas do Fitbod em sessões (uma por dia).
 * mapping: nome no Fitbod → id do exercício no app.
 */
export function buildSessions(rows: FitbodRow[], mapping: Record<string, string>, makeId: () => string): Session[] {
  const days = new Map<string, FitbodRow[]>()
  for (const r of [...rows].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const k = dayKey(r.date)
    if (!days.has(k)) days.set(k, [])
    days.get(k)!.push(r)
  }
  const sessions: Session[] = []
  for (const list of days.values()) {
    const exercises: SessionExercise[] = []
    for (const r of list) {
      const exerciseId = mapping[r.name]
      if (!exerciseId) continue
      let se = exercises.find((e) => e.exerciseId === exerciseId)
      if (!se) {
        se = { uid: makeId(), exerciseId, restSec: 0, sets: [] }
        exercises.push(se)
      }
      if (r.note && !se.note) se.note = r.note
      se.sets.push({ weight: r.weightKg, reps: r.reps, technique: 'normal', warmup: r.warmup || undefined, done: true })
    }
    if (!exercises.length) continue
    const start = list[0].date
    const end = list[list.length - 1].date
    sessions.push({
      id: makeId(),
      start: start.toISOString(),
      end: (end.getTime() > start.getTime() ? end : new Date(start.getTime() + 60 * 60000)).toISOString(),
      routineName: 'Fitbod',
      mode: 'high',
      exercises,
      exerciseIds: [...new Set(exercises.map((e) => e.exerciseId))],
      source: 'fitbod',
    })
  }
  return sessions
}

export interface RoutineFile {
  app: 'treino-rotinas'
  routines: { name: string; items: { name: string; sets: number | null; reps: number | null }[] }[]
}

export function validateRoutineFile(data: unknown): RoutineFile {
  const f = data as RoutineFile
  if (!f || f.app !== 'treino-rotinas' || !Array.isArray(f.routines)) throw new Error('Arquivo de rotinas inválido.')
  return f
}

/**
 * Converte rotinas de referência em Routine. mapping: nome do exercício → id no app.
 * Séries/repetições ausentes usam os padrões do app; a faixa de reps fica em torno do valor planejado.
 */
export function buildRoutines(
  file: RoutineFile,
  mapping: Record<string, string>,
  makeId: () => string,
  firstOrder: number,
  defaults: Record<Mode, ModeTarget>,
): Routine[] {
  return file.routines.map((r, i) => ({
    id: makeId(),
    name: r.name,
    order: firstOrder + i,
    items: r.items
      .filter((it) => mapping[it.name])
      .map((it) => {
        const target = (mode: Mode): ModeTarget => {
          const d = defaults[mode]
          return {
            ...d,
            sets: it.sets ?? d.sets,
            repMin: it.reps ? Math.max(1, it.reps - (mode === 'low' ? 2 : 0)) : d.repMin,
            repMax: it.reps ? it.reps + (mode === 'low' ? 0 : 2) : d.repMax,
          }
        }
        return { uid: makeId(), exerciseId: mapping[it.name], targets: { low: target('low'), high: target('high') }, restSec: 90 }
      }),
  }))
}
