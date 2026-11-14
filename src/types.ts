export type Role = 'primary' | 'secondary'
export type Tension = 'lengthened' | 'mid' | 'shortened'
export type Mode = 'low' | 'high'
export type Technique = 'normal' | 'myoreps' | 'dropset' | 'restpause' | 'cluster'

export interface MuscleSubpart {
  id: string
  groupId: string
  pt: string
  en: string
}
export interface MuscleGroup {
  id: string
  pt: string
  en: string
}

export interface Target {
  subpartId: string
  role: Role
}

export interface Exercise {
  id: string
  namePt: string
  nameEn: string
  equipment: string
  pattern: string
  tension: Tension
  targets: Target[]
  unilateral?: boolean
  /** exercícios da mesma família são variações entre si (pegada, ângulo, unilateral) */
  family?: string
  isCustom?: boolean
}

export interface GymProfile {
  id: string
  name: string
  equipment: string[]
}

export interface ModeTarget {
  sets: number
  repMin: number
  repMax: number
  rir?: number
  technique: Technique
}

export interface RoutineItem {
  uid: string
  exerciseId: string
  targets: Record<Mode, ModeTarget>
  restSec: number
  /** itens com a mesma letra formam um superset */
  superset?: string
}

export interface Routine {
  id: string
  name: string
  order: number
  items: RoutineItem[]
}

export interface Block {
  id: string
  name: string
  mode: Mode
  start: string
  end?: string
}

export interface Segment {
  weight: number
  reps: number
}

export interface SetEntry {
  weight: number
  reps: number
  /** reps em reserva; RPE = 10 - RIR */
  rir?: number
  technique: Technique
  /** mini-séries (myoreps), quedas (dropset), blocos (rest-pause / cluster) após a série principal */
  segments?: Segment[]
  failure?: boolean
  partials?: boolean
  negative?: boolean
  tempo?: string
  warmup?: boolean
  done: boolean
}

export interface SessionExercise {
  uid: string
  exerciseId: string
  substitutedFrom?: string
  routineItemUid?: string
  superset?: string
  restSec: number
  target?: ModeTarget
  note?: string
  /** sugestão de progressão calculada ao iniciar a sessão (por índice de série) */
  suggested?: { weight: number; reps: number }[]
  sets: SetEntry[]
}

export interface Session {
  id: string
  start: string
  end?: string
  routineId?: string
  routineName: string
  blockId?: string
  mode: Mode
  notes?: string
  exercises: SessionExercise[]
  /** índice multiEntry para buscar histórico por exercício */
  exerciseIds: string[]
  source?: 'fitbod'
}

export interface ExerciseSettings {
  exerciseId: string
  machine?: string
  note?: string
}

export interface Favorite {
  id: string
  from: string
  to: string
}

export interface Setting {
  key: string
  value: unknown
}
