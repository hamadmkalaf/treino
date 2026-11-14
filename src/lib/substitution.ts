import type { Exercise } from '../types'

/**
 * Semelhança entre dois exercícios (0 a ~1,3).
 * Peso maior para coincidência de subpartes primárias, depois secundárias,
 * com bônus por mesmo padrão de movimento, mesmo perfil de tensão e mesma família.
 */
export function similarity(a: Exercise, b: Exercise): number {
  const role = Object.fromEntries(b.targets.map((t) => [t.subpartId, t.role]))
  let got = 0
  let max = 0
  for (const t of a.targets) {
    const r = role[t.subpartId]
    if (t.role === 'primary') {
      max += 3
      got += r === 'primary' ? 3 : r === 'secondary' ? 1 : 0
    } else {
      max += 0.5
      got += r ? 0.5 : 0
    }
  }
  if (!max) return 0
  // penaliza substitutos cujo foco primário está em músculos que o original não treina
  const aIds = new Set(a.targets.map((t) => t.subpartId))
  const bPrim = b.targets.filter((t) => t.role === 'primary')
  const foreign = bPrim.length ? bPrim.filter((t) => !aIds.has(t.subpartId)).length / bPrim.length : 0
  let score = (got / max) * (1 - 0.4 * foreign)
  if (a.pattern === b.pattern) score += 0.15
  if (a.tension === b.tension) score += 0.1
  if (a.family && a.family === b.family) score += 0.05
  return score
}

export interface Substitute {
  exercise: Exercise
  score: number
  favorite: boolean
}

export function rankSubstitutes(
  ex: Exercise,
  all: Exercise[],
  opts: { equipment?: Set<string>; favorites?: string[]; limit?: number; exclude?: string[] } = {},
): Substitute[] {
  const fav = new Set(opts.favorites ?? [])
  const skip = new Set([ex.id, ...(opts.exclude ?? [])])
  return all
    .filter((c) => !skip.has(c.id))
    .filter((c) => fav.has(c.id) || !opts.equipment || opts.equipment.has(c.equipment))
    .map((c) => ({ exercise: c, score: similarity(ex, c), favorite: fav.has(c.id) }))
    .filter((s) => s.favorite || s.score >= 0.35)
    .sort((x, y) => Number(y.favorite) - Number(x.favorite) || y.score - x.score)
    .slice(0, opts.limit ?? 12)
}
