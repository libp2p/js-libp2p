/**
 * Implemented by components that have a life cycle
 */
export interface Startable {
  /**
   * If implemented, this method will be invoked before the start method.
   *
   * It should not assume any other components have been started.
   */
  beforeStart?(): void | Promise<void>

  /**
   * This method will be invoked to start the component.
   *
   * It should not assume that any other components have been started.
   */
  start(): void | Promise<void>

  /**
   * If implemented, this method will be invoked after the start method.
   *
   * All other components will have had their start method invoked before this method is called.
   */
  afterStart?(): void | Promise<void>

  /**
   * If implemented, this method will be invoked before the stop method.
   *
   * Any other components will still be running when this method is called.
   */
  beforeStop?(): void | Promise<void>

  /**
   * This method will be invoked to stop the component.
   *
   * It should not assume any other components are running when it is called.
   */
  stop(): void | Promise<void>

  /**
   * If implemented, this method will be invoked after the stop method.
   *
   * All other components will have had their stop method invoked before this method is called.
   */
  afterStop?(): void | Promise<void>
}

/**
 * Returns `true` if the object has type overlap with `Startable`
 */
export function isStartable (obj?: any): obj is Startable {
  return obj != null && typeof obj.start === 'function' && typeof obj.stop === 'function'
}

/**
 * A function that can be used to start and objects passed to it. This checks
 * that an object is startable before invoking its lifecycle methods so it is
 * safe to pass non-`Startable`s in.
 *
 * @example
 *
 * ```TypeScript
 * import { start } from '@libp2p/interface'
 * import type { Startable } from '@libp2p/interface'
 *
 * const startable: Startable = {
 *   start: () => {},
 *   stop: () => {}
 * }
 *
 * const notStartable = 5
 *
 * await start(
 *   startable,
 *   notStartable
 * )
 * ```
 */
export async function start (...objs: any[]): Promise<void> {
  const startables: Startable[] = []

  for (const obj of objs) {
    if (isStartable(obj)) {
      startables.push(obj)
    }
  }

  await Promise.all(
    startables.map(async s => {
      if (s.beforeStart != null) {
        await s.beforeStart()
      }
    })
  )

  await Promise.all(
    startables.map(async s => {
      await s.start()
    })
  )

  await Promise.all(
    startables.map(async s => {
      if (s.afterStart != null) {
        await s.afterStart()
      }
    })
  )
}

/**
 * A function that can be used to stop and objects passed to it. This checks
 * that an object is startable before invoking its lifecycle methods so it is
 * safe to pass non-`Startable`s in.
 *
 * @example
 *
 * ```TypeScript
 * import { stop } from '@libp2p/interface'
 * import type { Startable } from '@libp2p/interface'
 *
 * const startable: Startable = {
 *   start: () => {},
 *   stop: () => {}
 * }
 *
 * const notStartable = 5
 *
 * await stop(
 *   startable,
 *   notStartable
 * )
 * ```
 */
export async function stop (...objs: any[]): Promise<void> {
  const startables: Startable[] = []

  for (const obj of objs) {
    if (isStartable(obj)) {
      startables.push(obj)
    }
  }

  await Promise.all(
    startables.map(async s => {
      if (s.beforeStop != null) {
        await s.beforeStop()
      }
    })
  )

  await Promise.all(
    startables.map(async s => {
      await s.stop()
    })
  )

  await Promise.all(
    startables.map(async s => {
      if (s.afterStop != null) {
        await s.afterStop()
      }
    })
  )
}
