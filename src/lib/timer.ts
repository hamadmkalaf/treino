import { useEffect, useState, useSyncExternalStore } from 'react'

/** cronômetro de descanso global, persistido para sobreviver a recarregamentos */
interface Rest {
  end: number
  total: number
}
const KEY = 'treino.rest'
let state: Rest | null = load()
const listeners = new Set<() => void>()

function load(): Rest | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Rest | null
    return v && v.end > Date.now() ? v : null
  } catch {
    return null
  }
}
function set(v: Rest | null) {
  state = v
  try {
    if (v) localStorage.setItem(KEY, JSON.stringify(v))
    else localStorage.removeItem(KEY)
  } catch {
    /* armazenamento indisponível */
  }
  listeners.forEach((l) => l())
}

export const startRest = (seconds: number) => {
  if (seconds > 0) set({ end: Date.now() + seconds * 1000, total: seconds })
}
export const stopRest = () => set(null)
export const addRest = (seconds: number) => {
  if (state) set({ end: state.end + seconds * 1000, total: Math.max(1, state.total + seconds) })
}

function alertDone() {
  try {
    navigator.vibrate?.([200, 100, 200])
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    /* sem áudio */
  }
}

/** segundos restantes e total do descanso atual (null se não há descanso) */
export function useRest(): { left: number; total: number } | null {
  const rest = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
  const [, tick] = useState(0)
  useEffect(() => {
    if (!rest) return
    const id = setInterval(() => {
      if (Date.now() >= rest.end) {
        alertDone()
        stopRest()
      } else tick((n) => n + 1)
    }, 250)
    return () => clearInterval(id)
  }, [rest])
  if (!rest) return null
  return { left: Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)), total: rest.total }
}

export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`
