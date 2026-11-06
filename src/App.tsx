import { useEffect, useState } from 'react'
import { GAME_NAME } from './config'
import { strings } from './text'
import { loadGameData, type LoadResult } from './data'
import { Game, LegalFooter } from './ui'
import './App.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; detail: unknown }
  | { status: 'ready'; result: LoadResult }

function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadGameData({
      onProgress: (stage, done, total) => {
        if (!cancelled && stage === 'popularity' && total) setProgress({ done: done ?? 0, total })
      },
    })
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', result })
      })
      .catch((detail) => {
        if (!cancelled) setState({ status: 'error', detail })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <main className="status-page">
        <h1>{GAME_NAME}</h1>
        <p>
          {progress
            ? strings.loadingPopularity
                .replace('{done}', String(progress.done))
                .replace('{total}', String(progress.total))
            : strings.loadingData}
        </p>
        <p className="app-subtitle">{strings.loadingHint}</p>
        <footer className="footer">
          <LegalFooter />
        </footer>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="status-page">
        <h1>{GAME_NAME}</h1>
        <p>{strings.errorLoading}</p>
        <button type="button" className="primary-btn" onClick={() => window.location.reload()}>
          {strings.retry}
        </button>
        <footer className="footer">
          <LegalFooter />
        </footer>
      </main>
    )
  }

  return <Game data={state.result.data} source={state.result.source} />
}

export default App