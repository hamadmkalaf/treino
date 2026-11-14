// Compila o app e atualiza a branch gh-pages (GitHub Pages) com o conteúdo de dist/.
// Uso: npm run publicar               → compila, grava o commit em gh-pages e faz o push
//      npm run publicar -- --sem-push → só atualiza a branch local, sem enviar
import { execFileSync, execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BRANCH = 'gh-pages'
const REMOTE = 'origin'
const push = !process.argv.includes('--sem-push')

// git é chamado sem shell: no Windows o cmd.exe trata ^ e aspas de forma especial
const git = (args, env) =>
  execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const tryGit = (args, env) => {
  try {
    return git(args, env)
  } catch {
    return ''
  }
}

console.log('› compilando…')
execSync('npm run build', { stdio: 'inherit' })
// impede o GitHub Pages de processar o site com Jekyll
writeFileSync('dist/.nojekyll', '')

const source = git(['rev-parse', '--short', 'HEAD']) + (git(['status', '--porcelain']) ? '-alterado' : '')

// monta a árvore de dist/ num índice temporário, sem tocar na branch atual nem nos arquivos de trabalho
const tmp = mkdtempSync(join(tmpdir(), 'treino-publicar-'))
try {
  const env = { GIT_INDEX_FILE: join(tmp, 'index') }
  git(['--work-tree=dist', 'add', '-A'], env)
  const tree = git(['write-tree'], env)

  // continua a partir da versão publicada (remota, se existir; senão a local)
  tryGit(['fetch', '-q', REMOTE, BRANCH])
  const parent =
    tryGit(['rev-parse', '-q', '--verify', `refs/remotes/${REMOTE}/${BRANCH}`]) ||
    tryGit(['rev-parse', '-q', '--verify', `refs/heads/${BRANCH}`])

  if (parent && git(['rev-parse', `${parent}^{tree}`]) === tree) {
    git(['update-ref', `refs/heads/${BRANCH}`, parent])
    console.log('› o site publicado já está igual a este build; nada a enviar.')
  } else {
    const message = `Publica o site (código em ${source})`
    const commit = git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message])
    git(['update-ref', `refs/heads/${BRANCH}`, commit])
    console.log(`› ${BRANCH} atualizada: ${commit.slice(0, 7)} — ${message}`)
    if (push) {
      console.log(`› enviando para ${REMOTE}/${BRANCH}…`)
      execFileSync('git', ['push', REMOTE, BRANCH], { stdio: 'inherit' })
      console.log('› publicado. O GitHub Pages leva cerca de um minuto para atualizar.')
    } else {
      console.log(`› push não feito (--sem-push). Para enviar: git push ${REMOTE} ${BRANCH}`)
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
