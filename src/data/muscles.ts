import type { MuscleGroup, MuscleSubpart, Tension } from '../types'

export const GROUPS: MuscleGroup[] = [
  { id: 'chest', pt: 'Peitoral', en: 'Chest' },
  { id: 'back', pt: 'Costas', en: 'Back' },
  { id: 'traps', pt: 'Trapézio', en: 'Traps' },
  { id: 'shoulders', pt: 'Ombros', en: 'Shoulders' },
  { id: 'biceps', pt: 'Bíceps', en: 'Biceps' },
  { id: 'triceps', pt: 'Tríceps', en: 'Triceps' },
  { id: 'forearms', pt: 'Antebraço', en: 'Forearms' },
  { id: 'quads', pt: 'Quadríceps', en: 'Quads' },
  { id: 'hams', pt: 'Posteriores de coxa', en: 'Hamstrings' },
  { id: 'glutes', pt: 'Glúteos', en: 'Glutes' },
  { id: 'hips', pt: 'Adutores e quadril', en: 'Adductors & Hips' },
  { id: 'calves', pt: 'Panturrilha e canela', en: 'Calves & Shins' },
  { id: 'core', pt: 'Core', en: 'Core' },
]

const s = (id: string, groupId: string, pt: string, en: string): MuscleSubpart => ({ id, groupId, pt, en })

export const SUBPARTS: MuscleSubpart[] = [
  s('pec-clav', 'chest', 'Peitoral clavicular (superior)', 'Clavicular (upper) pec'),
  s('pec-stern', 'chest', 'Peitoral esternal (médio)', 'Sternal (mid) pec'),
  s('pec-cost', 'chest', 'Peitoral costal (inferior)', 'Costal (lower) pec'),
  s('serratus', 'chest', 'Serrátil anterior', 'Serratus anterior'),

  s('lat-upper', 'back', 'Dorsal — fibras superiores', 'Lats — upper fibers'),
  s('lat-lower', 'back', 'Dorsal — fibras inferiores', 'Lats — lower fibers'),
  s('teres', 'back', 'Redondo maior', 'Teres major'),
  s('rhomb', 'back', 'Romboides', 'Rhomboids'),
  s('erector', 'back', 'Eretores da espinha', 'Spinal erectors'),

  s('trap-up', 'traps', 'Trapézio superior', 'Upper traps'),
  s('trap-mid', 'traps', 'Trapézio médio', 'Mid traps'),
  s('trap-low', 'traps', 'Trapézio inferior', 'Lower traps'),

  s('delt-ant', 'shoulders', 'Deltoide anterior', 'Front delt'),
  s('delt-lat', 'shoulders', 'Deltoide lateral', 'Side delt'),
  s('delt-post', 'shoulders', 'Deltoide posterior', 'Rear delt'),
  s('rotator', 'shoulders', 'Manguito rotador', 'Rotator cuff'),

  s('bi-long', 'biceps', 'Bíceps — cabeça longa', 'Biceps long head'),
  s('bi-short', 'biceps', 'Bíceps — cabeça curta', 'Biceps short head'),
  s('brachialis', 'biceps', 'Braquial', 'Brachialis'),

  s('tri-long', 'triceps', 'Tríceps — cabeça longa', 'Triceps long head'),
  s('tri-lat', 'triceps', 'Tríceps — cabeça lateral', 'Triceps lateral head'),
  s('tri-med', 'triceps', 'Tríceps — cabeça medial', 'Triceps medial head'),

  s('brachiorad', 'forearms', 'Braquiorradial', 'Brachioradialis'),
  s('fore-flex', 'forearms', 'Flexores do punho', 'Wrist flexors'),
  s('fore-ext', 'forearms', 'Extensores do punho', 'Wrist extensors'),

  s('rectus-fem', 'quads', 'Reto femoral', 'Rectus femoris'),
  s('vastus-lat', 'quads', 'Vasto lateral', 'Vastus lateralis'),
  s('vastus-med', 'quads', 'Vasto medial', 'Vastus medialis'),
  s('vastus-int', 'quads', 'Vasto intermédio', 'Vastus intermedius'),

  s('bf-long', 'hams', 'Bíceps femoral — cabeça longa', 'Biceps femoris long head'),
  s('bf-short', 'hams', 'Bíceps femoral — cabeça curta', 'Biceps femoris short head'),
  s('semis', 'hams', 'Semitendíneo e semimembranáceo', 'Semitendinosus & semimembranosus'),

  s('glute-max', 'glutes', 'Glúteo máximo', 'Gluteus maximus'),
  s('glute-med', 'glutes', 'Glúteo médio e mínimo', 'Gluteus medius & minimus'),

  s('adductor', 'hips', 'Adutores', 'Adductors'),
  s('hip-flex', 'hips', 'Flexores do quadril', 'Hip flexors'),

  s('gastroc', 'calves', 'Gastrocnêmio', 'Gastrocnemius'),
  s('soleus', 'calves', 'Sóleo', 'Soleus'),
  s('tibialis', 'calves', 'Tibial anterior', 'Tibialis anterior'),

  s('abs-upper', 'core', 'Reto abdominal — superior', 'Upper abs'),
  s('abs-lower', 'core', 'Reto abdominal — inferior', 'Lower abs'),
  s('obliques', 'core', 'Oblíquos', 'Obliques'),
  s('transverse', 'core', 'Transverso do abdômen', 'Transverse abdominis'),
]

export const SUBPART_BY_ID: Record<string, MuscleSubpart> = Object.fromEntries(SUBPARTS.map((x) => [x.id, x]))
export const GROUP_BY_ID: Record<string, MuscleGroup> = Object.fromEntries(GROUPS.map((x) => [x.id, x]))

export const EQUIPMENT: { id: string; pt: string }[] = [
  { id: 'barbell', pt: 'Barra' },
  { id: 'ezbar', pt: 'Barra W / EZ' },
  { id: 'dumbbell', pt: 'Halteres' },
  { id: 'kettlebell', pt: 'Kettlebell' },
  { id: 'cable', pt: 'Cabo / polia' },
  { id: 'machine', pt: 'Máquina (placas guiadas)' },
  { id: 'plate', pt: 'Máquina articulada (anilhas)' },
  { id: 'smith', pt: 'Smith' },
  { id: 'trapbar', pt: 'Barra hexagonal' },
  { id: 'landmine', pt: 'Landmine' },
  { id: 'bar', pt: 'Barra fixa' },
  { id: 'dips', pt: 'Paralelas' },
  { id: 'band', pt: 'Elástico' },
  { id: 'bodyweight', pt: 'Peso do corpo' },
]
export const EQUIP_LABEL: Record<string, string> = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e.pt]))

export const PATTERNS: Record<string, string> = {
  hpush: 'Empurrar horizontal',
  ipush: 'Empurrar inclinado',
  dpush: 'Empurrar declinado / paralelas',
  vpush: 'Empurrar vertical',
  fly: 'Crucifixo / adução',
  row: 'Remada',
  vpull: 'Puxada vertical',
  pullover: 'Pullover / extensão de ombro',
  shrug: 'Encolhimento',
  latraise: 'Elevação lateral',
  frontraise: 'Elevação frontal',
  rearfly: 'Abdução horizontal (posterior)',
  rotation: 'Rotação de ombro',
  curl: 'Flexão de cotovelo',
  triext: 'Extensão de cotovelo acima da cabeça / testa',
  pushdown: 'Extensão de cotovelo (pushdown)',
  wrist: 'Punho / pegada',
  squat: 'Agachamento',
  lunge: 'Afundo / unilateral',
  legpress: 'Leg press',
  legext: 'Extensão de joelho',
  hinge: 'Dobradiça de quadril',
  legcurl: 'Flexão de joelho',
  thrust: 'Extensão de quadril',
  abduction: 'Abdução de quadril',
  adduction: 'Adução de quadril',
  calf: 'Flexão plantar',
  shin: 'Dorsiflexão',
  crunch: 'Flexão de tronco',
  legraise: 'Elevação de pernas',
  plank: 'Anti-extensão',
  twist: 'Rotação / anti-rotação',
  carry: 'Carregar',
}

export const TENSION_LABEL: Record<Tension, string> = {
  lengthened: 'Ênfase em alongamento',
  mid: 'Ênfase no meio da amplitude',
  shortened: 'Ênfase em encurtamento',
}
export const TENSION_SHORT: Record<Tension, string> = {
  lengthened: 'Alongado',
  mid: 'Médio',
  shortened: 'Encurtado',
}

export const TECHNIQUE_LABEL = {
  normal: 'Normal',
  myoreps: 'Myo-reps',
  dropset: 'Drop-set',
  restpause: 'Rest-pause',
  cluster: 'Cluster',
} as const

export const MODE_LABEL = { low: 'Low volume', high: 'High volume' } as const
