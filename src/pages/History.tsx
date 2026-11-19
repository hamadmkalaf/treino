import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Btn, Card, Chip, cx, dateFmt, durationMin, Empty, ModeBadge, Page, SectionTitle, Sheet } from '../components/ui'
import { useBlocks, useExercises, useSessions, useSetting } from '../db/hooks'
import { download } from '../lib/backup'
import { historyFilename, historyXlsx, presetRange, RANGE_PRESETS, sessionsInRange, type HistoryRange, type RangePreset } from '../lib/historyExport'
import { dayKey, describeSet, workingSets } from '../lib/volume'
import { XLSX_MIME } from '../lib/xlsx'
import type { Session } from '../types'

function Calendar({ sessions, selected, onSelect }: { sessions: Session[]; selected: string; onSelect: (day: string) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const days = useMemo(() => {
    const map: Record<string, Session[]> = {}
    for (const s of sessions) (map[dayKey(new Date(s.start))] ??= []).push(s)
    return map
  }, [sessions])
  const first = (cursor.getDay() + 6) % 7
  const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const today = dayKey(new Date())
  const inMonth = Object.keys(days).filter((k) => k.startsWith(dayKey(cursor).slice(0, 7))).length
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <button aria-label="Mês anterior" className="h-10 w-10 rounded-full bg-card2" onClick={() => shift(-1)}>
          ‹
        </button>
        <div className="text-center">
          <div className="font-semibold capitalize">{cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>
          <div className="text-xs text-mut">{inMonth} dias de treino</div>
        </div>
        <button aria-label="Próximo mês" className="h-10 w-10 rounded-full bg-card2" onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-mut">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key = dayKey(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))
          const list = days[key]
          const mode = list?.[0].mode
          return (
            <button
              key={key}
              disabled={!list}
              onClick={() => onSelect(selected === key ? '' : key)}
              className={cx(
                'num grid aspect-square place-items-center rounded-lg text-sm',
                list ? (mode === 'low' ? 'bg-low/20 font-semibold text-low' : 'bg-high/20 font-semibold text-high') : 'text-mut',
                key === today && 'ring-1 ring-fg/40',
                selected === key && 'ring-2 ring-acc',
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-3 text-xs text-mut">
        <span className="text-low">■ low volume</span>
        <span className="text-high">■ high volume</span>
      </div>
    </Card>
  )
}

/** exporta o histórico do período escolhido em planilha .xlsx (apenas leitura: não altera nenhum dado) */
function ExportSheet({ open, onClose, sessions }: { open: boolean; onClose: () => void; sessions: Session[] }) {
  const { byId } = useExercises()
  const blocks = useBlocks()
  const [preset, setPreset] = useSetting<RangePreset>('exportPreset', '30')
  const today = dayKey(new Date())
  const oldest = sessions.length ? dayKey(new Date(sessions[sessions.length - 1].start)) : today
  const [from, setFrom] = useState(oldest)
  const [to, setTo] = useState(today)
  const [msg, setMsg] = useState('')
  const range: HistoryRange = preset === 'custom' ? { from: from || undefined, to: to || undefined } : presetRange(preset)
  const list = useMemo(() => sessionsInRange(sessions, range), [sessions, range.from, range.to])
  const sets = list.reduce((a, s) => a + s.exercises.reduce((b, e) => b + workingSets(e).length, 0), 0)
  const invalid = preset === 'custom' && !!from && !!to && from > to

  const run = () => {
    try {
      download(historyFilename(range), historyXlsx(list, byId, blocks), XLSX_MIME)
      setMsg('Planilha gerada.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível gerar a planilha.')
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Exportar histórico (.xlsx)">
      <p className="text-sm text-mut">Escolha o período. A planilha traz uma aba por série, uma por treino e um resumo por exercício.</p>
      <div className="flex flex-wrap gap-2">
        {RANGE_PRESETS.map((p) => (
          <Chip key={p.id} active={preset === p.id} onClick={() => setPreset(p.id)}>
            {p.label}
          </Chip>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-mut">
            De
            <input type="date" className="field mt-1" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-mut">
            Até
            <input type="date" className="field mt-1" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}
      <Card className="!py-3 text-sm">
        {invalid ? (
          <span className="text-bad">A data inicial é depois da final.</span>
        ) : (
          <>
            <span className="font-semibold">{list.length} treinos</span> · {sets} séries válidas
            {range.from ? ` · ${dateFmt(`${range.from}T12:00:00`, { day: '2-digit', month: 'short', year: 'numeric' })}` : ' · desde o início'}
            {range.to ? ` a ${dateFmt(`${range.to}T12:00:00`, { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
          </>
        )}
      </Card>
      <Btn className="w-full" disabled={invalid || !list.length} onClick={run}>
        Gerar planilha
      </Btn>
      {msg && <p className="text-sm">{msg}</p>}
    </Sheet>
  )
}

export default function History() {
  const nav = useNavigate()
  const sessions = useSessions()
  const { byId } = useExercises()
  const [day, setDay] = useState('')
  const [shown, setShown] = useState(20)
  const [exporting, setExporting] = useState(false)
  const list = day ? sessions.filter((s) => dayKey(new Date(s.start)) === day) : sessions

  return (
    <Page
      title="Histórico"
      right={
        <Btn kind="soft" small onClick={() => setExporting(true)}>
          Exportar .xlsx
        </Btn>
      }
    >
      <Calendar sessions={sessions} selected={day} onSelect={setDay} />
      <SectionTitle
        right={
          day ? (
            <button className="text-xs text-acc" onClick={() => setDay('')}>
              ver todos
            </button>
          ) : undefined
        }
      >
        {day ? dateFmt(`${day}T12:00:00`, { weekday: 'long', day: '2-digit', month: 'long' }) : `${sessions.length} treinos`}
      </SectionTitle>
      {!list.length && <Empty>Nenhum treino registrado ainda.</Empty>}
      {list.slice(0, shown).map((s) => {
        const sets = s.exercises.reduce((a, e) => a + workingSets(e).length, 0)
        return (
          <Card key={s.id} onClick={() => nav(`/sessao/${s.id}`)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{s.routineName}</div>
                <div className="text-xs text-mut">
                  {dateFmt(s.start, { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' })} · {durationMin(s.start, s.end)} min · {sets} séries
                </div>
              </div>
              <ModeBadge mode={s.mode} />
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">
              {s.exercises.slice(0, 6).map((e) => (
                <li key={e.uid} className="flex justify-between gap-3">
                  <span className="truncate text-mut">{byId[e.exerciseId]?.namePt ?? 'Exercício removido'}</span>
                  <span className="num shrink-0 truncate">{workingSets(e).slice(0, 1).map(describeSet).join('')}{workingSets(e).length > 1 ? ` (+${workingSets(e).length - 1})` : ''}</span>
                </li>
              ))}
              {s.exercises.length > 6 && <li className="text-xs text-mut">+{s.exercises.length - 6} exercícios</li>}
            </ul>
            {s.notes && <div className="mt-2 text-xs text-mut">“{s.notes}”</div>}
          </Card>
        )
      })}
      {list.length > shown && (
        <button className="w-full py-3 text-sm text-acc" onClick={() => setShown(shown + 20)}>
          Mostrar mais
        </button>
      )}
      <ExportSheet open={exporting} onClose={() => setExporting(false)} sessions={sessions} />
    </Page>
  )
}
