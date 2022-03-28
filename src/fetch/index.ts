import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes } from '../errors.js'
import * as lp from 'it-length-prefixed'
import { FetchRequest, FetchResponse } from './pb/proto.js'
import { handshake } from 'it-handshake'
import { PROTOCOL } from './constants.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Startable } from '@libp2p/interfaces'
import type { Stream } from '@libp2p/interfaces/connection'
import type { IncomingStreamData } from '@libp2p/interfaces/registrar'
import type { Components } from '@libp2p/interfaces/components'

const log = logger('libp2p:fetch')

export interface FetchInit {
  protocolPrefix: string
}

export interface HandleMessageOptions {
  stream: Stream
  protocol: string
}

export interface LookupFunction {
  (key: string): Promise<Uint8Array | null>
}

/**
 * A simple libp2p protocol for requesting a value corresponding to a key from a peer.
 * Developers can register one or more lookup function for retrieving the value corresponding to
 * a given key.  Each lookup function must act on a distinct part of the overall key space, defined
 * by a fixed prefix that all keys that should be routed to that lookup function will start with.
 */
export class FetchService implements Startable {
  private readonly components: Components
  private readonly lookupFunctions: Map<string, LookupFunction>
  private readonly protocol: string
  private started: boolean

  constructor (components: Components, init: FetchInit) {
    this.started = false
    this.components = components
    this.protocol = PROTOCOL
    this.lookupFunctions = new Map() // Maps key prefix to value lookup function
    this.handleMessage = this.handleMessage.bind(this)
  }

  async start () {
    await this.components.getRegistrar().handle(this.protocol, (data) => {
      void this.handleMessage(data).catch(err => {
        log.error(err)
      })
    })
    this.started = true
  }

  async stop () {
    await this.components.getRegistrar().unhandle(this.protocol)
    this.started = false
  }

  isStarted () {
    return this.started
  }

  /**
   * Sends a request to fetch the value associated with the given key from the given peer
   */
  async fetch (peer: PeerId, key: string): Promise<Uint8Array | null> {
    log('dialing %s to %p', this.protocol, peer)

    const connection = await this.components.getDialer().dial(peer)
    const { stream } = await connection.newStream([this.protocol])
    const shake = handshake(stream)

    // send message
    const request = new FetchRequest({ identifier: key })
    shake.write(lp.encode.single(FetchRequest.encode(request).finish()).slice())

    // read response
    // @ts-expect-error fromReader returns a Source which has no .next method
    const response = FetchResponse.decode((await lp.decode.fromReader(shake.reader).next()).value.slice())
    switch (response.status) {
      case (FetchResponse.StatusCode.OK): {
        return response.data
      }
      case (FetchResponse.StatusCode.NOT_FOUND): {
        return null
      }
      case (FetchResponse.StatusCode.ERROR): {
        const errmsg = (new TextDecoder()).decode(response.data)
        throw errCode(new Error('Error in fetch protocol response: ' + errmsg), codes.ERR_INVALID_PARAMETERS)
      }
      default: {
        throw errCode(new Error('Unknown response status'), codes.ERR_INVALID_MESSAGE)
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
    const shake = handshake(stream)
    // @ts-expect-error fromReader returns a Source which has no .next method
    const request = FetchRequest.decode((await lp.decode.fromReader(shake.reader).next()).value.slice())

    let response
    const lookup = this._getLookupFunction(request.identifier)
    if (lookup != null) {
      const data = await lookup(request.identifier)
      if (data != null) {
        response = new FetchResponse({ status: FetchResponse.StatusCode.OK, data })
      } else {
        response = new FetchResponse({ status: FetchResponse.StatusCode.NOT_FOUND })
      }
    } else {
      const errmsg = (new TextEncoder()).encode('No lookup function registered for key: ' + request.identifier)
      response = new FetchResponse({ status: FetchResponse.StatusCode.ERROR, data: errmsg })
    }

    shake.write(lp.encode.single(FetchResponse.encode(response).finish()).slice())
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
