import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Btn, Card, Chip, cx, Page, SectionTitle } from '../components/ui'
import { EQUIPMENT, GROUPS, PATTERNS, SUBPARTS } from '../data/muscles'
import { db, uid } from '../db/db'
import { isSeedId, useExercises } from '../db/hooks'
import type { Exercise, Role, Tension } from '../types'

const EMPTY: Exercise = {
  id: '',
  namePt: '',
  nameEn: '',
  equipment: 'machine',
  pattern: 'curl',
  tension: 'mid',
  targets: [],
  isCustom: true,
}

export default function ExerciseEdit() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const baseId = params.get('base')
  const nav = useNavigate()
  const { byId } = useExercises()
  const [form, setForm] = useState<Exercise | null>(null)

  useEffect(() => {
    if (form) return
    if (id) {
      if (byId[id]) setForm(structuredClone(byId[id]))
    } else if (baseId) {
      const base = byId[baseId]
      if (base)
        setForm({
          ...structuredClone(base),
          id: '',
          namePt: `${base.namePt} (variação)`,
          nameEn: `${base.nameEn} (variation)`,
          family: base.family ?? base.id,
          isCustom: true,
        })
    } else setForm(EMPTY)
  }, [id, baseId, byId, form])

  if (!form) return <Page title="Exercício" back>{null}</Page>

  const set = (patch: Partial<Exercise>) => setForm({ ...form, ...patch })
  const roleOf = (sp: string): Role | undefined => form.targets.find((t) => t.subpartId === sp)?.role
  const cycle = (sp: string) => {
    const r = roleOf(sp)
    const rest = form.targets.filter((t) => t.subpartId !== sp)
    set({ targets: r === undefined ? [...rest, { subpartId: sp, role: 'primary' }] : r === 'primary' ? [...rest, { subpartId: sp, role: 'secondary' }] : rest })
  }
  const valid = form.namePt.trim() && form.targets.some((t) => t.role === 'primary')

  const save = async () => {
    const targets = [...form.targets].sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1))
    const ex: Exercise = {
      ...form,
      id: form.id || `c-${uid()}`,
      namePt: form.namePt.trim(),
      nameEn: form.nameEn.trim() || form.namePt.trim(),
      targets,
    }
    // variação: garante que o exercício base compartilhe a mesma família
    if (!form.id && baseId && byId[baseId] && !byId[baseId].family) await db.exercises.put({ ...byId[baseId], family: ex.family })
    await db.exercises.put(ex)
    nav(`/exercicio/${ex.id}`, { replace: true })
  }

  return (
    <Page title={id ? 'Editar exercício' : baseId ? 'Nova variação' : 'Novo exercício'} back>
      <Card className="space-y-3">
        <input className="field" placeholder="Nome em português" value={form.namePt} onChange={(e) => set({ namePt: e.target.value })} />
        <input className="field" placeholder="Nome em inglês (opcional)" value={form.nameEn} onChange={(e) => set({ nameEn: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select aria-label="Equipamento" className="field text-sm" value={form.equipment} onChange={(e) => set({ equipment: e.target.value })}>
            {EQUIPMENT.map((e) => (
              <option key={e.id} value={e.id}>
                {e.pt}
              </option>
            ))}
          </select>
          <select aria-label="Padrão de movimento" className="field text-sm" value={form.pattern} onChange={(e) => set({ pattern: e.target.value })}>
            {Object.entries(PATTERNS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-1 text-sm text-mut">Onde a tensão é maior</div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['lengthened', 'Alongado'],
                ['mid', 'Meio'],
                ['shortened', 'Encurtado'],
              ] as [Tension, string][]
            ).map(([k, v]) => (
              <Chip key={k} active={form.tension === k} onClick={() => set({ tension: k })}>
                {v}
              </Chip>
            ))}
            <Chip active={!!form.unilateral} onClick={() => set({ unilateral: !form.unilateral })}>
              Unilateral
            </Chip>
          </div>
        </div>
      </Card>

      <SectionTitle>Músculos trabalhados</SectionTitle>
      <p className="text-xs text-mut">
        Toque para alternar: <span className="text-acc">primário</span> → <span className="text-fg">secundário</span> → nenhum.
      </p>
      {GROUPS.map((g) => (
        <Card key={g.id} className="!py-3">
          <div className="mb-2 text-sm font-semibold">{g.pt}</div>
          <div className="flex flex-wrap gap-2">
            {SUBPARTS.filter((s) => s.groupId === g.id).map((s) => {
              const r = roleOf(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => cycle(s.id)}
                  className={cx(
                    'rounded-full border px-3 py-1.5 text-sm',
                    r === 'primary' ? 'border-acc bg-acc/15 text-acc' : r === 'secondary' ? 'border-fg/40 bg-card2 text-fg' : 'border-line text-mut',
                  )}
                >
                  {s.pt}
                  {r === 'primary' ? ' ●' : r === 'secondary' ? ' ○' : ''}
                </button>
              )
            })}
          </div>
        </Card>
      ))}

      <Btn className="w-full" disabled={!valid} onClick={() => void save()}>
        Salvar
      </Btn>
      {!valid && <p className="text-center text-xs text-mut">Informe o nome e ao menos um músculo primário.</p>}

      {id && isSeedId(id) && form.isCustom !== true && (
        <Btn
          kind="soft"
          small
          className="w-full"
          onClick={async () => {
            if (!confirm('Restaurar os dados originais deste exercício?')) return
            await db.exercises.delete(id)
            nav(-1)
          }}
        >
          Restaurar padrão da biblioteca
        </Btn>
      )}
      {id && !isSeedId(id) && (
        <Btn
          kind="danger"
          small
          className="w-full"
          onClick={async () => {
            if (!confirm('Excluir este exercício personalizado? O histórico de treinos com ele é mantido, mas aparecerá como “exercício removido”.')) return
            await db.exercises.delete(id)
            nav('/biblioteca', { replace: true })
          }}
        >
          Excluir exercício
        </Btn>
      )}
    </Page>
  )
}
