import { x } from './helper'

const PUSH = 'pec-clav pec-cost delt-ant tri-lat tri-med'
const INC = 'pec-stern delt-ant tri-lat tri-med'
const DEC = 'pec-clav delt-ant tri-lat tri-med'

export const chest = [
  // supino reto
  x('bench-bb', 'Supino reto com barra', 'Barbell Bench Press', 'barbell', 'hpush', 'M', 'pec-stern', PUSH, 'bench'),
  x('bench-db', 'Supino reto com halteres', 'Dumbbell Bench Press', 'dumbbell', 'hpush', 'L', 'pec-stern', PUSH, 'bench'),
  x('bench-smith', 'Supino reto no Smith', 'Smith Machine Bench Press', 'smith', 'hpush', 'M', 'pec-stern', PUSH, 'bench'),
  x('bench-machine', 'Supino reto na máquina', 'Machine Chest Press', 'machine', 'hpush', 'M', 'pec-stern', PUSH, 'bench'),
  x('bench-plate', 'Supino reto articulado', 'Plate-Loaded Chest Press', 'plate', 'hpush', 'M', 'pec-stern', PUSH, 'bench'),
  x('bench-cable', 'Supino em pé na polia', 'Standing Cable Chest Press', 'cable', 'hpush', 'S', 'pec-stern', PUSH, 'bench'),
  x('bench-bb-pause', 'Supino reto com pausa', 'Paused Bench Press', 'barbell', 'hpush', 'L', 'pec-stern', PUSH, 'bench'),
  x('floor-press-db', 'Supino no chão com halteres', 'Dumbbell Floor Press', 'dumbbell', 'hpush', 'S', 'pec-stern tri-lat', 'pec-clav delt-ant tri-med', 'bench'),
  // inclinado
  x('incline-bb', 'Supino inclinado com barra', 'Incline Barbell Bench Press', 'barbell', 'ipush', 'M', 'pec-clav', INC, 'incline'),
  x('incline-db', 'Supino inclinado com halteres', 'Incline Dumbbell Press', 'dumbbell', 'ipush', 'L', 'pec-clav', INC, 'incline'),
  x('incline-smith', 'Supino inclinado no Smith', 'Smith Machine Incline Press', 'smith', 'ipush', 'M', 'pec-clav', INC, 'incline'),
  x('incline-machine', 'Supino inclinado na máquina', 'Machine Incline Press', 'machine', 'ipush', 'M', 'pec-clav', INC, 'incline'),
  x('incline-plate', 'Supino inclinado articulado', 'Plate-Loaded Incline Press', 'plate', 'ipush', 'M', 'pec-clav', INC, 'incline'),
  x('incline-db-low', 'Supino inclinado baixo (30°) com halteres', 'Low-Incline Dumbbell Press', 'dumbbell', 'ipush', 'L', 'pec-clav pec-stern', 'delt-ant tri-lat tri-med', 'incline'),
  // declinado e paralelas
  x('decline-bb', 'Supino declinado com barra', 'Decline Barbell Bench Press', 'barbell', 'dpush', 'M', 'pec-cost pec-stern', DEC, 'decline'),
  x('decline-db', 'Supino declinado com halteres', 'Decline Dumbbell Press', 'dumbbell', 'dpush', 'L', 'pec-cost pec-stern', DEC, 'decline'),
  x('decline-machine', 'Supino declinado na máquina', 'Machine Decline Press', 'machine', 'dpush', 'M', 'pec-cost pec-stern', DEC, 'decline'),
  x('dip-chest', 'Paralelas (ênfase peitoral)', 'Chest Dip', 'dips', 'dpush', 'L', 'pec-cost pec-stern', 'delt-ant tri-lat tri-med tri-long', 'dip'),
  x('dip-assisted', 'Paralelas no graviton', 'Assisted Dip Machine', 'machine', 'dpush', 'L', 'pec-cost pec-stern', 'delt-ant tri-lat tri-med tri-long', 'dip'),
  // flexões
  x('pushup', 'Flexão de braço', 'Push-Up', 'bodyweight', 'hpush', 'M', 'pec-stern', 'pec-clav pec-cost delt-ant tri-lat tri-med serratus abs-upper', 'pushup'),
  x('pushup-feet', 'Flexão com pés elevados', 'Decline (Feet-Elevated) Push-Up', 'bodyweight', 'ipush', 'M', 'pec-clav', 'pec-stern delt-ant tri-lat tri-med serratus', 'pushup'),
  x('pushup-hands', 'Flexão com mãos elevadas', 'Incline (Hands-Elevated) Push-Up', 'bodyweight', 'dpush', 'M', 'pec-cost pec-stern', 'delt-ant tri-lat tri-med', 'pushup'),
  x('pushup-deficit', 'Flexão com déficit', 'Deficit Push-Up', 'bodyweight', 'hpush', 'L', 'pec-stern', 'pec-clav pec-cost delt-ant tri-lat tri-med serratus', 'pushup'),
  x('pushup-knees', 'Flexão de joelhos', 'Knee Push-Up', 'bodyweight', 'hpush', 'M', 'pec-stern', 'pec-clav delt-ant tri-lat tri-med', 'pushup'),
  x('pushup-plus', 'Flexão plus (protração escapular)', 'Push-Up Plus', 'bodyweight', 'hpush', 'S', 'serratus', 'pec-stern delt-ant'),
  // crucifixos
  x('fly-db', 'Crucifixo reto com halteres', 'Dumbbell Fly', 'dumbbell', 'fly', 'L', 'pec-stern', 'pec-clav pec-cost delt-ant bi-short', 'fly'),
  x('fly-db-incline', 'Crucifixo inclinado com halteres', 'Incline Dumbbell Fly', 'dumbbell', 'fly', 'L', 'pec-clav', 'pec-stern delt-ant bi-short', 'fly'),
  x('pec-deck', 'Voador (peck deck)', 'Pec Deck Fly', 'machine', 'fly', 'M', 'pec-stern', 'pec-clav pec-cost delt-ant', 'fly'),
  x('crossover-mid', 'Crossover na polia média', 'Cable Crossover (Mid)', 'cable', 'fly', 'M', 'pec-stern', 'pec-clav pec-cost delt-ant', 'crossover'),
  x('crossover-high', 'Crossover polia alta (de cima para baixo)', 'High-to-Low Cable Fly', 'cable', 'fly', 'S', 'pec-cost', 'pec-stern delt-ant', 'crossover'),
  x('crossover-low', 'Crossover polia baixa (de baixo para cima)', 'Low-to-High Cable Fly', 'cable', 'fly', 'S', 'pec-clav', 'pec-stern delt-ant', 'crossover'),
  x('fly-cable-seated', 'Crucifixo sentado na polia', 'Seated Cable Fly', 'cable', 'fly', 'L', 'pec-stern', 'pec-clav pec-cost delt-ant', 'crossover'),
  x('fly-cable-uni', 'Crucifixo unilateral na polia', 'Single-Arm Cable Fly', 'cable', 'fly', 'M', 'pec-stern', 'pec-clav pec-cost delt-ant', 'crossover', true),
  x('fly-cable-lying', 'Crucifixo deitado na polia', 'Lying Cable Fly', 'cable', 'fly', 'L', 'pec-stern', 'pec-clav delt-ant', 'crossover'),
  x('serratus-punch', 'Soco de serrátil na polia', 'Cable Serratus Punch', 'cable', 'hpush', 'S', 'serratus', 'pec-stern delt-ant', undefined, true),
]
