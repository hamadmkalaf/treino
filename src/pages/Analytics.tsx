import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ExerciseChart } from '../components/charts'
import { ExercisePicker } from '../components/exercise'
import { Btn, Card, Chip, cx, durationMin, Empty, ModeBadge, Page, SectionTitle, Sheet, Stepper } from '../components/ui'
import { GROUPS, SUBPARTS } from '../data/muscles'
import { useBlocks, useExercises, useSessions, useSetting } from '../db/hooks'
import { byWeek, dayKey, exerciseSeries, subpartSets, weekStart, workingSets, type ExercisePoint } from '../lib/volume'
import {
  DEFAULT_REPS,
  isCustom,
  METRIC_LIMITS,
  subpartReps,
  targetFor,
  withTarget,
  type Range,
  type VolumeMetric,
  type VolumeTargets,
} from '../lib/volumeTargets'
import type { Session } from '../types'

const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
const shortDay = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const fmtVal = (n: number, metric: VolumeMetric) => (metric === 'reps' ? String(Math.round(n)) : fmtSets(n))
const UNIT: Record<VolumeMetric, string> = { sets: 'séries', reps: 'reps' }

/** editor dos alvos semanais por grupo muscular (séries ou repetições) */
function TargetEditor({
  open,
  onClose,
  metric,
  general,
  setGeneral,
  targets,
  setTargets,
}: {
  open: boolean
  onClose: () => void
  metric: VolumeMetric
  general: Range
  setGeneral: (r: Range) => void
  targets: VolumeTargets
  setTargets: (t: VolumeTargets) => void
}) {
  const { max: limit, step } = METRIC_LIMITS[metric]
  const unit = UNIT[metric]
  const row = (value: Range, onChange: (r: Range) => void) => (
    <>
      <Stepper label={`Mínimo (${unit})`} value={value.min} min={0} max={value.max} step={step} onChange={(min) => onChange({ ...value, min })} />
      <Stepper label={`Máximo (${unit})`} value={value.max} min={value.min} max={limit} step={step} onChange={(max) => onChange({ ...value, max })} />
    </>
  )
  return (
    <Sheet open={open} onClose={onClose} title={`Alvos semanais — ${unit}`}>
      <p className="text-xs text-mut">
        Faixa de {unit} por semana considerada adequada para cada grupo. Grupos sem alvo próprio usam o padrão. Vale para o grupo e para as subpartes
        dele.
      </p>
      <Card className="space-y-3">
        <div className="text-sm font-semibold">Padrão (demais grupos)</div>
        {row(general, setGeneral)}
      </Card>
      {GROUPS.map((g) => {
        const custom = isCustom(targets, metric, g.id)
        const value = targetFor(targets, metric, g.id, general)
        return (
          <Card key={g.id} className={cx('space-y-3', !custom && 'opacity-80')}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{g.pt}</span>
              {custom ? (
                <button className="text-xs text-acc" onClick={() => setTargets(withTarget(targets, metric, g.id, null))}>
                  usar padrão
                </button>
              ) : (
                <span className="text-xs text-mut">padrão</span>
              )}
            </div>
            {row(value, (r) => setTargets(withTarget(targets, metric, g.id, r)))}
          </Card>
        )
      })}
    </Sheet>
  )
}

/** séries (ou repetições) semanais por grupo/subparte, comparadas com o alvo de cada grupo */
function Volume({ sessions }: { sessions: Session[] }) {
  const { byId } = useExercises()
  const [week, setWeek] = useState(() => weekStart(new Date()))
  const [open, setOpen] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [metric, setMetric] = useSetting<VolumeMetric>('volMetric', 'sets')
  const [volMin, setVolMin] = useSetting('volMin', 4)
  const [volMax, setVolMax] = useSetting('volMax', 12)
  const [repsDefault, setRepsDefault] = useSetting<Range>('volRepsDefault', DEFAULT_REPS)
  const [targets, setTargets] = useSetting<VolumeTargets>('volTargets', {})
  const general: Range = metric === 'sets' ? { min: volMin, max: volMax } : repsDefault
  const setGeneral = (r: Range) => {
    if (metric === 'reps') return setRepsDefault(r)
    setVolMin(r.min)
    setVolMax(r.max)
  }
  const weeks = useMemo(() => byWeek(sessions), [sessions])
  const values = useMemo(
    () => (metric === 'reps' ? subpartReps(weeks[week] ?? [], byId) : subpartSets(weeks[week] ?? [], byId)),
    [weeks, week, byId, metric],
  )
  const rangeOf = (groupId: string) => targetFor(targets, metric, groupId, general)
  const current = week === weekStart(new Date())
  const scale = Math.max(1, ...GROUPS.map((g) => rangeOf(g.id).max * 1.25), ...Object.values(values))

  const bar = (value: number, { min, max }: Range) => (
    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-card2">
      <div className="absolute inset-y-0 bg-fg/10" style={{ left: `${(min / scale) * 100}%`, width: `${((max - min) / scale) * 100}%` }} />
      <div
        className={cx('absolute inset-y-0 left-0 rounded-full', value < min ? 'bg-low' : value > max ? 'bg-high' : 'bg-acc')}
        style={{ width: `${Math.min(100, (value / scale) * 100)}%` }}
      />
    </div>
  )
  const low = SUBPARTS.filter((s) => (values[s.id] ?? 0) < rangeOf(s.groupId).min)
  const customCount = Object.keys(targets?.[metric] ?? {}).length

  return (
    <>
      <Card className="flex items-center justify-between !py-2">
        <button aria-label="Semana anterior" className="h-10 w-10 rounded-full bg-card2" onClick={() => setWeek(addDays(week, -7))}>
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {shortDay(week)} – {shortDay(addDays(week, 6))}
          </div>
          <div className="text-xs text-mut">
            {(weeks[week] ?? []).length} treinos{current ? ' · semana atual' : ''}
          </div>
        </div>
        <button aria-label="Próxima semana" className="h-10 w-10 rounded-full bg-card2 disabled:opacity-30" disabled={current} onClick={() => setWeek(addDays(week, 7))}>
          ›
        </button>
      </Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Chip active={metric === 'sets'} onClick={() => setMetric('sets')}>
            Séries
          </Chip>
          <Chip active={metric === 'reps'} onClick={() => setMetric('reps')}>
            Repetições
          </Chip>
        </div>
        <Btn kind="soft" small onClick={() => setEditing(true)}>
          Alvos por grupo{customCount ? ` (${customCount})` : ''}
        </Btn>
      </div>
      <p className="text-xs text-mut">
        {metric === 'sets' ? 'Séries' : 'Repetições (incluindo mini-séries)'} na semana por subparte: alvo primário conta 1, secundário 0,5. Faixa
        sombreada = alvo do grupo (padrão {general.min}–{general.max}). <span className="text-low">Azul</span> abaixo,{' '}
        <span className="text-acc">verde</span> dentro, <span className="text-high">laranja</span> acima.
      </p>
      {GROUPS.map((g) => {
        const parts = SUBPARTS.filter((s) => s.groupId === g.id)
        const best = Math.max(...parts.map((s) => values[s.id] ?? 0))
        const range = rangeOf(g.id)
        const isOpen = open === g.id
        return (
          <Card key={g.id} className="!py-3" onClick={() => setOpen(isOpen ? '' : g.id)}>
            <div className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm font-medium">{g.pt}</span>
              {bar(best, range)}
              <span className="num w-9 shrink-0 text-right text-sm">{fmtVal(best, metric)}</span>
            </div>
            {isOpen && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <div className="text-xs text-mut">
                  Alvo: {range.min}–{range.max} {UNIT[metric]}/semana{isCustom(targets, metric, g.id) ? ' (personalizado)' : ' (padrão)'}
                </div>
                {parts.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-mut">{s.pt}</span>
                    {bar(values[s.id] ?? 0, range)}
                    <span className="num w-9 shrink-0 text-right text-xs">{fmtVal(values[s.id] ?? 0, metric)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
      {(weeks[week] ?? []).length > 0 && low.length > 0 && (
        <Card>
          <div className="text-sm font-semibold">Abaixo do alvo nesta semana</div>
          <div className="mt-1 text-sm text-mut">{low.map((s) => s.pt).join(' · ')}</div>
        </Card>
      )}
      <TargetEditor
        open={editing}
        onClose={() => setEditing(false)}
        metric={metric}
        general={general}
        setGeneral={setGeneral}
        targets={targets ?? {}}
        setTargets={setTargets}
      />
    </>
  )
}

function ExerciseTab({ sessions }: { sessions: Session[] }) {
  const { byId } = useExercises()
  const [id, setId] = useSetting('analyticsExercise', '')
  const [picking, setPicking] = useState(false)
  const points = useMemo(() => (id ? exerciseSeries(sessions, id) : []), [sessions, id])
  // exercícios mais frequentes para acesso rápido
  const frequent = useMemo(() => {
    const count: Record<string, number> = {}
    for (const s of sessions) for (const e of s.exerciseIds) count[e] = (count[e] ?? 0) + 1
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k]) => k)
      .filter((k) => byId[k])
  }, [sessions, byId])
  const charts: { key: keyof ExercisePoint; label: string; unit: string }[] = [
    { key: 'e1rm', label: '1RM estimado (Epley)', unit: 'kg' },
    { key: 'topWeight', label: 'Carga máxima', unit: 'kg' },
    { key: 'topReps', label: 'Reps na carga máxima', unit: 'reps' },
    { key: 'load', label: 'Volume-carga da sessão', unit: 'kg' },
  ]
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <>
      <Btn kind="soft" className="w-full" onClick={() => setPicking(true)}>
        {byId[id]?.namePt ?? 'Escolher exercício'}
      </Btn>
      {frequent.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {frequent.map((k) => (
            <Chip key={k} active={k === id} onClick={() => setId(k)}>
              {byId[k].namePt}
            </Chip>
          ))}
        </div>
      )}
      {!id && <Empty>Escolha um exercício para ver a evolução.</Empty>}
      {id && !points.length && <Empty>Sem registros deste exercício.</Empty>}
      {points.length > 0 && (
        <>
          <Card className="num grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <div className="font-semibold">{points.length}</div>
              <div className="text-xs text-mut">sessões</div>
            </div>
            <div>
              <div className="font-semibold">{String(last.e1rm).replace('.', ',')} kg</div>
              <div className="text-xs text-mut">1RM est. atual</div>
            </div>
            <div>
              <div className={cx('font-semibold', last.e1rm >= first.e1rm ? 'text-acc' : 'text-bad')}>
                {last.e1rm >= first.e1rm ? '+' : ''}
                {first.e1rm ? (((last.e1rm - first.e1rm) / first.e1rm) * 100).toFixed(1).replace('.', ',') : '0'}%
              </div>
              <div className="text-xs text-mut">desde o início</div>
            </div>
          </Card>
          {charts.map((c) => (
            <Card key={c.key}>
              <div className="mb-1 text-sm text-mut">{c.label}</div>
              <ExerciseChart points={points} metric={c.key} unit={c.unit} />
            </Card>
          ))}
        </>
      )}
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        title="Escolher exercício"
        onPick={(ex) => {
          setId(ex.id)
          setPicking(false)
        }}
      />
    </>
  )
}

function Frequency({ sessions }: { sessions: Session[] }) {
  const blocks = useBlocks()
  const data = useMemo(() => {
    const weeks = byWeek(sessions)
    let w = weekStart(new Date())
    const out = []
    for (let i = 0; i < 12; i++) {
      const list = weeks[w] ?? []
      out.unshift({
        label: shortDay(w),
        treinos: list.length,
        series: list.reduce((a, s) => a + s.exercises.reduce((b, e) => b + workingSets(e).length, 0), 0),
      })
      w = addDays(w, -7)
    }
    return out
  }, [sessions])
  const recent = data.reduce((a, d) => a + d.treinos, 0)
  const minutes = sessions.slice(0, 20).map((s) => durationMin(s.start, s.end))
  const avgMin = minutes.length ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : 0

  const chart = (key: 'treinos' | 'series', label: string) => (
    <Card>
      <div className="mb-1 text-sm text-mut">{label} — últimas 12 semanas</div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'var(--mut)', fontSize: 10 }} stroke="var(--line)" minTickGap={16} />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--mut)', fontSize: 11 }} stroke="var(--line)" />
            <Tooltip
              cursor={{ fill: 'var(--card2)' }}
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }}
              labelStyle={{ color: 'var(--mut)' }}
            />
            <Bar dataKey={key} name={label} fill="var(--acc)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )

  return (
    <>
      <Card className="num grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-lg font-semibold">{sessions.length}</div>
          <div className="text-xs text-mut">treinos no total</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{(recent / 12).toFixed(1).replace('.', ',')}</div>
          <div className="text-xs text-mut">por semana (12 sem.)</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{avgMin} min</div>
          <div className="text-xs text-mut">duração média</div>
        </div>
      </Card>
      {chart('treinos', 'Treinos por semana')}
      {chart('series', 'Séries por semana')}
      <SectionTitle>Comparação entre blocos</SectionTitle>
      {!blocks.length && <Empty>Crie blocos low/high em Rotinas para comparar períodos.</Empty>}
      {blocks.map((b) => {
        const mine = sessions.filter((s) => s.blockId === b.id)
        const weeks = Math.max(1, (new Date(b.end ?? Date.now()).getTime() - new Date(b.start).getTime()) / (7 * 86400000))
        const sets = mine.reduce((a, s) => a + s.exercises.reduce((x, e) => x + workingSets(e).length, 0), 0)
        const mins = mine.reduce((a, s) => a + durationMin(s.start, s.end), 0)
        return (
          <Card key={b.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{b.name}</span>
              <ModeBadge mode={b.mode} />
            </div>
            <div className="num mt-2 grid grid-cols-4 gap-2 text-center text-sm">
              {[
                [mine.length, 'treinos'],
                [(mine.length / weeks).toFixed(1), 'treinos/sem'],
                [(sets / weeks).toFixed(0), 'séries/sem'],
                [mine.length ? Math.round(mins / mine.length) : 0, 'min/treino'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-card2 py-2">
                  <div className="font-semibold">{v}</div>
                  <div className="text-[10px] text-mut">{l}</div>
                </div>
              ))}
            </div>
          </Card>
        )
      })}
    </>
  )
}

export default function Analytics() {
  const sessions = useSessions()
  const [tab, setTab] = useState<'volume' | 'exercicio' | 'frequencia'>('volume')
  return (
    <Page title="Análises">
      <div className="flex gap-2">
        <Chip active={tab === 'volume'} onClick={() => setTab('volume')}>
          Volume semanal
        </Chip>
        <Chip active={tab === 'exercicio'} onClick={() => setTab('exercicio')}>
          Por exercício
        </Chip>
        <Chip active={tab === 'frequencia'} onClick={() => setTab('frequencia')}>
          Frequência
        </Chip>
      </div>
      {tab === 'volume' && <Volume sessions={sessions} />}
      {tab === 'exercicio' && <ExerciseTab sessions={sessions} />}
      {tab === 'frequencia' && <Frequency sessions={sessions} />}
    </Page>
  )
}
