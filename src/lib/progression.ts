import type { ModeTarget, SetEntry } from '../types'

/** menor incremento de carga usual por tipo de equipamento (kg) */
export function increment(equipment: string): number {
  switch (equipment) {
    case 'dumbbell':
    case 'kettlebell':
      return 2
    case 'cable':
    case 'machine':
      return 2.5
    case 'bodyweight':
    case 'bar':
    case 'dips':
    case 'band':
      return 0
    default:
      return 2.5
  }
}

export interface Suggestion {
  weight: number
  reps: number
}

/**
 * Dupla progressão: se todas as séries da última sessão bateram o topo da faixa de reps,
 * sobe a carga e volta para o mínimo da faixa; caso contrário mantém a carga e pede +1 rep.
 * Sem alvo definido, sugere repetir a última sessão com +1 rep.
 */
export function suggest(last: SetEntry[] | undefined, target: ModeTarget | undefined, equipment: string): Suggestion[] {
  const prev = (last ?? []).filter((s) => s.done && !s.warmup)
  if (!prev.length) return []
  const count = target?.sets ?? prev.length
  const at = (i: number) => prev[Math.min(i, prev.length - 1)]

  if (!target) return Array.from({ length: count }, (_, i) => ({ weight: at(i).weight, reps: at(i).reps + 1 }))

  const inc = increment(equipment)
  const allTop = prev.every((s) => s.reps >= target.repMax)
  return Array.from({ length: count }, (_, i) => {
    const p = at(i)
    if (allTop && inc > 0) return { weight: p.weight + inc, reps: target.repMin }
    if (allTop) return { weight: p.weight, reps: p.reps + 1 }
    return { weight: p.weight, reps: Math.min(Math.max(p.reps + 1, target.repMin), target.repMax) }
  })
}
