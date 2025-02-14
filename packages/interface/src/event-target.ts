import { setMaxListeners } from './events.js'

export interface EventCallback<EventType> { (evt: EventType): void }
export interface EventObject<EventType> { handleEvent: EventCallback<EventType> }
export type EventHandler<EventType> = EventCallback<EventType> | EventObject<EventType>

/**
 * A listener for an event.
 */ 
interface Listener {
  /**
   * Whether the listener is a one-time listener.
   */
  once: boolean
  /**
   * The callback for the listener.
   */
  callback: any
}

/**
 * Adds types to the EventTarget class. Hopefully this won't be necessary forever.
 *
 * https://github.com/microsoft/TypeScript/issues/28357
 * https://github.com/microsoft/TypeScript/issues/43477
 * https://github.com/microsoft/TypeScript/issues/299
 * etc
 * 
 * @example
 *
 * ```TypeScript
 * const eventTarget = new TypedEventTarget<{ myEvent: { detail: string } }>()
 * ```
 */

export interface TypedEventTarget <EventMap extends Record<string, any>> extends EventTarget {
  /**
   * Adds an event listener to the event target.
   *
   * @param type - The type of event to listen for.
   * @param listener - The callback to invoke when the event is triggered.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.addEventListener('myEvent', (event) => {
   *   console.log('myEvent triggered', event)
   * })
   * ```
   */
  addEventListener<K extends keyof EventMap>(type: K, listener: EventHandler<EventMap[K]> | null, options?: boolean | AddEventListenerOptions): void

  /**
   * Returns the number of listeners for a specific event type.
   *
   * @param type - The type of event to check.
   * @returns The number of listeners for the event type.
   * @example
   *
   * ```TypeScript
   * const count = eventTarget.listenerCount('myEvent')
   * console.log('Number of listeners for myEvent:', count)
   * ```
   */
  listenerCount (type: string): number

  /**
   * Removes an event listener from the event target.
   *
   * @param type - The type of event to remove the listener from.
   * @param listener - The callback to remove from the event target.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.removeEventListener('myEvent', (event) => {
   *   console.log('removed listener for myEvent', event)
   * })
   * ```
   */
  removeEventListener<K extends keyof EventMap>(type: K, listener?: EventHandler<EventMap[K]> | null, options?: boolean | EventListenerOptions): void

  /**
   * Removes an event listener from the event target.
   *
   * @param type - The type of event to remove the listener from.
   * @param listener - The callback to remove from the event target.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.removeEventListener('myEvent', (event) => {
   *   console.log('removed listener for myEvent', event)
   * })
   * ```
   */
  removeEventListener (type: string, listener?: EventHandler<Event>, options?: boolean | EventListenerOptions): void

  /**
   * Dispatches a custom event to the event target.
   *
   * @param type - The type of event to dispatch.
   * @param detail - The detail for the event.
   * @returns True if the event was successfully dispatched, false otherwise.
   * @example
   *
   * ```TypeScript
   * eventTarget.safeDispatchEvent('myEvent', { detail: 'myEvent detail' })
   * ```
   */
  safeDispatchEvent<Detail>(type: keyof EventMap, detail: CustomEventInit<Detail>): boolean
}

/**
 * An implementation of a typed event target
 * 
 * @example
 *
 * ```TypeScript
 * const eventTarget = new TypedEventEmitter<{ myEvent: { detail: string } }>()
 * ```
 */
export class TypedEventEmitter<EventMap extends Record<string, any>> extends EventTarget implements TypedEventTarget<EventMap> {
  /**
   * A map of listeners for each event type.
   */
  readonly #listeners = new Map<any, Listener[]>()

  /**
   * Creates a new TypedEventEmitter instance.
   */
  constructor () {
    super()

    // silence MaxListenersExceededWarning warning on Node.js, this is a red
    // herring almost all of the time
    setMaxListeners(Infinity, this)
  }

  /**
   * Returns the number of listeners for a specific event type.
   *
   * @param type - The type of event to check.
   * @returns The number of listeners for the event type.
   * @example
   *
   * ```TypeScript
   * const count = eventTarget.listenerCount('myEvent')
   * console.log('Number of listeners for myEvent:', count)
   * ```
   */
  listenerCount (type: string): number {
    const listeners = this.#listeners.get(type)

    if (listeners == null) {
      return 0
    }

    return listeners.length
  }

  /**
   * Adds an event listener to the event target.
   *
   * @param type - The type of event to listen for.
   * @param listener - The callback to invoke when the event is triggered.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.addEventListener('myEvent', (event) => {
   *   console.log('myEvent triggered', event)
   * })
   */
  addEventListener<K extends keyof EventMap>(type: K, listener: EventHandler<EventMap[K]> | null, options?: boolean | AddEventListenerOptions): void

  /**
   * Adds an event listener to the event target.
   *
   * @param type - The type of event to listen for.
   * @param listener - The callback to invoke when the event is triggered.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.addEventListener('myEvent', (event) => {
   *   console.log('myEvent triggered', event)
   * })
   * ```
   */

  addEventListener (type: string, listener: EventHandler<Event>, options?: boolean | AddEventListenerOptions): void {
    super.addEventListener(type, listener, options)

    let list = this.#listeners.get(type)

    if (list == null) {
      list = []
      this.#listeners.set(type, list)
    }

    list.push({
      callback: listener,
      once: (options !== true && options !== false && options?.once) ?? false
    })
  }

  /**
   * Removes an event listener from the event target.
   *
   * @param type - The type of event to remove the listener from.
   * @param listener - The callback to remove from the event target.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.removeEventListener('myEvent', (event) => {
   *   console.log('removed listener for myEvent', event)
   * })
   * ```
   */

  removeEventListener<K extends keyof EventMap>(type: K, listener?: EventHandler<EventMap[K]> | null, options?: boolean | EventListenerOptions): void

  /**
   * Removes an event listener from the event target.
   *
   * @param type - The type of event to remove the listener from.
   * @param listener - The callback to remove from the event target.
   * @param options - Additional options for the event listener.
   * @example
   *
   * ```TypeScript
   * eventTarget.removeEventListener('myEvent', (event) => {
   *   console.log('removed listener for myEvent', event)
   * })
   * ```
   */
  
  removeEventListener (type: string, listener?: EventHandler<Event>, options?: boolean | EventListenerOptions): void {
    super.removeEventListener(type.toString(), listener ?? null, options)

    let list = this.#listeners.get(type)

    if (list == null) {
      return
    }

    list = list.filter(({ callback }) => callback !== listener)
    this.#listeners.set(type, list)
  }

  /**
   * Dispatches an event to the event target.
   *
   * @param event - The event to dispatch.
   * @returns True if the event was successfully dispatched, false otherwise.
   * @example
   *
   * ```TypeScript
   * eventTarget.dispatchEvent(new Event('myEvent'))
   * ```
   */
  dispatchEvent (event: Event): boolean {
    const result = super.dispatchEvent(event)

    let list = this.#listeners.get(event.type)

    if (list == null) {
      return result
    }

    list = list.filter(({ once }) => !once)
    this.#listeners.set(event.type, list)

    return result
  }

  /**
   * Dispatches a custom event to the event target.
   *
   * @param type - The type of event to dispatch.
   * @param detail - The detail for the event.
   * @returns True if the event was successfully dispatched, false otherwise.
   * @example
   *
   * ```TypeScript
   * eventTarget.safeDispatchEvent('myEvent', { detail: 'myEvent detail' })
   * ```
   */
  safeDispatchEvent<Detail>(type: keyof EventMap, detail: CustomEventInit<Detail> = {}): boolean {
    return this.dispatchEvent(new CustomEvent<Detail>(type as string, detail))
  }
}
