import { Link, useNavigate } from 'react-router-dom'
import { ExerciseList } from '../components/exercise'
import { Page } from '../components/ui'

export default function Library() {
  const nav = useNavigate()
  return (
    <Page
      title="Exercícios"
      right={
        <Link to="/exercicio/novo" className="rounded-xl bg-card2 px-3 py-2 text-sm">
          + Novo
        </Link>
      }
    >
      <ExerciseList onPick={(ex) => nav(`/exercicio/${ex.id}`)} />
    </Page>
  )
}
