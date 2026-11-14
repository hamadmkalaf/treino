import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Btn, Card, dateFmt, durationMin, Empty, ModeBadge, Page, SectionTitle } from '../components/ui'
import { startSession } from '../db/actions'
import { db } from '../db/db'
import { activeBlockOf, useBlocks, useExercises, useRoutines, useSessions, useSetting } from '../db/hooks'
import { weekStart } from '../lib/volume'
import type { Routine } from '../types'

export default function Today() {
  const nav = useNavigate()
  const routines = useRoutines()
  const blocks = useBlocks()
  const block = activeBlockOf(blocks)
  const sessions = useSessions()
  const { byId } = useExercises()
  const [nextId, setNextId] = useSetting('nextRoutineId', '')
  const [activeId] = useSetting('activeSessionId', '')
  const [lastBackup] = useSetting('lastBackup', '')
  const active = useLiveQuery(() => (activeId ? db.sessions.get(activeId) : undefined), [activeId])

  const next = routines.find((r) => r.id === nextId) ?? routines[0]
  const thisWeek = sessions.filter((s) => weekStart(s.start) === weekStart(new Date()))
  const last = sessions[0]
  const backupStale =
    sessions.length >= 5 && (!lastBackup || Date.now() - new Date(lastBackup).getTime() > 30 * 86400000)

  const begin = async (routine?: Routine) => {
    if (active && !confirm('Há um treino em andamento. Descartá-lo e iniciar outro?')) return
    if (active) await db.sessions.delete(active.id)
    nav(`/sessao/${await startSession(routine, block, byId)}`)
  }
  const skip = () => {
    if (!routines.length || !next) return
    const i = routines.findIndex((r) => r.id === next.id)
    setNextId(routines[(i + 1) % routines.length].id)
  }

  return (
    <Page
      title="Treino"
      right={
        <Link aria-label="Ajustes" to="/ajustes" className="grid h-11 w-11 place-items-center rounded-full text-xl text-mut">
          ⚙
        </Link>
      }
    >
      {active && (
        <Card className="border-acc/60">
          <div className="text-xs text-acc">Treino em andamento</div>
          <div className="mt-1 text-lg font-semibold">{active.routineName}</div>
          <div className="text-sm text-mut">Iniciado {dateFmt(active.start, { hour: '2-digit', minute: '2-digit' })}</div>
          <Btn className="mt-3 w-full" onClick={() => nav(`/sessao/${active.id}`)}>
            Continuar treino
          </Btn>
        </Card>
      )}

      <Card onClick={() => nav('/rotinas?aba=blocos')}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs text-mut">Bloco atual</div>
            {block ? (
              <>
                <div className="truncate font-semibold">{block.name}</div>
                <div className="text-xs text-mut">desde {dateFmt(block.start, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </>
            ) : (
              <div className="text-sm">Nenhum bloco ativo — toque para iniciar um bloco low ou high volume.</div>
            )}
          </div>
          {block && <ModeBadge mode={block.mode} />}
        </div>
      </Card>

      <SectionTitle>Próximo da fila</SectionTitle>
      {next ? (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xl font-bold">{next.name}</div>
              <div className="text-sm text-mut">
                {next.items.length
                  ? `${next.items.length} exercícios`
                  : 'Rotina vazia — adicione exercícios em Rotinas ou monte durante o treino.'}
              </div>
            </div>
            <button className="shrink-0 rounded-lg bg-card2 px-3 py-2 text-sm text-mut" onClick={skip}>
              Pular
            </button>
          </div>
          {next.items.length > 0 && (
            <ol className="mt-3 space-y-1 text-sm">
              {next.items.map((it) => {
                const t = it.targets[block?.mode ?? 'high']
                return (
                  <li key={it.uid} className="flex justify-between gap-2">
                    <span className="truncate">
                      {it.superset ? `${it.superset}· ` : ''}
                      {byId[it.exerciseId]?.namePt ?? 'Exercício removido'}
                    </span>
                    <span className="num shrink-0 text-mut">
                      {t.sets} × {t.repMin}–{t.repMax}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          <Btn className="mt-4 w-full" onClick={() => void begin(next)}>
            Iniciar {next.name}
          </Btn>
        </Card>
      ) : (
        <Empty>Crie uma rotina na aba Rotinas.</Empty>
      )}

      <SectionTitle>Outros treinos</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {routines
          .filter((r) => r.id !== next?.id)
          .map((r) => (
            <Btn key={r.id} kind="soft" onClick={() => void begin(r)}>
              {r.name}
            </Btn>
          ))}
        <Btn kind="soft" onClick={() => void begin(undefined)}>
          Treino livre
        </Btn>
      </div>

      <SectionTitle>Esta semana</SectionTitle>
      <Card>
        <div className="flex items-baseline gap-2">
          <span className="num text-3xl font-bold">{thisWeek.length}</span>
          <span className="text-sm text-mut">{thisWeek.length === 1 ? 'treino' : 'treinos'}</span>
        </div>
        {last && (
          <div className="mt-1 text-sm text-mut">
            Último: {last.routineName}, {dateFmt(last.start)} · {durationMin(last.start, last.end)} min
          </div>
        )}
      </Card>

      {backupStale && (
        <Card onClick={() => nav('/ajustes')} className="border-high/50">
          <div className="text-sm">
            Seu histórico fica só neste aparelho. Faça um backup em Ajustes
            {lastBackup ? ` (último: ${dateFmt(lastBackup)})` : ''}.
          </div>
        </Card>
      )}
    </Page>
  )
}
