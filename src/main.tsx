import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ensureSeed } from './db/db'
import './index.css'

// service worker só no build de produção (pré-cache para uso offline)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // quando uma versão nova assume o controle, recarrega uma vez para não misturar arquivos de versões diferentes
  // (seguro no meio do treino: cada alteração já está gravada no banco)
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    location.reload()
  })
  void navigator.serviceWorker.register('./sw.js')
}
// pede ao navegador para não apagar os dados locais sob pressão de armazenamento
void navigator.storage?.persist?.()

void ensureSeed().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  ),
)
