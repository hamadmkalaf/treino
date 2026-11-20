# Treino

PWA pessoal de registro de treino de musculação. Funciona offline; os dados ficam só no aparelho (IndexedDB), com backup por arquivo JSON.

## Comandos

```bash
npm run dev      # desenvolvimento
npm run test     # testes da lógica (volume, progressão, substituição, importação, backup)
npm run build    # gera dist/ (site estático + service worker)
npm run preview  # serve dist/ localmente
npm run publicar # compila e envia o site para a branch gh-pages (GitHub Pages)
```

## Publicar

`dist/` é um site estático com caminhos relativos: serve em GitHub Pages, Netlify ou Vercel sem configuração.
Depois de publicar, abra o link no celular e use "Adicionar à tela inicial" para instalar.

## Estrutura

- `src/data/` — taxonomia muscular (grupo → subparte) e biblioteca de exercícios (~270)
- `src/lib/` — lógica pura e testes
- `src/db/` — banco local (Dexie), ações e hooks
- `src/pages/` — telas
- `src/sw.js` — service worker (pré-cache); a lista de arquivos é injetada por um plugin em `vite.config.ts`

## Low / high volume e alvos semanais

Em Ajustes:

- **Configuração low / high volume** — alvo padrão por exercício em cada modo (séries, faixa de reps, RIR, técnica). Vale para exercícios adicionados a rotinas e rotinas importadas; o botão "Aplicar às rotinas" sobrescreve esse modo em todas as rotinas existentes.
- **Alvo semanal de séries por grupo** — faixa mín.–máx. por grupo muscular, separada por modo. Em Análises › Volume semanal, cada série conta 1 para o grupo do músculo primário e 0,5 para grupos só secundários; a semana usa os alvos do modo predominante nos treinos dela (pode trocar na tela).

As atribuições de subparte muscular e de perfil de tensão são estimativas e podem ser editadas por exercício no app.
