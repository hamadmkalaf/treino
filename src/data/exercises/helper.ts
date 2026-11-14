import type { Exercise, Tension } from '../../types'

const T: Record<string, Tension> = { L: 'lengthened', M: 'mid', S: 'shortened' }
const split = (v: string) => v.split(' ').filter(Boolean)

/**
 * Definição compacta de exercício.
 * prim / sec: ids de subpartes separados por espaço. tension: L (alongado), M (médio), S (encurtado).
 */
export function x(
  id: string,
  namePt: string,
  nameEn: string,
  equipment: string,
  pattern: string,
  tension: 'L' | 'M' | 'S',
  prim: string,
  sec = '',
  family?: string,
  unilateral?: boolean,
): Exercise {
  return {
    id,
    namePt,
    nameEn,
    equipment,
    pattern,
    tension: T[tension],
    targets: [
      ...split(prim).map((subpartId) => ({ subpartId, role: 'primary' as const })),
      ...split(sec).map((subpartId) => ({ subpartId, role: 'secondary' as const })),
    ],
    ...(family ? { family } : {}),
    ...(unilateral ? { unilateral } : {}),
  }
}
