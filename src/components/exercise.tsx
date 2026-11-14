import { useMemo, useState } from 'react'
import { EQUIPMENT, EQUIP_LABEL, GROUPS, GROUP_BY_ID, SUBPARTS, SUBPART_BY_ID, TENSION_SHORT } from '../data/muscles'
import { toggleFavorite, useActiveGym, useExercises, useFavorites } from '../db/hooks'
import { rankSubstitutes } from '../lib/substitution'
import type { Exercise, Tension } from '../types'
import { Chip, cx, Empty, Sheet } from './ui'

const fold = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const primaryGroups = (ex: Exercise) => [
  ...new Set(ex.targets.filter((t) => t.role === 'primary').map((t) => SUBPART_BY_ID[t.subpartId]?.groupId)),
]

/** etiquetas das subpartes trabalhadas: primárias em destaque, secundárias discretas */
export function MuscleTags({ ex, compact }: { ex: Exercise; compact?: boolean }) {
  const prim = ex.targets.filter((t) => t.role === 'primary')
  const sec = ex.targets.filter((t) => t.role === 'secondary')
  return (
    <div className="flex flex-wrap gap-1">
      {prim.map((t) => (
        <span key={t.subpartId} className="rounded-md bg-acc/15 px-1.5 py-0.5 text-xs text-acc">
          {SUBPART_BY_ID[t.subpartId]?.pt ?? t.subpartId}
        </span>
      ))}
      {!compact &&
        sec.map((t) => (
          <span key={t.subpartId} className="rounded-md bg-card2 px-1.5 py-0.5 text-xs text-mut">
            {SUBPART_BY_ID[t.subpartId]?.pt ?? t.subpartId}
          </span>
        ))}
      {compact && sec.length > 0 && <span className="px-1 py-0.5 text-xs text-mut">+{sec.length} sec.</span>}
    </div>
  )
}

export function ExerciseRow({ ex, onClick, right }: { ex: Exercise; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 active:bg-card2"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{ex.namePt}</div>
        <div className="truncate text-xs text-mut">
          {ex.nameEn} · {EQUIP_LABEL[ex.equipment]} · {TENSION_SHORT[ex.tension]}
          {ex.unilateral ? ' · unilateral' : ''}
          {ex.isCustom ? ' · personalizado' : ''}
        </div>
        <div className="mt-1.5">
          <MuscleTags ex={ex} compact />
        </div>
      </div>
      {right}
    </div>
  )
}

/** lista de exercícios com busca PT/EN e filtros por grupo, subparte, equipamento e perfil de tensão */
export function ExerciseList({ onPick, limit = 60 }: { onPick: (ex: Exercise) => void; limit?: number }) {
  const { list } = useExercises()
  const { equipment, active } = useActiveGym()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('')
  const [subpart, setSubpart] = useState('')
  const [equip, setEquip] = useState('')
  const [tension, setTension] = useState<Tension | ''>('')
  const [onlyGym, setOnlyGym] = useState(false)
  const [shown, setShown] = useState(limit)

  const filtered = useMemo(() => {
    const terms = fold(q).split(/\s+/).filter(Boolean)
    return list.filter((e) => {
      if (terms.length) {
        const hay = fold(`${e.namePt} ${e.nameEn}`)
        if (!terms.every((t) => hay.includes(t))) return false
      }
      if (subpart) {
        if (!e.targets.some((t) => t.subpartId === subpart && t.role === 'primary')) return false
      } else if (group && !primaryGroups(e).includes(group)) return false
      if (equip && e.equipment !== equip) return false
      if (tension && e.tension !== tension) return false
      if (onlyGym && equipment && !equipment.has(e.equipment)) return false
      return true
    })
  }, [list, q, group, subpart, equip, tension, onlyGym, equipment])

  return (
    <div className="space-y-3">
      <input
        className="field"
        placeholder="Buscar exercício (PT ou EN)"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setShown(limit)
        }}
      />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={!group} onClick={() => (setGroup(''), setSubpart(''))}>
          Todos
        </Chip>
        {GROUPS.map((g) => (
          <Chip key={g.id} active={group === g.id} onClick={() => (setGroup(group === g.id ? '' : g.id), setSubpart(''))}>
            {g.pt}
          </Chip>
        ))}
      </div>
      {group && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {SUBPARTS.filter((s) => s.groupId === group).map((s) => (
            <Chip key={s.id} active={subpart === s.id} onClick={() => setSubpart(subpart === s.id ? '' : s.id)}>
              {s.pt}
            </Chip>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Equipamento" className="field text-sm" value={equip} onChange={(e) => setEquip(e.target.value)}>
          <option value="">Qualquer equipamento</option>
          {EQUIPMENT.map((e) => (
            <option key={e.id} value={e.id}>
              {e.pt}
            </option>
          ))}
        </select>
        <select
          aria-label="Perfil de tensão"
          className="field text-sm"
          value={tension}
          onChange={(e) => setTension(e.target.value as Tension | '')}
        >
          <option value="">Qualquer tensão</option>
          <option value="lengthened">Ênfase alongado</option>
          <option value="mid">Ênfase médio</option>
          <option value="shortened">Ênfase encurtado</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-mut">
        <input type="checkbox" className="h-5 w-5 accent-(--acc)" checked={onlyGym} onChange={(e) => setOnlyGym(e.target.checked)} />
        Só o que existe em “{active?.name ?? 'minha academia'}”
      </label>
      <div className="text-xs text-mut">{filtered.length} exercícios</div>
      <div className="space-y-2">
        {filtered.slice(0, shown).map((e) => (
          <ExerciseRow key={e.id} ex={e} onClick={() => onPick(e)} />
        ))}
        {!filtered.length && <Empty>Nenhum exercício encontrado.</Empty>}
        {filtered.length > shown && (
          <button className="w-full py-3 text-sm text-acc" onClick={() => setShown(shown + limit)}>
            Mostrar mais
          </button>
        )}
      </div>
    </div>
  )
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = 'Adicionar exercício',
}: {
  open: boolean
  onClose: () => void
  onPick: (ex: Exercise) => void
  title?: string
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} full>
      {open && <ExerciseList onPick={onPick} limit={40} />}
    </Sheet>
  )
}

/** lista ranqueada de substitutos de um exercício, com favoritos e filtro por equipamento */
export function Substitutes({
  ex,
  onPick,
  exclude,
  limit = 12,
}: {
  ex: Exercise
  onPick: (sub: Exercise) => void
  exclude?: string[]
  limit?: number
}) {
  const { list } = useExercises()
  const { equipment, active } = useActiveGym()
  const favorites = useFavorites(ex.id)
  const [onlyGym, setOnlyGym] = useState(true)
  const subs = useMemo(
    () => rankSubstitutes(ex, list, { equipment: onlyGym ? equipment : undefined, favorites, exclude, limit }),
    [ex, list, equipment, onlyGym, favorites, exclude, limit],
  )
  const role = Object.fromEntries(ex.targets.map((t) => [t.subpartId, t.role]))
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-mut">
        <input type="checkbox" className="h-5 w-5 accent-(--acc)" checked={onlyGym} onChange={(e) => setOnlyGym(e.target.checked)} />
        Só equipamento de “{active?.name ?? 'minha academia'}”
      </label>
      {subs.map(({ exercise: s, score, favorite }) => {
        const shared = s.targets.filter((t) => t.role === 'primary' && role[t.subpartId] === 'primary')
        return (
          <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-line bg-card py-2 pr-2 pl-4">
            <div className="min-w-0 flex-1 cursor-pointer py-1" onClick={() => onPick(s)}>
              <div className="truncate font-medium">{s.namePt}</div>
              <div className="truncate text-xs text-mut">
                {EQUIP_LABEL[s.equipment]} · {TENSION_SHORT[s.tension]} · {Math.min(100, Math.round(score * 100))}% similar
              </div>
              <div className="mt-1 truncate text-xs text-acc">
                {shared.length ? shared.map((t) => SUBPART_BY_ID[t.subpartId].pt).join(', ') : GROUP_BY_ID[primaryGroups(s)[0]]?.pt}
              </div>
            </div>
            <button
              aria-label={favorite ? 'Remover dos favoritos' : 'Marcar como substituto favorito'}
              className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl', favorite ? 'text-acc' : 'text-mut')}
              onClick={() => void toggleFavorite(ex.id, s.id)}
            >
              {favorite ? '★' : '☆'}
            </button>
          </div>
        )
      })}
      {!subs.length && <Empty>Nenhum substituto com esse equipamento. Desmarque o filtro para ver mais.</Empty>}
    </div>
  )
}
