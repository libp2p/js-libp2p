import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes } from '../errors.js'
import * as lp from 'it-length-prefixed'
import { FetchRequest, FetchResponse } from './pb/proto.js'
import { PROTOCOL_NAME, PROTOCOL_VERSION } from './constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Stream } from '@libp2p/interface-connection'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { AbortOptions } from '@libp2p/interfaces'
import { abortableDuplex } from 'abortable-iterator'
import { pipe } from 'it-pipe'
import first from 'it-first'
import { TimeoutController } from 'timeout-abort-controller'
import { setMaxListeners } from 'events'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'

const log = logger('libp2p:fetch')

export interface FetchServiceInit {
  protocolPrefix: string
  maxInboundStreams: number
  maxOutboundStreams: number

  /**
   * How long we should wait for a remote peer to send any data
   */
  timeout: number
}

export interface HandleMessageOptions {
  stream: Stream
  protocol: string
}

export interface LookupFunction {
  (key: string): Promise<Uint8Array | null>
}

export interface FetchServiceComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
}

/**
 * A simple libp2p protocol for requesting a value corresponding to a key from a peer.
 * Developers can register one or more lookup function for retrieving the value corresponding to
 * a given key.  Each lookup function must act on a distinct part of the overall key space, defined
 * by a fixed prefix that all keys that should be routed to that lookup function will start with.
 */
export class FetchService implements Startable {
  public readonly protocol: string
  private readonly components: FetchServiceComponents
  private readonly lookupFunctions: Map<string, LookupFunction>
  private started: boolean
  private readonly init: FetchServiceInit

  constructor (components: FetchServiceComponents, init: FetchServiceInit) {
    this.started = false
    this.components = components
    this.protocol = `/${init.protocolPrefix ?? 'libp2p'}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.lookupFunctions = new Map() // Maps key prefix to value lookup function
    this.handleMessage = this.handleMessage.bind(this)
    this.init = init
  }

  async start () {
    await this.components.registrar.handle(this.protocol, (data) => {
      void this.handleMessage(data)
        .catch(err => {
          log.error(err)
        })
        .finally(() => {
          data.stream.close()
        })
    }, {
      maxInboundStreams: this.init.maxInboundStreams,
      maxOutboundStreams: this.init.maxOutboundStreams
    })
    this.started = true
  }

  async stop () {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted () {
    return this.started
  }

  /**
   * Sends a request to fetch the value associated with the given key from the given peer
   */
  async fetch (peer: PeerId, key: string, options: AbortOptions = {}): Promise<Uint8Array | null> {
    log('dialing %s to %p', this.protocol, peer)

    const connection = await this.components.connectionManager.openConnection(peer, options)
    let timeoutController
    let signal = options.signal
    let stream: Stream | undefined

    // create a timeout if no abort signal passed
    if (signal == null) {
      log('using default timeout of %d ms', this.init.timeout)
      timeoutController = new TimeoutController(this.init.timeout)
      signal = timeoutController.signal

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, timeoutController.signal)
      } catch {}
    }

    try {
      stream = await connection.newStream(this.protocol, {
        signal
      })

      // make stream abortable
      const source = abortableDuplex(stream, signal)

      log('fetch %s', key)

      const result = await pipe(
        [FetchRequest.encode({ identifier: key })],
        lp.encode(),
        source,
        lp.decode(),
        async function (source) {
          const buf = await first(source)

          if (buf == null) {
            throw errCode(new Error('No data received'), codes.ERR_INVALID_MESSAGE)
          }

          const response = FetchResponse.decode(buf)

          switch (response.status) {
            case (FetchResponse.StatusCode.OK): {
              log('received status for %s ok', key)
              return response.data
            }
            case (FetchResponse.StatusCode.NOT_FOUND): {
              log('received status for %s not found', key)
              return null
            }
            case (FetchResponse.StatusCode.ERROR): {
              log('received status for %s error', key)
              const errmsg = uint8arrayToString(response.data)
              throw errCode(new Error('Error in fetch protocol response: ' + errmsg), codes.ERR_INVALID_PARAMETERS)
            }
            default: {
              log('received status for %s unknown', key)
              throw errCode(new Error('Unknown response status'), codes.ERR_INVALID_MESSAGE)
            }
          }
        }
      )

      return result ?? null
    } finally {
      if (timeoutController != null) {
        timeoutController.clear()
      }

      if (stream != null) {
        stream.close()
      }
    }
  }

  /**
   * Invoked when a fetch request is received.  Reads the request message off the given stream and
   * responds based on looking up the key in the request via the lookup callback that corresponds
   * to the key's prefix.
   */
  async handleMessage (data: IncomingStreamData) {
    const { stream } = data
    const self = this

    await pipe(
      stream,
      lp.decode(),
      async function * (source) {
        const buf = await first(source)

        if (buf == null) {
          throw errCode(new Error('No data received'), codes.ERR_INVALID_MESSAGE)
        }

        // for await (const buf of source) {
        const request = FetchRequest.decode(buf)

        let response: FetchResponse
        const lookup = self._getLookupFunction(request.identifier)
        if (lookup != null) {
          log('look up data with identifier %s', request.identifier)
          const data = await lookup(request.identifier)
          if (data != null) {
            log('sending status for %s ok', request.identifier)
            response = { status: FetchResponse.StatusCode.OK, data }
          } else {
            log('sending status for %s not found', request.identifier)
            response = { status: FetchResponse.StatusCode.NOT_FOUND, data: new Uint8Array(0) }
          }
        } else {
          log('sending status for %s error', request.identifier)
          const errmsg = uint8arrayFromString(`No lookup function registered for key: ${request.identifier}`)
          response = { status: FetchResponse.StatusCode.ERROR, data: errmsg }
        }

        yield FetchResponse.encode(response)
      },
      lp.encode(),
      stream
    )
  }

  /**
   * Given a key, finds the appropriate function for looking up its corresponding value, based on
   * the key's prefix.
   */
  _getLookupFunction (key: string) {
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
  registerLookupFunction (prefix: string, lookup: LookupFunction) {
    if (this.lookupFunctions.has(prefix)) {
      throw errCode(new Error("Fetch protocol handler for key prefix '" + prefix + "' already registered"), codes.ERR_KEY_ALREADY_EXISTS)
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
  unregisterLookupFunction (prefix: string, lookup?: LookupFunction) {
    if (lookup != null) {
      const existingLookup = this.lookupFunctions.get(prefix)

      if (existingLookup !== lookup) {
        return
      }
    }

    this.lookupFunctions.delete(prefix)
  }
}
