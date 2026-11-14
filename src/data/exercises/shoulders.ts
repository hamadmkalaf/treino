import { x } from './helper'

const PRESS = 'delt-lat pec-clav tri-lat tri-med tri-long trap-up serratus'

export const shoulders = [
  // desenvolvimentos
  x('ohp-bb', 'Desenvolvimento militar com barra', 'Barbell Overhead Press', 'barbell', 'vpush', 'M', 'delt-ant', PRESS, 'ohp'),
  x('ohp-db', 'Desenvolvimento com halteres sentado', 'Seated Dumbbell Shoulder Press', 'dumbbell', 'vpush', 'L', 'delt-ant', PRESS, 'ohp'),
  x('ohp-db-standing', 'Desenvolvimento com halteres em pé', 'Standing Dumbbell Press', 'dumbbell', 'vpush', 'L', 'delt-ant', `${PRESS} transverse`, 'ohp'),
  x('ohp-machine', 'Desenvolvimento na máquina', 'Machine Shoulder Press', 'machine', 'vpush', 'M', 'delt-ant', PRESS, 'ohp'),
  x('ohp-plate', 'Desenvolvimento articulado', 'Plate-Loaded Shoulder Press', 'plate', 'vpush', 'M', 'delt-ant', PRESS, 'ohp'),
  x('ohp-smith', 'Desenvolvimento no Smith', 'Smith Machine Shoulder Press', 'smith', 'vpush', 'M', 'delt-ant', PRESS, 'ohp'),
  x('arnold-press', 'Desenvolvimento Arnold', 'Arnold Press', 'dumbbell', 'vpush', 'L', 'delt-ant delt-lat', 'pec-clav tri-lat tri-med trap-up', 'ohp'),
  x('landmine-press', 'Desenvolvimento landmine', 'Landmine Press', 'landmine', 'vpush', 'M', 'delt-ant pec-clav', 'tri-lat tri-med serratus', 'ohp', true),
  x('ohp-kb', 'Desenvolvimento com kettlebell', 'Kettlebell Overhead Press', 'kettlebell', 'vpush', 'M', 'delt-ant', PRESS, 'ohp', true),
  x('pike-pushup', 'Flexão pike', 'Pike Push-Up', 'bodyweight', 'vpush', 'M', 'delt-ant', 'delt-lat tri-lat tri-med trap-up'),
  // elevação lateral
  x('lat-raise-db', 'Elevação lateral com halteres', 'Dumbbell Lateral Raise', 'dumbbell', 'latraise', 'S', 'delt-lat', 'delt-ant trap-up rotator', 'latraise'),
  x('lat-raise-cable', 'Elevação lateral na polia', 'Cable Lateral Raise', 'cable', 'latraise', 'L', 'delt-lat', 'delt-ant trap-up rotator', 'latraise', true),
  x('lat-raise-cable-behind', 'Elevação lateral na polia por trás do corpo', 'Behind-the-Back Cable Lateral Raise', 'cable', 'latraise', 'L', 'delt-lat', 'delt-post trap-up rotator', 'latraise', true),
  x('lat-raise-machine', 'Elevação lateral na máquina', 'Machine Lateral Raise', 'machine', 'latraise', 'M', 'delt-lat', 'trap-up rotator', 'latraise'),
  x('lat-raise-lean', 'Elevação lateral inclinada (lean-away)', 'Lean-Away Dumbbell Lateral Raise', 'dumbbell', 'latraise', 'M', 'delt-lat', 'trap-up rotator', 'latraise', true),
  x('lat-raise-incline', 'Elevação lateral deitado no banco inclinado', 'Incline Side-Lying Lateral Raise', 'dumbbell', 'latraise', 'L', 'delt-lat', 'delt-post rotator', 'latraise', true),
  x('lat-raise-seated', 'Elevação lateral sentado', 'Seated Dumbbell Lateral Raise', 'dumbbell', 'latraise', 'S', 'delt-lat', 'trap-up rotator', 'latraise'),
  x('upright-row-bb', 'Remada alta com barra', 'Barbell Upright Row', 'barbell', 'latraise', 'S', 'delt-lat trap-up', 'delt-ant bi-short brachialis brachiorad', 'upright'),
  x('upright-row-cable', 'Remada alta na polia', 'Cable Upright Row', 'cable', 'latraise', 'M', 'delt-lat trap-up', 'delt-ant bi-short brachialis brachiorad', 'upright'),
  x('upright-row-db', 'Remada alta com halteres', 'Dumbbell Upright Row', 'dumbbell', 'latraise', 'S', 'delt-lat trap-up', 'delt-ant bi-short brachialis', 'upright'),
  // elevação frontal
  x('front-raise-db', 'Elevação frontal com halteres', 'Dumbbell Front Raise', 'dumbbell', 'frontraise', 'S', 'delt-ant', 'pec-clav delt-lat serratus', 'frontraise'),
  x('front-raise-cable', 'Elevação frontal na polia', 'Cable Front Raise', 'cable', 'frontraise', 'L', 'delt-ant', 'pec-clav delt-lat serratus', 'frontraise'),
  x('front-raise-bb', 'Elevação frontal com barra', 'Barbell Front Raise', 'barbell', 'frontraise', 'S', 'delt-ant', 'pec-clav delt-lat serratus', 'frontraise'),
  // posterior
  x('reverse-pec-deck', 'Voador inverso', 'Reverse Pec Deck', 'machine', 'rearfly', 'M', 'delt-post', 'trap-mid rhomb rotator', 'rearfly'),
  x('reverse-fly-db', 'Crucifixo inverso curvado com halteres', 'Bent-Over Dumbbell Reverse Fly', 'dumbbell', 'rearfly', 'S', 'delt-post', 'trap-mid rhomb rotator', 'rearfly'),
  x('reverse-fly-incline', 'Crucifixo inverso no banco inclinado', 'Chest-Supported Reverse Fly', 'dumbbell', 'rearfly', 'S', 'delt-post', 'trap-mid rhomb rotator', 'rearfly'),
  x('reverse-fly-cable', 'Crucifixo inverso na polia (cruzado)', 'Cable Reverse Fly', 'cable', 'rearfly', 'L', 'delt-post', 'trap-mid rhomb rotator', 'rearfly'),
  x('reverse-fly-cable-uni', 'Crucifixo inverso unilateral na polia', 'Single-Arm Cable Rear Delt Fly', 'cable', 'rearfly', 'L', 'delt-post', 'trap-mid rhomb', 'rearfly', true),
  x('face-pull', 'Face pull', 'Face Pull', 'cable', 'rearfly', 'S', 'delt-post trap-mid rotator', 'rhomb trap-low'),
  x('rear-delt-row-db', 'Remada para deltoide posterior com halteres', 'Dumbbell Rear Delt Row', 'dumbbell', 'rearfly', 'S', 'delt-post', 'trap-mid rhomb bi-short brachialis'),
  x('rear-delt-row-machine', 'Remada aberta na máquina (posterior)', 'Machine Rear Delt Row', 'machine', 'rearfly', 'S', 'delt-post trap-mid', 'rhomb brachialis'),
  x('band-pull-apart', 'Abertura com elástico', 'Band Pull-Apart', 'band', 'rearfly', 'S', 'delt-post trap-mid', 'rhomb rotator'),
  // manguito
  x('ext-rot-cable', 'Rotação externa na polia', 'Cable External Rotation', 'cable', 'rotation', 'M', 'rotator', 'delt-post', 'rotation', true),
  x('ext-rot-db', 'Rotação externa deitado com halter', 'Side-Lying Dumbbell External Rotation', 'dumbbell', 'rotation', 'M', 'rotator', 'delt-post', 'rotation', true),
  x('int-rot-cable', 'Rotação interna na polia', 'Cable Internal Rotation', 'cable', 'rotation', 'M', 'rotator', 'pec-stern', 'rotation', true),
  x('cuban-press', 'Cuban press', 'Cuban Press', 'dumbbell', 'rotation', 'M', 'rotator delt-lat', 'delt-post trap-mid'),
]
