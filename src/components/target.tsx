import { TECHNIQUE_LABEL } from '../data/muscles'
import type { ModeTarget, Technique } from '../types'
import { Chip, Stepper } from './ui'

export const targetText = (t: ModeTarget) =>
  `${t.sets} × ${t.repMin}–${t.repMax}${t.rir !== undefined ? ` · RIR ${t.rir}` : ''}${t.technique !== 'normal' ? ` · ${TECHNIQUE_LABEL[t.technique]}` : ''}`

export function TargetEditor({ value, onChange }: { value: ModeTarget; onChange: (t: ModeTarget) => void }) {
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
