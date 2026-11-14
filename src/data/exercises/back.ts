import { x } from './helper'

const ARM = 'bi-short bi-long brachialis brachiorad'

export const back = [
  // puxadas verticais
  x('pullup', 'Barra fixa pronada', 'Pull-Up', 'bar', 'vpull', 'L', 'lat-upper lat-lower teres', `rhomb trap-low ${ARM}`, 'pullup'),
  x('chinup', 'Barra fixa supinada', 'Chin-Up', 'bar', 'vpull', 'L', 'lat-lower lat-upper bi-short', 'teres rhomb trap-low bi-long brachialis', 'pullup'),
  x('pullup-neutral', 'Barra fixa pegada neutra', 'Neutral-Grip Pull-Up', 'bar', 'vpull', 'L', 'lat-lower lat-upper brachialis', 'teres rhomb trap-low bi-long bi-short brachiorad', 'pullup'),
  x('pullup-assisted', 'Barra fixa no graviton', 'Assisted Pull-Up Machine', 'machine', 'vpull', 'L', 'lat-upper lat-lower teres', `rhomb trap-low ${ARM}`, 'pullup'),
  x('pulldown-wide', 'Puxada frente aberta', 'Wide-Grip Lat Pulldown', 'cable', 'vpull', 'L', 'lat-upper teres', `lat-lower rhomb trap-low ${ARM}`, 'pulldown'),
  x('pulldown-close', 'Puxada frente com triângulo', 'Close Neutral-Grip Lat Pulldown', 'cable', 'vpull', 'L', 'lat-lower lat-upper', `teres rhomb trap-low ${ARM}`, 'pulldown'),
  x('pulldown-sup', 'Puxada frente supinada', 'Underhand Lat Pulldown', 'cable', 'vpull', 'L', 'lat-lower lat-upper bi-short', 'teres rhomb trap-low bi-long brachialis', 'pulldown'),
  x('pulldown-uni', 'Puxada unilateral na polia', 'Single-Arm Cable Pulldown', 'cable', 'vpull', 'L', 'lat-lower', `lat-upper teres ${ARM}`, 'pulldown', true),
  x('pulldown-plate', 'Puxada articulada', 'Plate-Loaded Pulldown', 'plate', 'vpull', 'M', 'lat-upper lat-lower', `teres rhomb trap-low ${ARM}`, 'pulldown'),
  x('pulldown-machine', 'Puxada na máquina', 'Machine Lat Pulldown', 'machine', 'vpull', 'M', 'lat-upper lat-lower', `teres rhomb trap-low ${ARM}`, 'pulldown'),
  // remadas
  x('row-bb', 'Remada curvada com barra', 'Barbell Bent-Over Row', 'barbell', 'row', 'M', 'lat-upper rhomb trap-mid', `lat-lower teres delt-post erector ${ARM}`, 'row-bb'),
  x('row-bb-sup', 'Remada curvada supinada', 'Underhand Barbell Row', 'barbell', 'row', 'M', 'lat-lower lat-upper', `rhomb trap-mid delt-post erector ${ARM}`, 'row-bb'),
  x('row-pendlay', 'Remada Pendlay', 'Pendlay Row', 'barbell', 'row', 'M', 'rhomb trap-mid lat-upper', `lat-lower delt-post erector ${ARM}`, 'row-bb'),
  x('row-smith', 'Remada curvada no Smith', 'Smith Machine Row', 'smith', 'row', 'M', 'lat-upper rhomb trap-mid', `lat-lower delt-post erector ${ARM}`, 'row-bb'),
  x('row-tbar', 'Remada cavalinho (landmine)', 'Landmine T-Bar Row', 'landmine', 'row', 'M', 'lat-upper lat-lower rhomb', `trap-mid teres delt-post erector ${ARM}`, 'tbar'),
  x('row-tbar-supported', 'Remada cavalinho com apoio de peito', 'Chest-Supported T-Bar Row', 'plate', 'row', 'M', 'rhomb trap-mid lat-upper', `lat-lower teres delt-post ${ARM}`, 'tbar'),
  x('row-db', 'Remada serrote com halter', 'One-Arm Dumbbell Row', 'dumbbell', 'row', 'L', 'lat-lower lat-upper', `teres rhomb trap-mid delt-post ${ARM}`, 'row-db', true),
  x('row-db-incline', 'Remada com halteres no banco inclinado', 'Chest-Supported Dumbbell Row', 'dumbbell', 'row', 'M', 'rhomb trap-mid lat-upper', `lat-lower delt-post ${ARM}`, 'row-db'),
  x('row-seal', 'Remada seal no banco', 'Seal Row', 'barbell', 'row', 'M', 'rhomb trap-mid lat-upper', `lat-lower delt-post ${ARM}`, 'row-bb'),
  x('row-meadows', 'Remada Meadows', 'Meadows Row', 'landmine', 'row', 'L', 'lat-upper teres rhomb', `lat-lower trap-mid delt-post ${ARM}`, 'tbar', true),
  x('row-cable-close', 'Remada baixa com triângulo', 'Seated Cable Row (Close Grip)', 'cable', 'row', 'L', 'lat-lower lat-upper', `rhomb trap-mid teres delt-post erector ${ARM}`, 'row-cable'),
  x('row-cable-wide', 'Remada baixa aberta', 'Seated Cable Row (Wide Grip)', 'cable', 'row', 'M', 'rhomb trap-mid delt-post', `lat-upper teres ${ARM}`, 'row-cable'),
  x('row-cable-uni', 'Remada unilateral na polia', 'Single-Arm Cable Row', 'cable', 'row', 'L', 'lat-lower lat-upper', `rhomb trap-mid teres delt-post ${ARM}`, 'row-cable', true),
  x('row-machine', 'Remada na máquina', 'Machine Seated Row', 'machine', 'row', 'M', 'lat-upper rhomb trap-mid', `lat-lower teres delt-post ${ARM}`, 'row-machine'),
  x('row-plate', 'Remada articulada', 'Plate-Loaded Row', 'plate', 'row', 'M', 'lat-upper lat-lower rhomb', `trap-mid teres delt-post ${ARM}`, 'row-machine'),
  x('row-plate-uni', 'Remada articulada unilateral', 'Single-Arm Plate-Loaded Row', 'plate', 'row', 'L', 'lat-lower lat-upper', `rhomb trap-mid teres delt-post ${ARM}`, 'row-machine', true),
  x('row-plate-high', 'Remada alta articulada (high row)', 'Plate-Loaded High Row', 'plate', 'row', 'L', 'lat-upper teres', `lat-lower rhomb trap-low ${ARM}`, 'row-machine'),
  x('row-inverted', 'Remada invertida', 'Inverted Row', 'bodyweight', 'row', 'S', 'rhomb trap-mid lat-upper', `lat-lower delt-post ${ARM}`),
  x('row-kelso', 'Encolhimento Kelso (retração escapular)', 'Kelso Shrug', 'dumbbell', 'row', 'S', 'trap-mid rhomb', 'trap-low trap-up'),
  // pullover / extensão de ombro
  x('pullover-db', 'Pullover com halter', 'Dumbbell Pullover', 'dumbbell', 'pullover', 'L', 'lat-upper pec-cost', 'lat-lower teres tri-long serratus', 'pullover'),
  x('pullover-machine', 'Pullover na máquina', 'Machine Pullover', 'machine', 'pullover', 'L', 'lat-upper lat-lower', 'teres tri-long pec-cost serratus', 'pullover'),
  x('pulldown-straight', 'Pulldown com braços estendidos', 'Straight-Arm Cable Pulldown', 'cable', 'pullover', 'M', 'lat-lower lat-upper', 'teres tri-long delt-post', 'pullover'),
  x('pullover-cable-uni', 'Pullover unilateral na polia', 'Single-Arm Cable Pullover', 'cable', 'pullover', 'L', 'lat-lower', 'lat-upper teres tri-long', 'pullover', true),
  // lombar
  x('back-ext', 'Hiperextensão 45°', '45° Back Extension', 'bodyweight', 'hinge', 'M', 'erector', 'glute-max bf-long semis', 'backext'),
  x('back-ext-machine', 'Extensão lombar na máquina', 'Machine Back Extension', 'machine', 'hinge', 'S', 'erector', 'glute-max'),
  x('reverse-hyper', 'Hiperextensão reversa', 'Reverse Hyperextension', 'machine', 'hinge', 'S', 'glute-max erector', 'bf-long semis'),
  x('superman', 'Superman', 'Superman', 'bodyweight', 'hinge', 'S', 'erector', 'glute-max trap-low'),
  x('rack-pull', 'Rack pull', 'Rack Pull', 'barbell', 'hinge', 'S', 'erector trap-up', 'glute-max bf-long semis trap-mid rhomb fore-flex'),
  // trapézio
  x('shrug-bb', 'Encolhimento com barra', 'Barbell Shrug', 'barbell', 'shrug', 'S', 'trap-up', 'trap-mid fore-flex', 'shrug'),
  x('shrug-db', 'Encolhimento com halteres', 'Dumbbell Shrug', 'dumbbell', 'shrug', 'S', 'trap-up', 'trap-mid fore-flex', 'shrug'),
  x('shrug-smith', 'Encolhimento no Smith', 'Smith Machine Shrug', 'smith', 'shrug', 'S', 'trap-up', 'trap-mid fore-flex', 'shrug'),
  x('shrug-machine', 'Encolhimento na máquina', 'Machine Shrug', 'plate', 'shrug', 'S', 'trap-up', 'trap-mid', 'shrug'),
  x('shrug-cable', 'Encolhimento na polia', 'Cable Shrug', 'cable', 'shrug', 'L', 'trap-up', 'trap-mid', 'shrug'),
  x('shrug-trapbar', 'Encolhimento com barra hexagonal', 'Trap Bar Shrug', 'trapbar', 'shrug', 'S', 'trap-up', 'trap-mid fore-flex', 'shrug'),
  x('farmer-walk', 'Caminhada do fazendeiro', "Farmer's Walk", 'dumbbell', 'carry', 'M', 'trap-up fore-flex', 'trap-mid obliques transverse glute-med'),
  x('y-raise', 'Elevação em Y no banco inclinado', 'Prone Y-Raise', 'dumbbell', 'rearfly', 'S', 'trap-low', 'trap-mid delt-lat rotator'),
  x('y-raise-cable', 'Elevação em Y na polia', 'Cable Y-Raise', 'cable', 'rearfly', 'M', 'trap-low delt-lat', 'trap-mid delt-post rotator'),
]
