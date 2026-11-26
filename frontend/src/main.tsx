import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import AppRouter from './app/router'
import { store } from './app/store'
import './index.css'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element with id "root" was not found in the document')
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <AppRouter />
    </Provider>
  </StrictMode>,
)
