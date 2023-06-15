
/**
 * An object that contains an AbortSignal as
 * the optional `signal` property.
 *
 * @example
 *
 * ```js
 * const controller = new AbortController()
 *
 * aLongRunningOperation({
 *   signal: controller.signal
 * })
 *
 * // later
 *
 * controller.abort()
 */
export interface AbortOptions {
  signal?: AbortSignal
}

/**
 * Returns a new type with all fields marked optional.
 *
 * Borrowed from the tsdef module.
 */
export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer I> ? Array<RecursivePartial<I>> : T[P] extends (...args: any[]) => any ? T[P] : RecursivePartial<T[P]>
}
