import type { Exercise, Session } from '../types'
import { setReps, workingSets } from './volume'

/** métrica do volume semanal: séries ou repetições (ponderadas pelo papel do músculo) */
export type VolumeMetric = 'sets' | 'reps'

export interface Range {
  min: number
  max: number
}

/**
 * Alvos personalizados por grupo muscular, guardados na chave de ajuste "volTargets".
 * Grupo sem entrada usa o alvo geral da métrica (séries: volMin/volMax de Ajustes; reps: padrão abaixo).
 */
export type VolumeTargets = Partial<Record<VolumeMetric, Record<string, Range>>>

/** padrão de repetições semanais ≈ faixa de séries × 10 reps (estimativa; ajustável) */
export const DEFAULT_REPS: Range = { min: 40, max: 120 }

export const METRIC_LIMITS: Record<VolumeMetric, { max: number; step: number }> = {
  sets: { max: 40, step: 1 },
  reps: { max: 600, step: 10 },
}

/** devolve o alvo do grupo, caindo no alvo geral; corrige valores incoerentes */
export function targetFor(targets: VolumeTargets | undefined, metric: VolumeMetric, groupId: string, general: Range): Range {
  const t = targets?.[metric]?.[groupId]
  if (!t || !Number.isFinite(t.min) || !Number.isFinite(t.max)) return general
  const min = Math.max(0, t.min)
  return { min, max: Math.max(min, t.max) }
}

export const isCustom = (targets: VolumeTargets | undefined, metric: VolumeMetric, groupId: string) => !!targets?.[metric]?.[groupId]

/** grava (ou remove, com range = null) o alvo de um grupo sem tocar nos demais */
export function withTarget(targets: VolumeTargets | undefined, metric: VolumeMetric, groupId: string, range: Range | null): VolumeTargets {
  const next: VolumeTargets = { ...targets, [metric]: { ...targets?.[metric] } }
  if (range) next[metric]![groupId] = { min: Math.max(0, range.min), max: Math.max(range.min, range.max) }
  else delete next[metric]![groupId]
  return next
}

/** repetições por subparte (séries válidas, mini-séries incluídas): primário conta 1×, secundário 0,5× */
export function subpartReps(sessions: Session[], exById: Record<string, Exercise>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const session of sessions) {
    for (const se of session.exercises) {
      const ex = exById[se.exerciseId]
      if (!ex) continue
      const reps = workingSets(se).reduce((a, s) => a + setReps(s), 0)
      if (!reps) continue
      for (const t of ex.targets) out[t.subpartId] = (out[t.subpartId] ?? 0) + reps * (t.role === 'primary' ? 1 : 0.5)
    }
  }
  return out
}
