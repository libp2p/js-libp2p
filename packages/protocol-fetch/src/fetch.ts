import { InvalidMessageError, InvalidParametersError, ProtocolError } from '@libp2p/interface'
import { pbStream } from '@libp2p/utils'
import { setMaxListeners } from 'main-event'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import { PROTOCOL_NAME, PROTOCOL_VERSION } from './constants.js'
import { FetchRequest, FetchResponse } from './pb/proto.js'
import type { Fetch as FetchInterface, FetchComponents, FetchInit, LookupFunction } from './index.js'
import type { AbortOptions, Stream, PeerId, Startable } from '@libp2p/interface'

const DEFAULT_TIMEOUT = 10_000

/**
 * A simple libp2p protocol for requesting a value corresponding to a key from a peer.
 * Developers can register one or more lookup function for retrieving the value corresponding to
 * a given key.  Each lookup function must act on a distinct part of the overall key space, defined
 * by a fixed prefix that all keys that should be routed to that lookup function will start with.
 */
export class Fetch implements Startable, FetchInterface {
  public readonly protocol: string
  private readonly components: FetchComponents
  private readonly lookupFunctions: Map<string, LookupFunction>
  private started: boolean
  private readonly init: FetchInit

  constructor (components: FetchComponents, init: FetchInit = {}) {
    this.started = false
    this.components = components
    this.protocol = `/${init.protocolPrefix ?? 'libp2p'}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.lookupFunctions = new Map() // Maps key prefix to value lookup function
    this.init = init

    this.handleMessage = this.handleMessage.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/fetch'

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, this.handleMessage, {
      maxInboundStreams: this.init.maxInboundStreams,
      maxOutboundStreams: this.init.maxOutboundStreams
    })
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * Sends a request to fetch the value associated with the given key from the given peer
   */
  async fetch (peer: PeerId, key: string | Uint8Array, options: AbortOptions = {}): Promise<Uint8Array | undefined> {
    if (typeof key === 'string') {
      key = uint8arrayFromString(key)
    }

    // create a timeout if no abort signal passed
    if (options.signal == null) {
      const timeout = this.init.timeout ?? DEFAULT_TIMEOUT
      const signal = AbortSignal.timeout(timeout)
      setMaxListeners(Infinity, signal)

      options = {
        ...options,
        signal
      }
    }

    let stream: Stream | undefined

    try {
      const connection = await this.components.connectionManager.openConnection(peer, options)
      stream = await connection.newStream(this.protocol, options)

      const log = stream.log.newScope('fetch')
      log.trace('fetch %m', key)

      const pb = pbStream(stream)
      await pb.write({
        identifier: key
      }, FetchRequest, options)

      const response = await pb.read(FetchResponse, options)

      await stream.close(options)

      switch (response.status) {
        case (FetchResponse.StatusCode.OK): {
          log.trace('received status OK for %m', key)
          return response.data
        }
        case (FetchResponse.StatusCode.NOT_FOUND): {
          log('received status NOT_FOUND for %m', key)
          return
        }
        case (FetchResponse.StatusCode.ERROR): {
          log('received status ERROR for %m', key)
          const errMsg = uint8arrayToString(response.data)
          throw new ProtocolError('Error in fetch protocol response: ' + errMsg)
        }
        default: {
          log('received status unknown for %m', key)
          throw new InvalidMessageError('Unknown response status')
        }
      }
    } catch (err: any) {
      stream?.abort(err)
      throw err
    }
  }

  /**
   * Invoked when a fetch request is received.  Reads the request message off the given stream and
   * responds based on looking up the key in the request via the lookup callback that corresponds
   * to the key's prefix.
   */
  async handleMessage (stream: Stream): Promise<void> {
    const log = stream.log.newScope('fetch')
    const signal = AbortSignal.timeout(this.init.timeout ?? DEFAULT_TIMEOUT)

    const pb = pbStream(stream)
    const request = await pb.read(FetchRequest, {
      signal
    })

    let response: FetchResponse
    const key = uint8arrayToString(request.identifier)

    const lookup = this._getLookupFunction(key)

    if (lookup == null) {
      log.trace('sending status ERROR for %m', request.identifier)
      const errMsg = uint8arrayFromString('No lookup function registered for key')
      response = { status: FetchResponse.StatusCode.ERROR, data: errMsg }
    } else {
      log.trace('lookup data with identifier %s', lookup.prefix)

      try {
        const data = await lookup.fn(request.identifier)

        if (data == null) {
          log.trace('sending status NOT_FOUND for %m', request.identifier)
          response = { status: FetchResponse.StatusCode.NOT_FOUND, data: new Uint8Array(0) }
        } else {
          log.trace('sending status OK for %m', request.identifier)
          response = { status: FetchResponse.StatusCode.OK, data }
        }
      } catch (err: any) {
        log.error('error during lookup of %m - %e', request.identifier, err)
        const errMsg = uint8arrayFromString(err.message)
        response = { status: FetchResponse.StatusCode.ERROR, data: errMsg }
      }
    }

    await pb.write(response, FetchResponse, {
      signal
    })

    await stream.close({
      signal
    })
  }

  /**
   * Given a key, finds the appropriate function for looking up its corresponding value, based on
   * the key's prefix.
   */
  _getLookupFunction (key: string): { fn: LookupFunction, prefix: string } | undefined {
    for (const prefix of this.lookupFunctions.keys()) {
      if (key.startsWith(prefix)) {
        const fn = this.lookupFunctions.get(prefix)

        if (fn != null) {
          return {
            fn,
            prefix
          }
        }
      }
    }
  }

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix
   *
   * @example
   *
   * ```TypeScript
   * // ...
   * libp2p.fetchService.registerLookupFunction('/prefix', (key) => { ... })
   * ```
   */
  registerLookupFunction (prefix: string, lookup: LookupFunction): void {
    if (this.lookupFunctions.has(prefix)) {
      throw new InvalidParametersError(`Fetch protocol handler for key prefix '${prefix}' already registered`)
    }

    this.lookupFunctions.set(prefix, lookup)
  }

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix.
   *
   * @example
   *
   * ```TypeScript
   * // ...
   * libp2p.fetchService.unregisterLookupFunction('/prefix')
   * ```
   */
  unregisterLookupFunction (prefix: string, lookup?: LookupFunction): void {
    if (lookup != null) {
      const existingLookup = this.lookupFunctions.get(prefix)

      if (existingLookup !== lookup) {
        return
      }
    }

    this.lookupFunctions.delete(prefix)
  }
}
