import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * A custom implementation of MessageEvent as the Undici version does too much
 * validation in it's constructor so is very slow.
 */
export class StreamMessageEvent extends Event {
  public data: Uint8Array | Uint8ArrayList

  constructor (data: Uint8Array | Uint8ArrayList, eventInitDict?: EventInit) {
    super('message', eventInitDict)

    this.data = data
  }
}

/**
 * An event dispatched when the stream is closed. The `error` property can be
 * inspected to discover if the closing was graceful or not, and the `remote`
 * property shows which end of the stream initiated the closure
 */
export class StreamCloseEvent extends Event {
  public error?: Error
  public local: boolean

  constructor (local: boolean, error?: Error, eventInitDict?: EventInit) {
    super('close', eventInitDict)

    this.error = error
    this.local = local
  }
}

export class StreamAbortEvent extends StreamCloseEvent {
  constructor (error: Error, eventInitDict?: EventInit) {
    super(true, error, eventInitDict)
  }
}

export class StreamResetEvent extends StreamCloseEvent {
  constructor (error: Error, eventInitDict?: EventInit) {
    super(false, error, eventInitDict)
  }
}

export class StreamLocalCloseEvent extends StreamCloseEvent {
  constructor (eventInitDict?: EventInit) {
    super(true, undefined, eventInitDict)
  }
}

export class StreamRemoteCloseEvent extends StreamCloseEvent {
  constructor (eventInitDict?: EventInit) {
    super(false, undefined, eventInitDict)
  }
}

/**
 * An event dispatched when the read or write end of the stream is closed. The
 * `remote` property shows which end of the stream initiated the closure
 */
export class StreamHalfCloseEvent extends Event {
  public local: boolean

  constructor (type: 'closeRead' | 'closeWrite', local: boolean, eventInitDict?: EventInit) {
    super(type, eventInitDict)

    this.local = local
  }
}
