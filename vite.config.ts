import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Gera dist/sw.js a partir de src/sw.js, injetando a lista de arquivos do build
 * (pré-cache para uso offline). Substitui o vite-plugin-pwa, que depende de um
 * binário nativo do Rollup bloqueado neste computador.
 */
function serviceWorker(): Plugin {
  return {
    name: 'treino-sw',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const entries: { url: string; revision: string | null }[] = []
      const rev = (data: string | Uint8Array) => createHash('sha1').update(data).digest('hex').slice(0, 10)
      for (const [name, file] of Object.entries(bundle)) {
        if (name.endsWith('.map')) continue
        const hashed = name.startsWith('assets/')
        entries.push({ url: name, revision: hashed ? null : rev(file.type === 'asset' ? file.source : file.code) })
      }
      for (const name of readdirSync('public')) entries.push({ url: name, revision: rev(readFileSync(`public/${name}`)) })
      const source = readFileSync('src/sw.js', 'utf8').replace('self.__WB_MANIFEST', JSON.stringify(entries))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

export default defineConfig({
  // caminho relativo: funciona em GitHub Pages (subpasta), Netlify e Vercel
  base: './',
  plugins: [react(), tailwindcss(), serviceWorker()],
  test: { environment: 'node' },
})
