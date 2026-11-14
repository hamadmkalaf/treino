import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { cx } from './components/ui'
import { useSetting } from './db/hooks'
import { addRest, clock, stopRest, useRest } from './lib/timer'
import Analytics from './pages/Analytics'
import ExerciseDetail from './pages/ExerciseDetail'
import ExerciseEdit from './pages/ExerciseEdit'
import History from './pages/History'
import Library from './pages/Library'
import RoutineEdit from './pages/RoutineEdit'
import Routines from './pages/Routines'
import SessionPage from './pages/Session'
import Settings from './pages/Settings'
import Today from './pages/Today'

const TABS = [
  { to: '/', label: 'Hoje', icon: '◉' },
  { to: '/biblioteca', label: 'Exercícios', icon: '☰' },
  { to: '/rotinas', label: 'Rotinas', icon: '▤' },
  { to: '/historico', label: 'Histórico', icon: '▦' },
  { to: '/analises', label: 'Análises', icon: '◔' },
]

function RestBar() {
  const rest = useRest()
  if (!rest) return null
  const pct = Math.max(0, Math.min(100, (rest.left / rest.total) * 100))
  return (
    <div className="mx-auto max-w-xl px-3 pb-2">
      <div className="overflow-hidden rounded-2xl border border-acc/50 bg-card shadow-lg">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-mut">Descanso</span>
          <span className="num flex-1 text-2xl font-bold text-acc">{clock(rest.left)}</span>
          <button className="h-10 rounded-lg bg-card2 px-3 text-sm" onClick={() => addRest(-15)}>
            −15s
          </button>
          <button className="h-10 rounded-lg bg-card2 px-3 text-sm" onClick={() => addRest(15)}>
            +15s
          </button>
          <button className="h-10 rounded-lg bg-card2 px-3 text-sm" onClick={stopRest}>
            Pular
          </button>
        </div>
        <div className="h-1 bg-card2">
          <div className="h-full bg-acc transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [theme] = useSetting<'dark' | 'light'>('theme', 'dark')
  const { pathname } = useLocation()
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f3f5f8' : '#0b0f14')
  }, [theme])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const inSession = pathname.startsWith('/sessao')

  return (
    <>
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/sessao/:id" element={<SessionPage />} />
        <Route path="/biblioteca" element={<Library />} />
        <Route path="/exercicio/novo" element={<ExerciseEdit />} />
        <Route path="/exercicio/:id" element={<ExerciseDetail />} />
        <Route path="/exercicio/:id/editar" element={<ExerciseEdit />} />
        <Route path="/rotinas" element={<Routines />} />
        <Route path="/rotina/:id" element={<RoutineEdit />} />
        <Route path="/historico" element={<History />} />
        <Route path="/analises" element={<Analytics />} />
        <Route path="/ajustes" element={<Settings />} />
      </Routes>
      <div className="fixed inset-x-0 bottom-0 z-30">
        <RestBar />
        {!inSession && (
          <nav className="safe-b border-t border-line bg-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-xl">
              {TABS.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.to === '/'}
                  className={({ isActive }) =>
                    cx('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', isActive ? 'text-acc' : 'text-mut')
                  }
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  {t.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </>
  )
}
