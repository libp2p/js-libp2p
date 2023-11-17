export function isPromise <T = unknown> (thing: any): thing is Promise<T> {
  if (thing == null) {
    return false
  }

  return typeof thing.then === 'function' &&
    typeof thing.catch === 'function' &&
    typeof thing.finally === 'function'
}
