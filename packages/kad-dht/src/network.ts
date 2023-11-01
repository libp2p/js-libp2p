import { CodeError } from '@libp2p/interface/errors'
import { TypedEventEmitter, CustomEvent } from '@libp2p/interface/events'
import { logger } from '@libp2p/logger'
import { abortableDuplex } from 'abortable-iterator'
import drain from 'it-drain'
import first from 'it-first'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { Message } from './message/index.js'
import {
  dialPeerEvent,
  sendQueryEvent,
  peerResponseEvent,
  queryErrorEvent
} from './query/events.js'
import type { KadDHTComponents, QueryEvent, QueryOptions } from './index.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Stream } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerInfo } from '@libp2p/interface/peer-info'
import type { Startable } from '@libp2p/interface/startable'
import type { Logger } from '@libp2p/logger'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface NetworkInit {
  protocol: string
  lan: boolean
}

interface NetworkEvents {
  'peer': CustomEvent<PeerInfo>
}

/**
 * Handle network operations for the dht
 */
export class Network extends TypedEventEmitter<NetworkEvents> implements Startable {
  private readonly log: Logger
  private readonly protocol: string
  private running: boolean
  private readonly components: KadDHTComponents

  /**
   * Create a new network
   */
  constructor (components: KadDHTComponents, init: NetworkInit) {
    super()

    const { protocol, lan } = init
    this.components = components
    this.log = logger(`libp2p:kad-dht:${lan ? 'lan' : 'wan'}:network`)
    this.running = false
    this.protocol = protocol
  }

  /**
   * Start the network
   */
  async start (): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true
  }

  /**
   * Stop all network activity
   */
  async stop (): Promise<void> {
    this.running = false
  }

  /**
   * Is the network online?
   */
  isStarted (): boolean {
    return this.running
  }

  /**
   * Send a request and record RTT for latency measurements
   */
  async * sendRequest (to: PeerId, msg: Message, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      return
    }

    this.log('sending %s to %p', msg.type, to)
    yield dialPeerEvent({ peer: to }, options)
    yield sendQueryEvent({ to, type: msg.type }, options)

    let stream: Stream | undefined

    try {
      const connection = await this.components.connectionManager.openConnection(to, options)
      const stream = await connection.newStream(this.protocol, options)

      const response = await this._writeReadMessage(stream, msg.serialize(), options)

      yield peerResponseEvent({
        from: to,
        messageType: response.type,
        closer: response.closerPeers,
        providers: response.providerPeers,
        record: response.record
      }, options)
    } catch (err: any) {
      yield queryErrorEvent({ from: to, error: err }, options)
    } finally {
      if (stream != null) {
        await stream.close()
      }
    }
  }

  /**
   * Sends a message without expecting an answer
   */
  async * sendMessage (to: PeerId, msg: Message, options: QueryOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      return
    }

    this.log('sending %s to %p', msg.type, to)
    yield dialPeerEvent({ peer: to }, options)
    yield sendQueryEvent({ to, type: msg.type }, options)

    let stream: Stream | undefined

    try {
      const connection = await this.components.connectionManager.openConnection(to, options)
      const stream = await connection.newStream(this.protocol, options)

      await this._writeMessage(stream, msg.serialize(), options)

      yield peerResponseEvent({ from: to, messageType: msg.type }, options)
    } catch (err: any) {
      yield queryErrorEvent({ from: to, error: err }, options)
    } finally {
      if (stream != null) {
        await stream.close()
      }
    }
  }

  /**
   * Write a message to the given stream
   */
  async _writeMessage (stream: Duplex<AsyncGenerator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>>, msg: Uint8Array | Uint8ArrayList, options: AbortOptions): Promise<void> {
    if (options.signal != null) {
      stream = abortableDuplex(stream, options.signal)
    }

    await pipe(
      [msg],
      (source) => lp.encode(source),
      stream,
      drain
    )
  }

  /**
   * Write a message and read its response.
   * If no response is received after the specified timeout
   * this will error out.
   */
  async _writeReadMessage (stream: Duplex<AsyncGenerator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>>, msg: Uint8Array | Uint8ArrayList, options: AbortOptions): Promise<Message> {
    if (options.signal != null) {
      stream = abortableDuplex(stream, options.signal)
    }

    const res = await pipe(
      [msg],
      (source) => lp.encode(source),
      stream,
      (source) => lp.decode(source),
      async source => {
        const buf = await first(source)

        if (buf != null) {
          return buf
        }

        throw new CodeError('No message received', 'ERR_NO_MESSAGE_RECEIVED')
      }
    )

    const message = Message.deserialize(res)

    // tell any listeners about new peers we've seen
    message.closerPeers.forEach(peerData => {
      this.dispatchEvent(new CustomEvent('peer', {
        detail: peerData
      }))
    })
    message.providerPeers.forEach(peerData => {
      this.dispatchEvent(new CustomEvent('peer', {
        detail: peerData
      }))
    })

    return message
  }
}
