import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExerciseChart } from '../components/charts'
import { ExerciseRow, Substitutes } from '../components/exercise'
import { Card, Chip, dateFmt, Empty, Page, SectionTitle } from '../components/ui'
import { EQUIP_LABEL, GROUP_BY_ID, PATTERNS, SUBPART_BY_ID, TENSION_LABEL } from '../data/muscles'
import { db } from '../db/db'
import { useExercises, useExerciseSessions } from '../db/hooks'
import { describeSet, exerciseSeries, workingSets, type ExercisePoint } from '../lib/volume'
import type { Exercise, Role } from '../types'

const METRICS: { key: keyof ExercisePoint; label: string; unit: string }[] = [
  { key: 'e1rm', label: '1RM estimado', unit: 'kg' },
  { key: 'topWeight', label: 'Carga máxima', unit: 'kg' },
  { key: 'topReps', label: 'Reps na carga máx.', unit: 'reps' },
  { key: 'load', label: 'Volume-carga', unit: 'kg' },
]

function Muscles({ ex, role }: { ex: Exercise; role: Role }) {
  const items = ex.targets.filter((t) => t.role === role)
  if (!items.length) return null
  return (
    <div>
      <div className="mb-1 text-xs text-mut">{role === 'primary' ? 'Alvo primário' : 'Secundário'}</div>
      <ul className="space-y-1">
        {items.map((t) => {
          const sp = SUBPART_BY_ID[t.subpartId]
          return (
            <li key={t.subpartId} className="flex items-baseline justify-between gap-2 text-sm">
              <span className={role === 'primary' ? 'font-medium text-acc' : ''}>{sp?.pt ?? t.subpartId}</span>
              <span className="shrink-0 text-xs text-mut">{GROUP_BY_ID[sp?.groupId]?.pt}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function ExerciseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { byId, list } = useExercises()
  const ex = byId[id!]
  const sessions = useExerciseSessions(id)
  const settings = useLiveQuery(() => db.exerciseSettings.get(id!), [id])
  const [metric, setMetric] = useState(0)
  const points = useMemo(() => exerciseSeries(sessions, id!), [sessions, id])
  const variations = ex?.family ? list.filter((e) => e.family === ex.family && e.id !== ex.id) : []

  if (!ex)
    return (
      <Page title="Exercício" back>
        <Empty>Exercício não encontrado.</Empty>
      </Page>
    )

  return (
    <Page
      title={ex.namePt}
      back
      right={
        <Link to={`/exercicio/${ex.id}/editar`} className="rounded-xl bg-card2 px-3 py-2 text-sm">
          Editar
        </Link>
      }
    >
      <Card className="space-y-3">
        <div>
          <div className="text-lg font-semibold">{ex.namePt}</div>
          <div className="text-sm text-mut">{ex.nameEn}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[EQUIP_LABEL[ex.equipment], PATTERNS[ex.pattern], TENSION_LABEL[ex.tension], ex.unilateral && 'Unilateral', ex.isCustom && 'Personalizado']
            .filter(Boolean)
            .map((v) => (
              <span key={String(v)} className="rounded-md bg-card2 px-2 py-1">
                {v}
              </span>
            ))}
        </div>
        <Muscles ex={ex} role="primary" />
        <Muscles ex={ex} role="secondary" />
      </Card>

      <Card>
        <div className="mb-1 text-sm text-mut">Ajustes da máquina</div>
        <input
          className="field"
          placeholder="Ex.: banco 4, pino 3, pegada neutra"
          value={settings?.machine ?? ''}
          onChange={(e) => void db.exerciseSettings.put({ ...settings, exerciseId: ex.id, machine: e.target.value })}
        />
        <div className="mt-3 mb-1 text-sm text-mut">Notas de execução</div>
        <textarea
          className="field min-h-16"
          placeholder="Suas dicas de execução"
          value={settings?.note ?? ''}
          onChange={(e) => void db.exerciseSettings.put({ ...settings, exerciseId: ex.id, note: e.target.value })}
        />
      </Card>

      <SectionTitle>Evolução</SectionTitle>
      {points.length ? (
        <Card>
          <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
            {METRICS.map((m, i) => (
              <Chip key={m.key} active={metric === i} onClick={() => setMetric(i)}>
                {m.label}
              </Chip>
            ))}
          </div>
          <ExerciseChart points={points} metric={METRICS[metric].key} unit={METRICS[metric].unit} />
        </Card>
      ) : (
        <Empty>Ainda sem registros deste exercício.</Empty>
      )}

      {sessions.length > 0 && (
        <>
          <SectionTitle>Últimas sessões</SectionTitle>
          <Card className="space-y-2">
            {sessions.slice(0, 8).map((s) => (
              <div key={s.id} className="cursor-pointer text-sm" onClick={() => nav(`/sessao/${s.id}`)}>
                <div className="text-xs text-mut">
                  {dateFmt(s.start, { day: '2-digit', month: 'short', year: '2-digit' })} · {s.routineName}
                </div>
                <div className="num">
                  {s.exercises
                    .filter((e) => e.exerciseId === ex.id)
                    .flatMap(workingSets)
                    .map(describeSet)
                    .join(' | ')}
                </div>
              </div>
            ))}
          </Card>
        </>
      )}

      {variations.length > 0 && (
        <>
          <SectionTitle>Variações (histórico separado)</SectionTitle>
          <div className="space-y-2">
            {variations.map((v) => (
              <ExerciseRow key={v.id} ex={v} onClick={() => nav(`/exercicio/${v.id}`)} />
            ))}
          </div>
        </>
      )}
      <Link to={`/exercicio/novo?base=${ex.id}`} className="block rounded-xl border border-dashed border-line py-3 text-center text-sm text-mut">
        + Criar variação deste exercício
      </Link>

      <SectionTitle>Substitutos sugeridos</SectionTitle>
      <p className="text-xs text-mut">Ordenados por subpartes em comum, padrão de movimento e perfil de tensão. ★ fixa um favorito no topo.</p>
      <Substitutes ex={ex} onPick={(s) => nav(`/exercicio/${s.id}`)} />
    </Page>
  )
}
