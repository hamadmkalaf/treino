import Dexie, { type Table } from 'dexie'
import type {
  Block,
  Exercise,
  ExerciseSettings,
  Favorite,
  GymProfile,
  Mode,
  ModeTarget,
  Routine,
  Session,
  Setting,
} from '../types'
import { EQUIPMENT } from '../data/muscles'

class TreinoDB extends Dexie {
  /** exercícios personalizados e edições de exercícios da biblioteca (mesmo id sobrepõe a semente) */
  exercises!: Table<Exercise, string>
  gyms!: Table<GymProfile, string>
  routines!: Table<Routine, string>
  blocks!: Table<Block, string>
  sessions!: Table<Session, string>
  exerciseSettings!: Table<ExerciseSettings, string>
  favorites!: Table<Favorite, string>
  settings!: Table<Setting, string>

  constructor() {
    super('treino')
    this.version(1).stores({
      exercises: 'id',
      gyms: 'id',
      routines: 'id, order',
      blocks: 'id, start',
      sessions: 'id, start, *exerciseIds',
      exerciseSettings: 'exerciseId',
      favorites: 'id, from',
      settings: 'key',
    })
  }
}

export const db = new TreinoDB()

export const TABLES = [
  'exercises',
  'gyms',
  'routines',
  'blocks',
  'sessions',
  'exerciseSettings',
  'favorites',
  'settings',
] as const

export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value })

export const DEFAULT_TARGETS: Record<Mode, ModeTarget> = {
  low: { sets: 2, repMin: 6, repMax: 10, rir: 0, technique: 'normal' },
  high: { sets: 4, repMin: 8, repMax: 12, rir: 2, technique: 'normal' },
}

/** cria o programa inicial (A, B, C, Upper, Lower) e um perfil de academia com tudo disponível */
export async function ensureSeed() {
  if (await getSetting('seeded', false)) return
  await db.transaction('rw', db.routines, db.gyms, db.settings, async () => {
    if (await getSetting('seeded', false)) return
    const names = ['Treino A', 'Treino B', 'Treino C', 'Upper', 'Lower']
    await db.routines.bulkPut(names.map((name, order) => ({ id: uid(), name, order, items: [] })))
    const gymId = uid()
    await db.gyms.put({ id: gymId, name: 'Minha academia', equipment: EQUIPMENT.map((e) => e.id) })
    await setSetting('activeGymId', gymId)
    await setSetting('seeded', true)
  })
}
