import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExercisePicker, MuscleTags, Substitutes } from '../components/exercise'
import { Btn, Card, Chip, cx, dateFmt, ModeBadge, NumInput, Page, Sheet, Stepper } from '../components/ui'
import { TECHNIQUE_LABEL } from '../data/muscles'
import { blankSet, buildSessionExercise, discardSession, finishSession, lastPerformance, saveSession } from '../db/actions'
import { db, getSetting } from '../db/db'
import { useExercises, useSetting } from '../db/hooks'
import { clock, startRest, stopRest } from '../lib/timer'
import { describeSet, fmt } from '../lib/volume'
import type { Exercise, Segment, Session, SessionExercise, SetEntry, Technique } from '../types'

type Effort = 'rir' | 'rpe'
const effortText = (rir: number | undefined, effort: Effort) =>
  rir === undefined ? (effort === 'rir' ? 'RIR' : 'RPE') : effort === 'rir' ? `RIR ${rir}` : `RPE ${10 - rir}`

const SEGMENT_WORD: Record<Technique, string> = {
  normal: '',
  myoreps: 'mini-série',
  dropset: 'queda',
  restpause: 'bloco',
  cluster: 'bloco',
}
const TECHNIQUE_HELP: Record<Technique, string> = {
  normal: '',
  myoreps: 'Série de ativação + mini-séries curtas com pausas de 3–5 respirações.',
  dropset: 'Ao falhar, reduza a carga e continue sem descanso. Registre cada queda.',
  restpause: 'Ao falhar, descanse 10–20 s e continue com a mesma carga.',
  cluster: 'Blocos curtos de reps com pausas breves dentro da mesma série.',
}

function Segments({ set, onChange }: { set: SetEntry; onChange: (s: SetEntry) => void }) {
  const seg = set.segments ?? []
  const drop = set.technique === 'dropset'
  const patch = (i: number, p: Partial<Segment>) => onChange({ ...set, segments: seg.map((g, k) => (k === i ? { ...g, ...p } : g)) })
  const add = () => {
    const prev = seg[seg.length - 1]?.weight ?? set.weight
    const weight = drop ? Math.round(prev * 0.8 * 2) / 2 : set.weight
    onChange({ ...set, segments: [...seg, { weight, reps: 0 }] })
  }
  return (
    <div className="col-span-full -mt-1 mb-1 ml-10 rounded-xl border border-line bg-bg/40 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-high">{TECHNIQUE_LABEL[set.technique]}</span>
        {seg.map((g, i) => (
          <div key={i} className="flex items-center gap-1">
            {drop && (
              <>
                <NumInput decimal label={`Carga da queda ${i + 1}`} className="!h-10 !w-16 !text-base" value={g.weight} placeholder="kg" onChange={(weight) => patch(i, { weight })} />
                <span className="text-mut">×</span>
              </>
            )}
            {!drop && <span className="text-mut">+</span>}
            <NumInput label={`Reps ${SEGMENT_WORD[set.technique]} ${i + 1}`} className="!h-10 !w-12 !text-base" value={g.reps} placeholder="reps" onChange={(reps) => patch(i, { reps })} />
          </div>
        ))}
        <button className="h-10 rounded-lg bg-card2 px-3 text-sm" onClick={add}>
          + {SEGMENT_WORD[set.technique]}
        </button>
        {seg.length > 0 && (
          <button aria-label="Remover último" className="h-10 w-10 rounded-lg bg-card2 text-mut" onClick={() => onChange({ ...set, segments: seg.slice(0, -1) })}>
            −
          </button>
        )}
      </div>
    </div>
  )
}

function SetSheet({
  set,
  index,
  effort,
  onChange,
  onDelete,
  onClose,
}: {
  set: SetEntry | undefined
  index: number
  effort: Effort
  onChange: (s: SetEntry) => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={!!set} onClose={onClose} title={`Série ${index + 1}`}>
      {set && (
        <>
          <Card>
            <div className="mb-2 text-sm text-mut">Técnica</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TECHNIQUE_LABEL) as Technique[]).map((t) => (
                <Chip
                  key={t}
                  active={set.technique === t}
                  onClick={() => onChange({ ...set, technique: t, segments: t === 'normal' ? undefined : set.segments })}
                >
                  {TECHNIQUE_LABEL[t]}
                </Chip>
              ))}
            </div>
            {set.technique !== 'normal' && <p className="mt-2 text-xs text-mut">{TECHNIQUE_HELP[set.technique]}</p>}
          </Card>
          <Card>
            <div className="mb-2 text-sm text-mut">{effort === 'rir' ? 'Reps em reserva (RIR)' : 'Esforço percebido (RPE)'}</div>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map((r) => (
                <Chip key={r} active={set.rir === r} onClick={() => onChange({ ...set, rir: set.rir === r ? undefined : r })}>
                  {effort === 'rir' ? (r === 5 ? '5+' : r) : r === 5 ? '≤5' : 10 - r}
                </Chip>
              ))}
            </div>
          </Card>
          <Card>
            <div className="mb-2 text-sm text-mut">Marcadores</div>
            <div className="flex flex-wrap gap-2">
              <Chip active={!!set.failure} onClick={() => onChange({ ...set, failure: !set.failure, rir: !set.failure ? 0 : set.rir })}>
                Até a falha
              </Chip>
              <Chip active={!!set.partials} onClick={() => onChange({ ...set, partials: !set.partials })}>
                Parciais
              </Chip>
              <Chip active={!!set.negative} onClick={() => onChange({ ...set, negative: !set.negative })}>
                Negativas
              </Chip>
              <Chip active={!!set.warmup} onClick={() => onChange({ ...set, warmup: !set.warmup })}>
                Aquecimento
              </Chip>
            </div>
            <input
              className="field mt-3"
              placeholder="Cadência (ex.: 3-1-1-0)"
              value={set.tempo ?? ''}
              onChange={(e) => onChange({ ...set, tempo: e.target.value || undefined })}
            />
          </Card>
          <Btn kind="danger" small className="w-full" onClick={onDelete}>
            Excluir série
          </Btn>
        </>
      )}
    </Sheet>
  )
}

function ExerciseCard({
  se,
  ex,
  sessionStart,
  effort,
  live,
  onChange,
  onSwap,
  onRemove,
}: {
  se: SessionExercise
  ex: Exercise | undefined
  sessionStart: string
  effort: Effort
  live: boolean
  onChange: (se: SessionExercise) => void
  onSwap: () => void
  onRemove: () => void
}) {
  const last = useLiveQuery(() => lastPerformance(se.exerciseId, sessionStart), [se.exerciseId, sessionStart])
  const settings = useLiveQuery(() => db.exerciseSettings.get(se.exerciseId), [se.exerciseId])
  const [sheet, setSheet] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)

  const setAt = (i: number, s: SetEntry) => onChange({ ...se, sets: se.sets.map((x, k) => (k === i ? s : x)) })
  const toggle = (i: number) => {
    const s = se.sets[i]
    if (s.done) return setAt(i, { ...s, done: false })
    const hint = se.suggested?.[i]
    const reps = s.reps || hint?.reps || 0
    const weight = s.weight || hint?.weight || 0
    if (!reps) return
    setAt(i, { ...s, reps, weight, done: true })
    if (live) {
      navigator.vibrate?.(30)
      startRest(se.restSec)
    }
  }
  const addSet = () => {
    const prev = se.sets[se.sets.length - 1]
    onChange({ ...se, sets: [...se.sets, { ...blankSet(prev?.technique), weight: prev?.weight ?? 0 }] })
  }
  const t = se.target
  const flags = (s: SetEntry) =>
    [s.warmup && 'aquec.', s.failure && 'falha', s.partials && 'parciais', s.negative && 'negativas', s.tempo].filter(Boolean).join(' · ')

  return (
    <Card className="!px-3">
      <div className="flex items-start gap-2 px-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {se.superset && <span className="rounded-md bg-high/15 px-1.5 text-xs font-bold text-high">{se.superset}</span>}
            <Link to={`/exercicio/${se.exerciseId}`} className="truncate text-base font-semibold">
              {ex?.namePt ?? 'Exercício removido'}
            </Link>
          </div>
          {se.substitutedFrom && <div className="text-xs text-mut">substituindo outro exercício hoje</div>}
          {ex && (
            <div className="mt-1">
              <MuscleTags ex={ex} compact />
            </div>
          )}
        </div>
        <button aria-label="Opções do exercício" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card2 text-mut" onClick={() => setMenu(true)}>
          ⋯
        </button>
      </div>

      <div className="mt-2 space-y-0.5 px-1 text-sm">
        {t && (
          <div className="num text-mut">
            Alvo: <span className="text-fg">{t.sets} × {t.repMin}–{t.repMax}</span>
            {t.rir !== undefined && ` · ${effortText(t.rir, effort)}`}
            {t.technique !== 'normal' && ` · ${TECHNIQUE_LABEL[t.technique]}`}
          </div>
        )}
        <div className="num text-mut">
          Última:{' '}
          {last ? (
            <span className="text-fg">
              {last.sets.map(describeSet).join(' | ')} <span className="text-mut">({dateFmt(last.date, { day: '2-digit', month: 'short' })})</span>
            </span>
          ) : (
            'primeira vez'
          )}
        </div>
        {settings?.machine && <div className="text-mut">Ajuste: <span className="text-fg">{settings.machine}</span></div>}
        {se.note && <div className="text-mut">Nota: <span className="text-fg">{se.note}</span></div>}
      </div>

      <div className="mt-3 grid grid-cols-[2.25rem_1fr_1fr_3.5rem_3rem] items-center gap-x-1.5 gap-y-2">
        <span />
        <span className="text-center text-xs text-mut">kg</span>
        <span className="text-center text-xs text-mut">reps</span>
        <span className="text-center text-xs text-mut">{effort === 'rir' ? 'RIR' : 'RPE'}</span>
        <span />
        {se.sets.map((s, i) => {
          const hint = se.suggested?.[i]
          return (
            <div key={i} className="contents">
              <button
                aria-label={`Opções da série ${i + 1}`}
                className={cx('num h-12 rounded-xl text-sm font-semibold', s.warmup ? 'bg-low/15 text-low' : s.technique !== 'normal' ? 'bg-high/15 text-high' : 'bg-card2 text-mut')}
                onClick={() => setSheet(i)}
              >
                {s.warmup ? 'A' : i + 1}
              </button>
              <NumInput decimal label={`Carga série ${i + 1}`} value={s.weight} placeholder={hint ? fmt(hint.weight) : '0'} onChange={(weight) => setAt(i, { ...s, weight })} className={cx(s.done && 'opacity-70')} />
              <NumInput label={`Reps série ${i + 1}`} value={s.reps} placeholder={hint ? String(hint.reps) : '0'} onChange={(reps) => setAt(i, { ...s, reps })} className={cx(s.done && 'opacity-70')} />
              <button aria-label={`Esforço série ${i + 1}`} className="num h-12 rounded-xl bg-card2 text-sm" onClick={() => setSheet(i)}>
                {s.rir === undefined ? '–' : effort === 'rir' ? s.rir : 10 - s.rir}
              </button>
              <button
                aria-label={s.done ? `Desmarcar série ${i + 1}` : `Concluir série ${i + 1}`}
                className={cx('h-12 rounded-xl text-xl font-bold', s.done ? 'bg-acc text-accfg' : 'border border-line bg-card2 text-mut')}
                onClick={() => toggle(i)}
              >
                ✓
              </button>
              {flags(s) && <div className="col-span-full -mt-1 ml-10 text-xs text-mut">{flags(s)}</div>}
              {s.technique !== 'normal' && <Segments set={s} onChange={(n) => setAt(i, n)} />}
            </div>
          )
        })}
      </div>
      <button className="mt-2 h-11 w-full rounded-xl border border-dashed border-line text-sm text-mut" onClick={addSet}>
        + série
      </button>

      <SetSheet
        set={sheet !== null ? se.sets[sheet] : undefined}
        index={sheet ?? 0}
        effort={effort}
        onChange={(s) => sheet !== null && setAt(sheet, s)}
        onDelete={() => {
          onChange({ ...se, sets: se.sets.filter((_, k) => k !== sheet) })
          setSheet(null)
        }}
        onClose={() => setSheet(null)}
      />

      <Sheet open={menu} onClose={() => setMenu(false)} title={ex?.namePt}>
        <Btn kind="soft" className="w-full" onClick={() => (setMenu(false), onSwap())}>
          Trocar exercício
        </Btn>
        <Card className="space-y-3">
          <Stepper label="Descanso (s)" value={se.restSec} min={0} max={600} step={15} onChange={(restSec) => onChange({ ...se, restSec })} />
          <div>
            <div className="mb-1 text-sm text-mut">Ajustes da máquina (lembrado para este exercício)</div>
            <input
              className="field"
              placeholder="Ex.: banco 4, pino 3, pegada neutra"
              value={settings?.machine ?? ''}
              onChange={(e) => void db.exerciseSettings.put({ ...settings, exerciseId: se.exerciseId, machine: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-mut">Nota de hoje</div>
            <input className="field" placeholder="Como foi?" value={se.note ?? ''} onChange={(e) => onChange({ ...se, note: e.target.value || undefined })} />
          </div>
        </Card>
        <Btn kind="danger" small className="w-full" onClick={() => (setMenu(false), onRemove())}>
          Remover do treino
        </Btn>
      </Sheet>
    </Card>
  )
}

export default function SessionPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { byId } = useExercises()
  const [effort] = useSetting<Effort>('effort', 'rir')
  const [draft, setDraft] = useState<Session | null | undefined>(undefined)
  const [picking, setPicking] = useState(false)
  const [swapUid, setSwapUid] = useState<string | null>(null)
  const [permanent, setPermanent] = useState(false)
  const [browse, setBrowse] = useState(false)
  const [, tick] = useState(0)
  const loaded = useRef(false)

  useEffect(() => {
    loaded.current = false
    void db.sessions.get(id!).then((s) => {
      setDraft(s ?? null)
      loaded.current = true
    })
  }, [id])
  // o rascunho em memória é a fonte da verdade; cada alteração é gravada no banco
  useEffect(() => {
    if (draft && loaded.current) void saveSession(draft)
  }, [draft])
  const live = !!draft && !draft.end
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [live])

  if (draft === undefined) return <Page title="Treino">{null}</Page>
  if (draft === null)
    return (
      <Page title="Treino" back="/">
        <p className="text-mut">Treino não encontrado.</p>
      </Page>
    )

  const update = (fn: (s: Session) => Session) => setDraft((d) => (d ? fn(d) : d))
  const patchExercise = (uidEx: string, se: SessionExercise) =>
    update((s) => ({ ...s, exercises: s.exercises.map((e) => (e.uid === uidEx ? se : e)) }))
  const done = draft.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)
  const total = draft.exercises.reduce((a, e) => a + e.sets.length, 0)
  const elapsed = Math.floor((Date.now() - new Date(draft.start).getTime()) / 1000)
  const swapping = draft.exercises.find((e) => e.uid === swapUid)

  const finish = async () => {
    if (!done && !confirm('Nenhuma série concluída. Descartar este treino?')) return
    if (done && done < total && !confirm(`${total - done} séries não concluídas serão descartadas. Finalizar?`)) return
    stopRest()
    await saveSession(draft)
    await finishSession(draft.id)
    nav('/historico', { replace: true })
  }
  const addExercise = async (ex: Exercise) => {
    const se = await buildSessionExercise(ex, ex.id, undefined, draft.mode, await getSetting('defaultRest', 120))
    update((s) => ({ ...s, exercises: [...s.exercises, se] }))
  }
  const swap = async (sub: Exercise) => {
    if (!swapping) return
    const fresh = await buildSessionExercise(sub, sub.id, undefined, draft.mode, swapping.restSec)
    const count = swapping.target?.sets ?? swapping.sets.length
    const sets = Array.from({ length: count }, (_, i) => fresh.sets[i] ?? { ...blankSet(swapping.target?.technique), weight: fresh.sets[0]?.weight ?? 0 })
    patchExercise(swapping.uid, {
      ...swapping,
      exerciseId: sub.id,
      substitutedFrom: swapping.substitutedFrom ?? swapping.exerciseId,
      sets,
      suggested: fresh.suggested,
      note: undefined,
    })
    if (permanent && draft.routineId && swapping.routineItemUid) {
      const routine = await db.routines.get(draft.routineId)
      if (routine)
        await db.routines.update(routine.id, {
          items: routine.items.map((it) => (it.uid === swapping.routineItemUid ? { ...it, exerciseId: sub.id } : it)),
        })
    }
    setSwapUid(null)
    setBrowse(false)
    setPermanent(false)
  }

  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{draft.routineName}</span>
          <ModeBadge mode={draft.mode} />
        </span>
      }
      back="/"
      right={
        live ? (
          <Btn small onClick={() => void finish()}>
            Finalizar
          </Btn>
        ) : (
          <Btn small onClick={() => nav(-1)}>
            Salvar
          </Btn>
        )
      }
    >
      <div className="num flex items-center justify-between text-sm text-mut">
        <span>{live ? `Tempo ${clock(elapsed)}` : dateFmt(draft.start, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
        <span>
          {done}/{total} séries
        </span>
      </div>

      {draft.exercises.map((se) => (
        <ExerciseCard
          key={se.uid}
          se={se}
          ex={byId[se.exerciseId]}
          sessionStart={draft.start}
          effort={effort}
          live={live}
          onChange={(n) => patchExercise(se.uid, n)}
          onSwap={() => setSwapUid(se.uid)}
          onRemove={() => update((s) => ({ ...s, exercises: s.exercises.filter((e) => e.uid !== se.uid) }))}
        />
      ))}

      <Btn kind="soft" className="w-full" onClick={() => setPicking(true)}>
        + Adicionar exercício
      </Btn>

      <textarea
        className="field min-h-20"
        placeholder="Notas do treino"
        value={draft.notes ?? ''}
        onChange={(e) => update((s) => ({ ...s, notes: e.target.value || undefined }))}
      />

      <Btn
        kind="danger"
        small
        className="w-full"
        onClick={async () => {
          if (!confirm(live ? 'Descartar este treino sem salvar?' : 'Excluir este treino do histórico? Não pode ser desfeito.')) return
          stopRest()
          loaded.current = false
          await discardSession(draft.id)
          nav(live ? '/' : '/historico', { replace: true })
        }}
      >
        {live ? 'Descartar treino' : 'Excluir treino'}
      </Btn>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ex) => {
          setPicking(false)
          void addExercise(ex)
        }}
      />

      <Sheet open={!!swapping && !browse} onClose={() => setSwapUid(null)} title={`Trocar ${byId[swapping?.exerciseId ?? '']?.namePt ?? ''}`} full>
        {swapping && byId[swapping.exerciseId] && (
          <>
            {draft.routineId && swapping.routineItemUid && (
              <div className="grid grid-cols-2 gap-2">
                <Btn small kind={!permanent ? 'primary' : 'soft'} onClick={() => setPermanent(false)}>
                  Só hoje
                </Btn>
                <Btn small kind={permanent ? 'primary' : 'soft'} onClick={() => setPermanent(true)}>
                  Trocar na rotina
                </Btn>
              </div>
            )}
            <Substitutes ex={byId[swapping.exerciseId]} exclude={draft.exercises.map((e) => e.exerciseId)} onPick={(s) => void swap(s)} />
            <Btn kind="soft" small className="w-full" onClick={() => setBrowse(true)}>
              Buscar outro na biblioteca
            </Btn>
          </>
        )}
      </Sheet>
      <ExercisePicker open={browse} onClose={() => setBrowse(false)} onPick={(ex) => void swap(ex)} title="Trocar por" />
    </Page>
  )
}
