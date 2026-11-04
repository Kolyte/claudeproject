import { useCallback, useEffect, useState } from 'react'
import { api, message } from './api'

export function useResource<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string; version: number }>({ path: null, data: null, error: '', version: -1 })
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    if (!path) return () => controller.abort()
    api<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, data, error: '', version })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ path, data: null, error: message(error), version })
    })
    return () => controller.abort()
  }, [path, version])
  // Never render the previous user's/path's private data during an effect handoff.
  const current = Boolean(path) && state.path === path && state.version === version
  return { data: current ? state.data : null, error: current ? state.error : '', loading: Boolean(path) && !current, refresh }
}
