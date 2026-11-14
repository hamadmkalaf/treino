import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { SEED_EXERCISES } from '../data/exercises'
import type { Block, Exercise, GymProfile, Routine, Session } from '../types'
import { db, setSetting } from './db'

const SEED_IDS = new Set(SEED_EXERCISES.map((e) => e.id))
export const isSeedId = (id: string) => SEED_IDS.has(id)

/** biblioteca completa: sementes + personalizados (registros no banco sobrepõem a semente de mesmo id) */
export function useExercises() {
  const custom = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[])
  return useMemo(() => {
    const byId: Record<string, Exercise> = {}
    for (const e of SEED_EXERCISES) byId[e.id] = e
    for (const e of custom) byId[e.id] = e
    const list = Object.values(byId).sort((a, b) => a.namePt.localeCompare(b.namePt, 'pt'))
    return { list, byId }
  }, [custom])
}

export function useSetting<T>(key: string, fallback: T): [T, (v: T) => void] {
  const value = useLiveQuery(async () => (await db.settings.get(key))?.value as T | undefined, [key])
  return [value === undefined ? fallback : value, (v: T) => void setSetting(key, v)]
}

export function useRoutines(): Routine[] {
  return useLiveQuery(() => db.routines.orderBy('order').toArray(), [], [] as Routine[])
}

export function useBlocks(): Block[] {
  return useLiveQuery(async () => (await db.blocks.orderBy('start').toArray()).reverse(), [], [] as Block[])
}

export const activeBlockOf = (blocks: Block[]) => blocks.find((b) => !b.end)

/** sessões concluídas, mais recentes primeiro */
export function useSessions(): Session[] {
  return useLiveQuery(
    async () => (await db.sessions.orderBy('start').toArray()).filter((s) => s.end).reverse(),
    [],
    [] as Session[],
  )
}

export function useExerciseSessions(exerciseId: string | undefined): Session[] {
  return useLiveQuery(
    async () =>
      exerciseId
        ? (await db.sessions.where('exerciseIds').equals(exerciseId).toArray())
            .filter((s) => s.end)
            .sort((a, b) => b.start.localeCompare(a.start))
        : [],
    [exerciseId],
    [] as Session[],
  )
}

export function useActiveGym(): { gyms: GymProfile[]; active?: GymProfile; equipment?: Set<string> } {
  const gyms = useLiveQuery(() => db.gyms.toArray(), [], [] as GymProfile[])
  const [activeId] = useSetting<string>('activeGymId', '')
  return useMemo(() => {
    const active = gyms.find((g) => g.id === activeId) ?? gyms[0]
    return { gyms, active, equipment: active ? new Set(active.equipment) : undefined }
  }, [gyms, activeId])
}

export function useFavorites(from: string | undefined): string[] {
  return useLiveQuery(
    async () => (from ? (await db.favorites.where('from').equals(from).toArray()).map((f) => f.to) : []),
    [from],
    [] as string[],
  )
}

export async function toggleFavorite(from: string, to: string) {
  const id = `${from}>${to}`
  if (await db.favorites.get(id)) await db.favorites.delete(id)
  else await db.favorites.put({ id, from, to })
}
