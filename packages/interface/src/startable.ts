/**
 * Implemented by components that have a lifecycle
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
 * Checks if an object implements the Startable interface.
 *
 * @param obj - The object to check.
 * @returns True if the object implements the Startable interface, false otherwise.
 */
export function isStartable (obj: any): obj is Startable {
  return obj != null && typeof obj.start === 'function' && typeof obj.stop === 'function'
}

/**
 * Starts a list of startable objects.
 *
 * @param objs - The objects to start.
 * @returns A promise that resolves when all objects have been started.
 */
export async function start (...objs: any[]): Promise<void> {
  /**
   * The list of startable objects.
   */
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
 * Stops a list of startable objects.
 *
 * @param objs - The objects to stop.
 * @returns A promise that resolves when all objects have been stopped.
 */
export async function stop (...objs: any[]): Promise<void> {
  /**
   * The list of startable objects.
   */
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
