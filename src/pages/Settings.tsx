import { useRef, useState } from 'react'
import { ExercisePicker } from '../components/exercise'
import { TargetEditor, targetText } from '../components/target'
import { Btn, Card, Chip, cx, dateFmt, Page, SectionTitle, Stepper } from '../components/ui'
import { EQUIPMENT, GROUPS, MODE_LABEL } from '../data/muscles'
import { applyModeTargetToRoutines } from '../db/actions'
import { db, DEFAULT_TARGETS, getModeDefaults, setSetting, TABLES, uid } from '../db/db'
import { useActiveGym, useExercises, useModeDefaults, useSetting } from '../db/hooks'
import { loadReference } from '../db/reference'
import { download, exportBackup, importBackup } from '../lib/backup'
import { buildRoutines, buildSessions, matchExercise, parseFitbod, validateRoutineFile, type FitbodRow } from '../lib/fitbodImport'
import { DEFAULT_GROUP_TARGET, groupTarget, type GroupTargets } from '../lib/volume'
import type { Exercise, Mode } from '../types'

function ModeChips({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['low', 'high'] as Mode[]).map((m) => (
        <Btn key={m} small kind={mode === m ? 'primary' : 'soft'} onClick={() => onChange(m)}>
          {MODE_LABEL[m]}
        </Btn>
      ))}
    </div>
  )
}

/** alvo padrão de cada exercício em cada modo (séries, reps, RIR, técnica) */
function ModeDefaults() {
  const [defaults, setDefault] = useModeDefaults()
  const [mode, setMode] = useState<Mode>('low')
  const [msg, setMsg] = useState('')
  const t = defaults[mode]
  return (
    <>
      <SectionTitle>Configuração low / high volume</SectionTitle>
      <p className="text-xs text-mut">
        Alvo por exercício usado ao adicionar exercícios a uma rotina e ao importar rotinas. Rotinas já montadas não mudam, a menos que você aplique abaixo.
      </p>
      <ModeChips mode={mode} onChange={(m) => (setMode(m), setMsg(''))} />
      <Card>
        <TargetEditor value={t} onChange={(v) => (setDefault(mode, v), setMsg(''))} />
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="soft" small onClick={() => (setDefault(mode, { ...DEFAULT_TARGETS[mode] }), setMsg(''))}>
          Restaurar padrão
        </Btn>
        <Btn
          kind="soft"
          small
          onClick={async () => {
            if (!confirm(`Substituir o alvo ${MODE_LABEL[mode]} de TODOS os exercícios de todas as rotinas por ${targetText(t)}? Ajustes individuais desse modo serão perdidos.`)) return
            const n = await applyModeTargetToRoutines(mode, t)
            setMsg(`${n} exercícios atualizados (${MODE_LABEL[mode]}).`)
          }}
        >
          Aplicar às rotinas
        </Btn>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
    </>
  )
}

function MiniStep({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center">
      <button aria-label={`Diminuir ${label}`} className="h-9 w-8 rounded-lg bg-card2 text-lg disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="num w-7 text-center text-sm font-semibold">{value}</span>
      <button aria-label={`Aumentar ${label}`} className="h-9 w-8 rounded-lg bg-card2 text-lg disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  )
}

/** faixa de séries semanais por grupo muscular, separada por modo */
function GroupTargetsEditor() {
  const [targets, setTargets] = useSetting<GroupTargets>('groupTargets', {})
  const [mode, setMode] = useState<Mode>('low')
  const custom = targets[mode] ?? {}
  const set = (groupId: string, min: number, max: number) => setTargets({ ...targets, [mode]: { ...custom, [groupId]: { min, max } } })
  const def = DEFAULT_GROUP_TARGET[mode]
  return (
    <>
      <SectionTitle>Alvo semanal de séries por grupo</SectionTitle>
      <p className="text-xs text-mut">
        Usado em Análises › Volume semanal. Cada série conta 1 para o grupo do músculo primário e 0,5 para grupos só secundários. A semana usa os alvos do modo
        predominante nos treinos dela.
      </p>
      <ModeChips mode={mode} onChange={setMode} />
      <Card className="space-y-1 !py-2">
        <div className="flex justify-end gap-3 pr-1 text-[11px] text-mut">
          <span className="w-23 text-center">mín.</span>
          <span className="w-23 text-center">máx.</span>
        </div>
        {GROUPS.map((g) => {
          const r = groupTarget(targets, mode, g.id)
          return (
            <div key={g.id} className="flex items-center gap-2">
              <span className={cx('min-w-0 flex-1 truncate text-sm', !custom[g.id] && 'text-mut')}>{g.pt}</span>
              <MiniStep label={`mínimo ${g.pt}`} value={r.min} min={0} max={r.max} onChange={(n) => set(g.id, n, r.max)} />
              <MiniStep label={`máximo ${g.pt}`} value={r.max} min={Math.max(1, r.min)} max={40} onChange={(n) => set(g.id, r.min, n)} />
            </div>
          )
        })}
      </Card>
      <p className="text-xs text-mut">
        Grupos em cinza usam o padrão do {MODE_LABEL[mode]}: {def.min}–{def.max} séries.
      </p>
      {Object.keys(custom).length > 0 && (
        <Btn
          kind="soft"
          small
          className="w-full"
          onClick={() => {
            if (confirm(`Voltar todos os grupos ao padrão do ${MODE_LABEL[mode]} (${def.min}–${def.max})?`)) setTargets({ ...targets, [mode]: {} })
          }}
        >
          Restaurar padrão ({MODE_LABEL[mode]})
        </Btn>
      )}
    </>
  )
}

function Gyms() {
  const { gyms, active } = useActiveGym()
  const [editing, setEditing] = useState('')
  return (
    <>
      <SectionTitle>Academias (equipamento disponível)</SectionTitle>
      <p className="text-xs text-mut">A academia ativa filtra os substitutos sugeridos e a busca da biblioteca.</p>
      {gyms.map((g) => (
        <Card key={g.id} className="!p-0">
          <div className="flex items-center gap-2 p-3">
            <button
              aria-label={`Ativar ${g.name}`}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${active?.id === g.id ? 'border-acc bg-acc/15 text-acc' : 'border-line text-mut'}`}
              onClick={() => void setSetting('activeGymId', g.id)}
            >
              {active?.id === g.id ? '●' : '○'}
            </button>
            <div className="min-w-0 flex-1" onClick={() => setEditing(editing === g.id ? '' : g.id)}>
              <div className="truncate font-medium">{g.name}</div>
              <div className="text-xs text-mut">
                {g.equipment.length} de {EQUIPMENT.length} tipos de equipamento{active?.id === g.id ? ' · ativa' : ''}
              </div>
            </div>
            <button className="px-2 text-sm text-mut" onClick={() => setEditing(editing === g.id ? '' : g.id)}>
              {editing === g.id ? 'Fechar' : 'Editar'}
            </button>
          </div>
          {editing === g.id && (
            <div className="space-y-3 border-t border-line p-3">
              <input className="field" value={g.name} onChange={(e) => void db.gyms.update(g.id, { name: e.target.value })} />
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT.map((e) => {
                  const on = g.equipment.includes(e.id)
                  return (
                    <Chip
                      key={e.id}
                      active={on}
                      onClick={() => void db.gyms.update(g.id, { equipment: on ? g.equipment.filter((x) => x !== e.id) : [...g.equipment, e.id] })}
                    >
                      {e.pt}
                    </Chip>
                  )
                })}
              </div>
              {gyms.length > 1 && (
                <Btn kind="danger" small onClick={() => confirm(`Excluir “${g.name}”?`) && void db.gyms.delete(g.id)}>
                  Excluir academia
                </Btn>
              )}
            </div>
          )}
        </Card>
      ))}
      <Btn
        kind="soft"
        small
        className="w-full"
        onClick={() => {
          const name = prompt('Nome da academia')
          if (!name?.trim()) return
          const id = uid()
          void db.gyms.put({ id, name: name.trim(), equipment: EQUIPMENT.map((e) => e.id) })
          setEditing(id)
        }}
      >
        + Nova academia
      </Btn>
    </>
  )
}

interface Pending {
  rows: FitbodRow[]
  names: { name: string; count: number; match?: string }[]
}

function FitbodImport() {
  const { list, byId } = useExercises()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [picking, setPicking] = useState('')
  const [msg, setMsg] = useState('')

  const onFile = async (file: File) => {
    setMsg('')
    try {
      const rows = parseFitbod(await file.text())
      if (!rows.length) throw new Error('Nenhuma série de musculação encontrada no arquivo.')
      const count: Record<string, number> = {}
      for (const r of rows) count[r.name] = (count[r.name] ?? 0) + 1
      const names = Object.entries(count)
        .map(([name, n]) => ({ name, count: n, match: matchExercise(name, list) }))
        .sort((a, b) => Number(!!a.match) - Number(!!b.match) || b.count - a.count)
      setMapping(Object.fromEntries(names.filter((n) => n.match).map((n) => [n.name, n.match!])))
      setPending({ rows, names })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    }
  }

  const run = async () => {
    if (!pending) return
    const final = { ...mapping }
    const created: Exercise[] = []
    for (const n of pending.names) {
      if (final[n.name]) continue
      // sem correspondência: cria exercício personalizado (músculos podem ser definidos depois)
      const ex: Exercise = {
        id: `c-${uid()}`,
        namePt: n.name,
        nameEn: n.name,
        equipment: 'machine',
        pattern: 'curl',
        tension: 'mid',
        targets: [],
        isCustom: true,
      }
      created.push(ex)
      final[n.name] = ex.id
    }
    const sessions = buildSessions(pending.rows, final, uid)
    await db.transaction('rw', db.sessions, db.exercises, async () => {
      // reimportar substitui a importação anterior em vez de duplicar
      const old = (await db.sessions.toArray()).filter((s) => s.source === 'fitbod').map((s) => s.id)
      await db.sessions.bulkDelete(old)
      await db.exercises.bulkPut(created)
      await db.sessions.bulkPut(sessions)
    })
    setPending(null)
    setMsg(
      `Importados ${sessions.length} treinos e ${pending.rows.length} séries.` +
        (created.length ? ` ${created.length} exercícios sem correspondência foram criados como personalizados — defina os músculos deles na biblioteca.` : ''),
    )
  }

  const unmatched = pending?.names.filter((n) => !mapping[n.name]).length ?? 0

  return (
    <>
      <SectionTitle>Importar do Fitbod</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-mut">
          No Fitbod: Log → ⚙ → Export Workout Data. Selecione aqui o arquivo CSV gerado. Importar de novo substitui a importação anterior.
        </p>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
        <Btn kind="soft" className="w-full" onClick={() => input.current?.click()}>
          Escolher arquivo CSV
        </Btn>
        {msg && <p className="text-sm">{msg}</p>}
        {pending && (
          <>
            <div className="text-sm">
              <b>{pending.rows.length}</b> séries, <b>{pending.names.length}</b> exercícios distintos.{' '}
              {unmatched ? `${unmatched} sem correspondência (serão criados como personalizados).` : 'Todos reconhecidos.'}
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {pending.names.map((n) => (
                <button
                  key={n.name}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-card2 px-3 py-2 text-left text-sm"
                  onClick={() => setPicking(n.name)}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{n.name}</span>
                    <span className={`block truncate text-xs ${mapping[n.name] ? 'text-acc' : 'text-high'}`}>
                      → {mapping[n.name] ? byId[mapping[n.name]]?.namePt : 'criar personalizado'}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs text-mut">{n.count} séries</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn kind="ghost" small onClick={() => setPending(null)}>
                Cancelar
              </Btn>
              <Btn small onClick={() => void run()}>
                Importar
              </Btn>
            </div>
          </>
        )}
      </Card>
      <ExercisePicker
        open={!!picking}
        onClose={() => setPicking('')}
        title={`Associar “${picking}”`}
        onPick={(ex) => {
          setMapping({ ...mapping, [picking]: ex.id })
          setPicking('')
        }}
      />
    </>
  )
}

function RoutineImport() {
  const { list } = useExercises()
  const input = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const onFile = async (file: File) => {
    try {
      const data = validateRoutineFile(JSON.parse(await file.text()))
      const mapping: Record<string, string> = {}
      const created: Exercise[] = []
      for (const r of data.routines)
        for (const it of r.items) {
          if (mapping[it.name]) continue
          const id = matchExercise(it.name, list)
          if (id) mapping[it.name] = id
          else {
            // sem correspondência: cria exercício personalizado (músculos podem ser definidos depois)
            const ex: Exercise = { id: `c-${uid()}`, namePt: it.name, nameEn: it.name, equipment: 'machine', pattern: 'curl', tension: 'mid', targets: [], isCustom: true }
            created.push(ex)
            mapping[it.name] = ex.id
          }
        }
      let added = 0
      const defaults = await getModeDefaults()
      await db.transaction('rw', db.routines, db.exercises, async () => {
        const existing = await db.routines.toArray()
        const names = new Set(existing.map((r) => r.name.toLowerCase()))
        const fresh = buildRoutines(data, mapping, uid, existing.length, defaults).filter((r) => !names.has(r.name.toLowerCase()))
        const used = new Set(fresh.flatMap((r) => r.items.map((i) => i.exerciseId)))
        await db.exercises.bulkPut(created.filter((c) => used.has(c.id)))
        await db.routines.bulkPut(fresh)
        added = fresh.length
      })
      setMsg(
        `${added} rotinas adicionadas (${data.routines.length - added} já existiam e foram ignoradas).` +
          (created.length ? ` ${created.length} exercícios sem correspondência viraram personalizados — defina os músculos deles na biblioteca.` : ''),
      )
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    }
  }

  return (
    <>
      <SectionTitle>Importar rotinas</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-mut">
          Selecione o arquivo rotinas-referencia.json. Rotinas com o mesmo nome de uma existente são ignoradas; nada é apagado.
        </p>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
        <Btn kind="soft" className="w-full" onClick={() => input.current?.click()}>
          Escolher arquivo JSON
        </Btn>
        {msg && <p className="text-sm">{msg}</p>}
      </Card>
    </>
  )
}

function ReferenceLoad() {
  const { list } = useExercises()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async () => {
    setBusy(true)
    try {
      const r = await loadReference(list)
      setMsg(
        `${r.routines} rotinas adicionadas${r.skipped ? ` (${r.skipped} já existiam)` : ''} e ${r.sessions} treinos (${r.sets} séries) no histórico.`,
      )
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Não foi possível carregar.')
    }
    setBusy(false)
  }

  return (
    <>
      <SectionTitle>Treinos de referência</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-mut">
          Carrega as rotinas e o histórico transcritos das capturas do Fitbod (set–nov/2026). Nada é apagado; repetir não duplica.
        </p>
        <Btn className="w-full" disabled={busy} onClick={() => void run()}>
          Carregar rotinas e histórico
        </Btn>
        {msg && <p className="text-sm">{msg}</p>}
      </Card>
    </>
  )
}

function Backup() {
  const input = useRef<HTMLInputElement>(null)
  const [last, setLast] = useSetting('lastBackup', '')
  const [msg, setMsg] = useState('')

  const doExport = async () => {
    const now = new Date()
    await setSetting('lastBackup', now.toISOString())
    const data = await exportBackup()
    download(`treino-backup-${now.toISOString().slice(0, 10)}.json`, JSON.stringify(data))
    setLast(now.toISOString())
    setMsg('Backup gerado. Guarde o arquivo em local seguro (Drive, e-mail).')
  }
  const doImport = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text())
      if (!confirm('Restaurar este backup? Todos os dados atuais do app serão substituídos.')) return
      await importBackup(data)
      setMsg('Backup restaurado.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Arquivo inválido.')
    }
  }

  return (
    <>
      <SectionTitle>Backup</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-mut">
          Os dados ficam apenas neste aparelho. Limpar os dados do navegador ou desinstalar o app apaga o histórico — exporte um backup de tempos em
          tempos.{last ? ` Último: ${dateFmt(last, { day: '2-digit', month: 'short', year: 'numeric' })}.` : ''}
        </p>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void doImport(f)
            e.target.value = ''
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <Btn onClick={() => void doExport()}>Exportar</Btn>
          <Btn kind="soft" onClick={() => input.current?.click()}>
            Restaurar
          </Btn>
        </div>
        {msg && <p className="text-sm">{msg}</p>}
      </Card>
    </>
  )
}

export default function Settings() {
  const [theme, setTheme] = useSetting<'dark' | 'light'>('theme', 'dark')
  const [effort, setEffort] = useSetting<'rir' | 'rpe'>('effort', 'rir')
  const [rest, setRest] = useSetting('defaultRest', 120)
  const [volMin, setVolMin] = useSetting('volMin', 4)
  const [volMax, setVolMax] = useSetting('volMax', 12)
  const [defaultMode, setDefaultMode] = useSetting<'low' | 'high'>('defaultMode', 'high')

  return (
    <Page title="Ajustes" back="/">
      <SectionTitle>Preferências</SectionTitle>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-mut">Tema</span>
          <div className="flex gap-2">
            <Chip active={theme === 'dark'} onClick={() => setTheme('dark')}>
              Escuro
            </Chip>
            <Chip active={theme === 'light'} onClick={() => setTheme('light')}>
              Claro
            </Chip>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-mut">Registrar esforço como</span>
          <div className="flex gap-2">
            <Chip active={effort === 'rir'} onClick={() => setEffort('rir')}>
              RIR
            </Chip>
            <Chip active={effort === 'rpe'} onClick={() => setEffort('rpe')}>
              RPE
            </Chip>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-mut">Modo sem bloco ativo</span>
          <div className="flex gap-2">
            <Chip active={defaultMode === 'low'} onClick={() => setDefaultMode('low')}>
              Low
            </Chip>
            <Chip active={defaultMode === 'high'} onClick={() => setDefaultMode('high')}>
              High
            </Chip>
          </div>
        </div>
        <Stepper label="Descanso padrão (s)" value={rest} min={0} max={600} step={15} onChange={setRest} />
        <Stepper label="Faixa por subparte — mín. (séries)" value={volMin} min={0} max={volMax} onChange={setVolMin} />
        <Stepper label="Faixa por subparte — máx. (séries)" value={volMax} min={volMin} max={40} onChange={setVolMax} />
      </Card>

      <ModeDefaults />
      <GroupTargetsEditor />
      <Gyms />
      <ReferenceLoad />
      <FitbodImport />
      <RoutineImport />
      <Backup />

      <SectionTitle>Zona de perigo</SectionTitle>
      <Btn
        kind="danger"
        small
        className="w-full"
        onClick={async () => {
          if (!confirm('Apagar TODOS os dados do app (treinos, rotinas, blocos, exercícios personalizados)? Não pode ser desfeito.')) return
          if (prompt('Digite APAGAR para confirmar') !== 'APAGAR') return
          await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
            for (const t of TABLES) await db.table(t).clear()
          })
          location.reload()
        }}
      >
        Apagar todos os dados
      </Btn>
      <p className="pt-2 text-center text-xs text-mut">Treino v0.1 · dados locais, uso offline</p>
    </Page>
  )
}
