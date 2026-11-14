import type { Exercise } from '../../types'
import { chest } from './chest'
import { back } from './back'
import { shoulders } from './shoulders'
import { arms } from './arms'
import { legs } from './legs'
import { core } from './core'

export const SEED_EXERCISES: Exercise[] = [...chest, ...back, ...shoulders, ...arms, ...legs, ...core]
