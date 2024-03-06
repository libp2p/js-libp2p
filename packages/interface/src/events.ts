import { setMaxListeners as nodeSetMaxListeners } from 'events'

// create a setMaxListeners that doesn't break browser usage
export const setMaxListeners: typeof nodeSetMaxListeners = (n, ...eventTargets) => {
  try {
    nodeSetMaxListeners(n, ...eventTargets)
  } catch {
    // swallow error, gulp
  }
}
