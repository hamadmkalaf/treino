import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Btn, Card, Chip, dateFmt, durationMin, Empty, ModeBadge, Page, SectionTitle } from '../components/ui'
import { startBlock } from '../db/actions'
import { db, uid } from '../db/db'
import { activeBlockOf, useBlocks, useExercises, useRoutines, useSessions, useSetting } from '../db/hooks'
import { workingSets } from '../lib/volume'
import type { Block, Mode, Session } from '../types'

function blockStats(block: Block, sessions: Session[]) {
  const mine = sessions.filter((s) => s.blockId === block.id)
  const sets = mine.reduce((a, s) => a + s.exercises.reduce((b, e) => b + workingSets(e).length, 0), 0)
  const minutes = mine.reduce((a, s) => a + durationMin(s.start, s.end), 0)
  const weeks = Math.max(1, (new Date(block.end ?? Date.now()).getTime() - new Date(block.start).getTime()) / (7 * 86400000))
  return {
    count: mine.length,
    perWeek: mine.length / weeks,
    setsPerSession: mine.length ? sets / mine.length : 0,
    minPerSession: mine.length ? minutes / mine.length : 0,
  }
}

function Blocks() {
  const blocks = useBlocks()
  const sessions = useSessions()
  const active = activeBlockOf(blocks)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('low')

  const create = async () => {
    if (active && !confirm(`Encerrar o bloco “${active.name}” e iniciar um novo?`)) return
    await startBlock(name.trim() || `Bloco ${mode === 'low' ? 'low' : 'high'} volume`, mode)
    setName('')
  }

  return (
    <>
      <Card>
        <div className="text-sm font-semibold">Iniciar novo bloco</div>
        <p className="mt-1 text-xs text-mut">
          O bloco ativo define qual alvo (low ou high volume) cada exercício das rotinas usa ao iniciar um treino.
        </p>
        <input className="field mt-3" placeholder="Nome (ex.: Low volume — nov/dez)" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['low', 'high'] as Mode[]).map((m) => (
            <Btn key={m} kind={mode === m ? 'primary' : 'soft'} small onClick={() => setMode(m)}>
              {m === 'low' ? 'Low volume' : 'High volume'}
            </Btn>
          ))}
        </div>
        <Btn className="mt-3 w-full" onClick={() => void create()}>
          Iniciar bloco
        </Btn>
      </Card>

      <SectionTitle>Blocos</SectionTitle>
      {!blocks.length && <Empty>Nenhum bloco ainda.</Empty>}
      {blocks.map((b) => {
        const st = blockStats(b, sessions)
        return (
          <Card key={b.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{b.name}</div>
                <div className="text-xs text-mut">
                  {dateFmt(b.start, { day: '2-digit', month: 'short', year: '2-digit' })} →{' '}
                  {b.end ? dateFmt(b.end, { day: '2-digit', month: 'short', year: '2-digit' }) : 'em andamento'}
                </div>
              </div>
              <ModeBadge mode={b.mode} />
            </div>
            <div className="num mt-3 grid grid-cols-4 gap-2 text-center text-sm">
              {[
                [st.count, 'treinos'],
                [st.perWeek.toFixed(1), 'por semana'],
                [st.setsPerSession.toFixed(1), 'séries/treino'],
                [Math.round(st.minPerSession), 'min/treino'],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-card2 py-2">
                  <div className="font-semibold">{v}</div>
                  <div className="text-[10px] text-mut">{l}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {!b.end && (
                <Btn small kind="soft" onClick={() => confirm('Encerrar este bloco?') && void db.blocks.update(b.id, { end: new Date().toISOString() })}>
                  Encerrar
                </Btn>
              )}
              <Btn
                small
                kind="ghost"
                onClick={() => {
                  const n = prompt('Nome do bloco', b.name)
                  if (n?.trim()) void db.blocks.update(b.id, { name: n.trim() })
                }}
              >
                Renomear
              </Btn>
              <Btn
                small
                kind="ghost"
                onClick={() => confirm('Excluir o bloco? Os treinos são mantidos, apenas sem bloco.') && void db.blocks.delete(b.id)}
              >
                Excluir
              </Btn>
            </div>
          </Card>
        )
      })}
    </>
  )
}

function Program() {
  const nav = useNavigate()
  const routines = useRoutines()
  const { byId } = useExercises()
  const [nextId, setNextId] = useSetting('nextRoutineId', '')
  const next = routines.find((r) => r.id === nextId) ?? routines[0]

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= routines.length) return
    const order = [...routines]
    ;[order[i], order[j]] = [order[j], order[i]]
    await db.routines.bulkPut(order.map((r, k) => ({ ...r, order: k })))
  }
  const add = async () => {
    const name = prompt('Nome da rotina')
    if (!name?.trim()) return
    const id = uid()
    await db.routines.put({ id, name: name.trim(), order: routines.length, items: [] })
    nav(`/rotina/${id}`)
  }

  return (
    <>
      <p className="text-sm text-mut">
        Os treinos seguem esta fila em sequência, sem dia fixo. Ao concluir um, o próximo da lista vira o sugerido.
      </p>
      {routines.map((r, i) => (
        <Card key={r.id} className="!p-0">
          <div className="flex items-center">
            <div className="min-w-0 flex-1 cursor-pointer p-4" onClick={() => nav(`/rotina/${r.id}`)}>
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{r.name}</span>
                {next?.id === r.id && <span className="rounded-full bg-acc/15 px-2 py-0.5 text-xs text-acc">próximo</span>}
              </div>
              <div className="mt-0.5 truncate text-xs text-mut">
                {r.items.length
                  ? r.items.map((it) => byId[it.exerciseId]?.namePt ?? '?').join(' · ')
                  : 'Sem exercícios — toque para montar'}
              </div>
            </div>
            <div className="flex shrink-0 flex-col pr-2">
              <button aria-label="Mover para cima" className="h-9 w-10 text-mut disabled:opacity-30" disabled={i === 0} onClick={() => void move(i, -1)}>
                ▲
              </button>
              <button
                aria-label="Mover para baixo"
                className="h-9 w-10 text-mut disabled:opacity-30"
                disabled={i === routines.length - 1}
                onClick={() => void move(i, 1)}
              >
                ▼
              </button>
            </div>
          </div>
          {next?.id !== r.id && (
            <button className="w-full border-t border-line py-2 text-xs text-mut" onClick={() => setNextId(r.id)}>
              Definir como próximo
            </button>
          )}
        </Card>
      ))}
      <Btn kind="soft" className="w-full" onClick={() => void add()}>
        + Nova rotina
      </Btn>
    </>
  )
}

export default function Routines() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('aba') === 'blocos' ? 'blocos' : 'programa'
  return (
    <Page title="Rotinas">
      <div className="flex gap-2">
        <Chip active={tab === 'programa'} onClick={() => setParams({}, { replace: true })}>
          Programa
        </Chip>
        <Chip active={tab === 'blocos'} onClick={() => setParams({ aba: 'blocos' }, { replace: true })}>
          Blocos low / high
        </Chip>
      </div>
      {tab === 'programa' ? <Program /> : <Blocks />}
    </Page>
  )
}
