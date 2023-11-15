import { CodeError, ERR_INVALID_MESSAGE, ERR_INVALID_PARAMETERS, ERR_TIMEOUT } from '@libp2p/interface/errors'
import { setMaxListeners } from '@libp2p/interface/events'
import { pbStream } from 'it-protobuf-stream'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import { PROTOCOL_NAME, PROTOCOL_VERSION } from './constants.js'
import { FetchRequest, FetchResponse } from './pb/proto.js'
import type { Fetch as FetchInterface, FetchComponents, FetchInit, LookupFunction } from './index.js'
import type { AbortOptions, Logger } from '@libp2p/interface'
import type { Stream } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Startable } from '@libp2p/interface/startable'
import type { IncomingStreamData } from '@libp2p/interface-internal/registrar'

const DEFAULT_TIMEOUT = 10000

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
  private readonly log: Logger

  constructor (components: FetchComponents, init: FetchInit = {}) {
    this.log = components.logger.forComponent('libp2p:fetch')
    this.started = false
    this.components = components
    this.protocol = `/${init.protocolPrefix ?? 'libp2p'}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.lookupFunctions = new Map() // Maps key prefix to value lookup function
    this.handleMessage = this.handleMessage.bind(this)
    this.init = init
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, (data) => {
      void this.handleMessage(data)
        .then(async () => {
          await data.stream.close()
        })
        .catch(err => {
          this.log.error(err)
        })
    }, {
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
  async fetch (peer: PeerId, key: string, options: AbortOptions = {}): Promise<Uint8Array | undefined> {
    this.log('dialing %s to %p', this.protocol, peer)

    const connection = await this.components.connectionManager.openConnection(peer, options)
    let signal = options.signal
    let stream: Stream | undefined
    let onAbort = (): void => {}

    // create a timeout if no abort signal passed
    if (signal == null) {
      this.log('using default timeout of %d ms', this.init.timeout)
      signal = AbortSignal.timeout(this.init.timeout ?? DEFAULT_TIMEOUT)

      setMaxListeners(Infinity, signal)
    }

    try {
      stream = await connection.newStream(this.protocol, {
        signal
      })

      onAbort = () => {
        stream?.abort(new CodeError('fetch timeout', ERR_TIMEOUT))
      }

      // make stream abortable
      signal.addEventListener('abort', onAbort, { once: true })

      this.log('fetch %s', key)

      const pb = pbStream(stream)
      await pb.write({
        identifier: key
      }, FetchRequest, options)

      const response = await pb.read(FetchResponse, options)
      await pb.unwrap().close(options)

      switch (response.status) {
        case (FetchResponse.StatusCode.OK): {
          this.log('received status for %s ok', key)
          return response.data
        }
        case (FetchResponse.StatusCode.NOT_FOUND): {
          this.log('received status for %s not found', key)
          return
        }
        case (FetchResponse.StatusCode.ERROR): {
          this.log('received status for %s error', key)
          const errmsg = uint8arrayToString(response.data)
          throw new CodeError('Error in fetch protocol response: ' + errmsg, ERR_INVALID_PARAMETERS)
        }
        default: {
          this.log('received status for %s unknown', key)
          throw new CodeError('Unknown response status', ERR_INVALID_MESSAGE)
        }
      }
    } catch (err: any) {
      stream?.abort(err)
      throw err
    } finally {
      signal.removeEventListener('abort', onAbort)
      if (stream != null) {
        await stream.close()
      }
    }
  }

  /**
   * Invoked when a fetch request is received.  Reads the request message off the given stream and
   * responds based on looking up the key in the request via the lookup callback that corresponds
   * to the key's prefix.
   */
  async handleMessage (data: IncomingStreamData): Promise<void> {
    const { stream } = data
    const signal = AbortSignal.timeout(this.init.timeout ?? DEFAULT_TIMEOUT)

    try {
      const pb = pbStream(stream)
      const request = await pb.read(FetchRequest, {
        signal
      })

      let response: FetchResponse
      const lookup = this._getLookupFunction(request.identifier)
      if (lookup != null) {
        this.log('look up data with identifier %s', request.identifier)
        const data = await lookup(request.identifier)
        if (data != null) {
          this.log('sending status for %s ok', request.identifier)
          response = { status: FetchResponse.StatusCode.OK, data }
        } else {
          this.log('sending status for %s not found', request.identifier)
          response = { status: FetchResponse.StatusCode.NOT_FOUND, data: new Uint8Array(0) }
        }
      } else {
        this.log('sending status for %s error', request.identifier)
        const errmsg = uint8arrayFromString(`No lookup function registered for key: ${request.identifier}`)
        response = { status: FetchResponse.StatusCode.ERROR, data: errmsg }
      }

      await pb.write(response, FetchResponse, {
        signal
      })

      await pb.unwrap().close({
        signal
      })
    } catch (err: any) {
      this.log('error answering fetch request', err)
      stream.abort(err)
    }
  }

  /**
   * Given a key, finds the appropriate function for looking up its corresponding value, based on
   * the key's prefix.
   */
  _getLookupFunction (key: string): LookupFunction | undefined {
    for (const prefix of this.lookupFunctions.keys()) {
      if (key.startsWith(prefix)) {
        return this.lookupFunctions.get(prefix)
      }
    }
  }

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix
   *
   * @example
   *
   * ```js
   * // ...
   * libp2p.fetchService.registerLookupFunction('/prefix', (key) => { ... })
   * ```
   */
  registerLookupFunction (prefix: string, lookup: LookupFunction): void {
    if (this.lookupFunctions.has(prefix)) {
      throw new CodeError(`Fetch protocol handler for key prefix '${prefix}' already registered`, 'ERR_KEY_ALREADY_EXISTS')
    }

    this.lookupFunctions.set(prefix, lookup)
  }

  /**
   * Registers a new lookup callback that can map keys to values, for a given set of keys that
   * share the same prefix.
   *
   * @example
   *
   * ```js
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
