import { db, TABLES } from '../db/db'

export interface Backup {
  app: 'treino'
  version: 1
  exportedAt: string
  tables: Record<string, unknown[]>
}

export async function exportBackup(): Promise<Backup> {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLES) tables[name] = await db.table(name).toArray()
  return { app: 'treino', version: 1, exportedAt: new Date().toISOString(), tables }
}

export function validateBackup(data: unknown): Backup {
  const b = data as Backup
  if (!b || b.app !== 'treino' || typeof b.tables !== 'object') throw new Error('Arquivo de backup inválido.')
  for (const name of TABLES) if (b.tables[name] && !Array.isArray(b.tables[name])) throw new Error('Backup corrompido.')
  return b
}

/** substitui todos os dados do app pelo conteúdo do backup */
export async function importBackup(data: unknown) {
  const b = validateBackup(data)
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const name of TABLES) {
      await db.table(name).clear()
      if (b.tables[name]?.length) await db.table(name).bulkPut(b.tables[name])
    }
  })
}

export function download(filename: string, data: string | Uint8Array, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
