import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ExercisePoint } from '../lib/volume'

const short = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

/** gráfico de linha de uma métrica do exercício ao longo das sessões */
export function ExerciseChart({ points, metric, unit }: { points: ExercisePoint[]; metric: keyof ExercisePoint; unit: string }) {
  const data = points.map((p) => ({ ...p, label: short(p.date) }))
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--mut)', fontSize: 11 }} stroke="var(--line)" minTickGap={24} />
          <YAxis tick={{ fill: 'var(--mut)', fontSize: 11 }} stroke="var(--line)" domain={['auto', 'auto']} width={52} />
          <Tooltip
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--fg)' }}
            labelStyle={{ color: 'var(--mut)' }}
            formatter={(v) => [`${String(v).replace('.', ',')} ${unit}`, '']}
            separator=""
          />
          <Line type="monotone" dataKey={metric} stroke="var(--acc)" strokeWidth={2} dot={{ r: 3, fill: 'var(--acc)' }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
