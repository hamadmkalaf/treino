import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker, MuscleTags, Substitutes } from '../components/exercise'
import { Btn, Card, Chip, cx, Empty, Page, SectionTitle, Sheet, Stepper } from '../components/ui'
import { GROUPS, SUBPART_BY_ID, TECHNIQUE_LABEL } from '../data/muscles'
import { db, DEFAULT_TARGETS, uid } from '../db/db'
import { activeBlockOf, useBlocks, useExercises } from '../db/hooks'
import type { Mode, ModeTarget, Routine, RoutineItem, Technique } from '../types'

const targetText = (t: ModeTarget) =>
  `${t.sets} × ${t.repMin}–${t.repMax}${t.rir !== undefined ? ` · RIR ${t.rir}` : ''}${t.technique !== 'normal' ? ` · ${TECHNIQUE_LABEL[t.technique]}` : ''}`

function TargetEditor({ value, onChange }: { value: ModeTarget; onChange: (t: ModeTarget) => void }) {
  return (
    <div className="space-y-2">
      <Stepper label="Séries" value={value.sets} min={1} max={12} onChange={(sets) => onChange({ ...value, sets })} />
      <Stepper
        label="Reps mínimas"
        value={value.repMin}
        min={1}
        max={50}
        onChange={(repMin) => onChange({ ...value, repMin, repMax: Math.max(repMin, value.repMax) })}
      />
      <Stepper
        label="Reps máximas"
        value={value.repMax}
        min={1}
        max={50}
        onChange={(repMax) => onChange({ ...value, repMax, repMin: Math.min(repMax, value.repMin) })}
      />
      <Stepper label="RIR alvo" value={value.rir ?? 0} min={0} max={5} onChange={(rir) => onChange({ ...value, rir })} />
      <div>
        <div className="mb-1 text-sm text-mut">Técnica padrão</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TECHNIQUE_LABEL) as Technique[]).map((t) => (
            <Chip key={t} active={value.technique === t} onClick={() => onChange({ ...value, technique: t })}>
              {TECHNIQUE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RoutineEdit() {
  const { id } = useParams()
  const nav = useNavigate()
  const routine = useLiveQuery(() => db.routines.get(id!), [id])
  const { byId } = useExercises()
  const block = activeBlockOf(useBlocks())
  const [mode, setMode] = useState<Mode>(block?.mode ?? 'low')
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [swapping, setSwapping] = useState<string | null>(null)

  const save = (patch: Partial<Routine>) => void db.routines.update(id!, patch)
  const setItems = (items: RoutineItem[]) => save({ items })
  const patchItem = (uidItem: string, patch: Partial<RoutineItem>) =>
    setItems(routine!.items.map((it) => (it.uid === uidItem ? { ...it, ...patch } : it)))

  // séries semanais (1 execução da rotina) por grupo muscular no modo selecionado
  const volume = useMemo(() => {
    const out: Record<string, number> = {}
    for (const it of routine?.items ?? []) {
      const ex = byId[it.exerciseId]
      if (!ex) continue
      const groups = new Set(ex.targets.filter((t) => t.role === 'primary').map((t) => SUBPART_BY_ID[t.subpartId]?.groupId))
      for (const g of groups) if (g) out[g] = (out[g] ?? 0) + it.targets[mode].sets
    }
    return out
  }, [routine, byId, mode])

  if (!routine) return <Page title="Rotina" back="/rotinas">{null}</Page>
  const item = routine.items.find((it) => it.uid === editing)
  const swapItem = routine.items.find((it) => it.uid === swapping)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= routine.items.length) return
    const items = [...routine.items]
    ;[items[i], items[j]] = [items[j], items[i]]
    setItems(items)
  }

  return (
    <Page
      title={routine.name}
      back="/rotinas"
      right={
        <button
          className="px-2 text-sm text-mut"
          onClick={() => {
            const n = prompt('Nome da rotina', routine.name)
            if (n?.trim()) save({ name: n.trim() })
          }}
        >
          Renomear
        </button>
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-mut">Ver alvos de:</span>
        <Chip active={mode === 'low'} onClick={() => setMode('low')}>
          Low volume
        </Chip>
        <Chip active={mode === 'high'} onClick={() => setMode('high')}>
          High volume
        </Chip>
      </div>

      {!routine.items.length && <Empty>Adicione exercícios a esta rotina. Cada um terá alvos separados para low e high volume.</Empty>}

      {routine.items.map((it, i) => {
        const ex = byId[it.exerciseId]
        return (
          <Card key={it.uid} className="!p-0">
            <div className="flex">
              <div className="min-w-0 flex-1 cursor-pointer p-4" onClick={() => setEditing(it.uid)}>
                <div className="flex items-center gap-2">
                  {it.superset && <span className="rounded-md bg-high/15 px-1.5 text-xs font-bold text-high">{it.superset}</span>}
                  <span className="truncate font-medium">{ex?.namePt ?? 'Exercício removido'}</span>
                </div>
                <div className="num mt-1 text-sm">
                  <span className={cx(mode === 'low' ? 'text-low' : 'text-high')}>{targetText(it.targets[mode])}</span>
                  <span className="text-mut"> · descanso {it.restSec}s</span>
                </div>
                {ex && (
                  <div className="mt-2">
                    <MuscleTags ex={ex} compact />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col justify-center pr-2">
                <button aria-label="Mover para cima" className="h-9 w-10 text-mut disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>
                  ▲
                </button>
                <button
                  aria-label="Mover para baixo"
                  className="h-9 w-10 text-mut disabled:opacity-30"
                  disabled={i === routine.items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ▼
                </button>
              </div>
            </div>
          </Card>
        )
      })}

      <Btn className="w-full" onClick={() => setPicking(true)}>
        + Adicionar exercício
      </Btn>

      {Object.keys(volume).length > 0 && (
        <>
          <SectionTitle>Séries por grupo nesta rotina ({mode === 'low' ? 'low' : 'high'})</SectionTitle>
          <Card>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {GROUPS.filter((g) => volume[g.id]).map((g) => (
                <span key={g.id}>
                  {g.pt} <b className="num">{volume[g.id]}</b>
                </span>
              ))}
            </div>
          </Card>
        </>
      )}

      <Btn
        kind="danger"
        small
        className="w-full"
        onClick={() => {
          if (!confirm(`Excluir a rotina “${routine.name}”? O histórico de treinos é mantido.`)) return
          void db.routines.delete(routine.id)
          nav('/rotinas')
        }}
      >
        Excluir rotina
      </Btn>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ex) => {
          setItems([
            ...routine.items,
            { uid: uid(), exerciseId: ex.id, targets: structuredClone(DEFAULT_TARGETS), restSec: 120 },
          ])
          setPicking(false)
        }}
      />

      <Sheet open={!!item} onClose={() => setEditing(null)} title={item ? byId[item.exerciseId]?.namePt : ''}>
        {item && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(['low', 'high'] as Mode[]).map((m) => (
                <Btn key={m} small kind={mode === m ? 'primary' : 'soft'} onClick={() => setMode(m)}>
                  {m === 'low' ? 'Low volume' : 'High volume'}
                </Btn>
              ))}
            </div>
            <Card>
              <TargetEditor
                value={item.targets[mode]}
                onChange={(t) => patchItem(item.uid, { targets: { ...item.targets, [mode]: t } })}
              />
            </Card>
            <Card className="space-y-3">
              <Stepper label="Descanso (s)" value={item.restSec} min={0} max={600} step={15} onChange={(restSec) => patchItem(item.uid, { restSec })} />
              <div>
                <div className="mb-1 text-sm text-mut">Superset (mesma letra = feitos juntos)</div>
                <div className="flex gap-2">
                  {['', 'A', 'B', 'C', 'D'].map((s) => (
                    <Chip key={s} active={(item.superset ?? '') === s} onClick={() => patchItem(item.uid, { superset: s || undefined })}>
                      {s || 'Nenhum'}
                    </Chip>
                  ))}
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <Btn
                kind="soft"
                small
                onClick={() => {
                  setSwapping(item.uid)
                  setEditing(null)
                }}
              >
                Substituir
              </Btn>
              <Btn
                kind="danger"
                small
                onClick={() => {
                  setItems(routine.items.filter((it) => it.uid !== item.uid))
                  setEditing(null)
                }}
              >
                Remover
              </Btn>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={!!swapItem} onClose={() => setSwapping(null)} title="Substituir por" full>
        {swapItem && byId[swapItem.exerciseId] && (
          <Substitutes
            ex={byId[swapItem.exerciseId]}
            exclude={routine.items.map((it) => it.exerciseId)}
            onPick={(sub) => {
              patchItem(swapItem.uid, { exerciseId: sub.id })
              setSwapping(null)
            }}
          />
        )}
      </Sheet>
    </Page>
  )
}
