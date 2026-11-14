import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ExerciseChart } from '../components/charts'
import { ExercisePicker } from '../components/exercise'
import { Btn, Card, Chip, cx, durationMin, Empty, ModeBadge, Page, SectionTitle } from '../components/ui'
import { GROUPS, SUBPARTS } from '../data/muscles'
import { useBlocks, useExercises, useSessions, useSetting } from '../db/hooks'
import { byWeek, dayKey, exerciseSeries, subpartSets, weekStart, workingSets, type ExercisePoint } from '../lib/volume'
import type { Session } from '../types'

const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
const shortDay = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

/** faixa de séries semanais considerada adequada por subparte (ajustável em Ajustes) */
function Volume({ sessions }: { sessions: Session[] }) {
  const { byId } = useExercises()
  const [week, setWeek] = useState(() => weekStart(new Date()))
  const [open, setOpen] = useState<string>('')
  const [min] = useSetting('volMin', 4)
  const [max] = useSetting('volMax', 12)
  const weeks = useMemo(() => byWeek(sessions), [sessions])
  const sets = useMemo(() => subpartSets(weeks[week] ?? [], byId), [weeks, week, byId])
  const current = week === weekStart(new Date())
  const scale = Math.max(max * 1.25, ...Object.values(sets))

  const bar = (value: number) => (
    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-card2">
      <div className="absolute inset-y-0 bg-fg/10" style={{ left: `${(min / scale) * 100}%`, width: `${((max - min) / scale) * 100}%` }} />
      <div
        className={cx('absolute inset-y-0 left-0 rounded-full', value < min ? 'bg-low' : value > max ? 'bg-high' : 'bg-acc')}
        style={{ width: `${Math.min(100, (value / scale) * 100)}%` }}
      />
    </div>
  )
  const low = SUBPARTS.filter((s) => (sets[s.id] ?? 0) < min)

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
      <p className="text-xs text-mut">
        Séries na semana por subparte: alvo primário conta 1, secundário 0,5. Faixa sombreada = {min}–{max} séries.{' '}
        <span className="text-low">Azul</span> abaixo, <span className="text-acc">verde</span> dentro, <span className="text-high">laranja</span> acima.
      </p>
      {GROUPS.map((g) => {
        const parts = SUBPARTS.filter((s) => s.groupId === g.id)
        const best = Math.max(...parts.map((s) => sets[s.id] ?? 0))
        const isOpen = open === g.id
        return (
          <Card key={g.id} className="!py-3" onClick={() => setOpen(isOpen ? '' : g.id)}>
            <div className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm font-medium">{g.pt}</span>
              {bar(best)}
              <span className="num w-9 shrink-0 text-right text-sm">{fmtSets(best)}</span>
            </div>
            {isOpen && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                {parts.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-mut">{s.pt}</span>
                    {bar(sets[s.id] ?? 0)}
                    <span className="num w-9 shrink-0 text-right text-xs">{fmtSets(sets[s.id] ?? 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
      {(weeks[week] ?? []).length > 0 && low.length > 0 && (
        <Card>
          <div className="text-sm font-semibold">Abaixo de {min} séries nesta semana</div>
          <div className="mt-1 text-sm text-mut">{low.map((s) => s.pt).join(' · ')}</div>
        </Card>
      )}
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
