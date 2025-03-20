import { setMaxListeners as nodeSetMaxListeners } from 'node:events'

/**
 * Create a setMaxListeners that doesn't break browser usage
 *
 * @param n - The maximum number of listeners.
 * @param eventTargets - The event targets to set the maximum number of listeners for.
 */
export const setMaxListeners: typeof nodeSetMaxListeners = (n, ...eventTargets) => {
  try {
    nodeSetMaxListeners(n, ...eventTargets)
  } catch {
    // swallow error, gulp
  }
}
