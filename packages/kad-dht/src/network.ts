import { TypedEventEmitter } from '@libp2p/interface'
import { Libp2pRecord } from '@libp2p/record'
import { pbStream } from 'it-protobuf-stream'
import { CodeError } from 'protons-runtime'
import { Message } from './message/dht.js'
import { fromPbPeerInfo } from './message/utils.js'
import {
  dialPeerEvent,
  sendQueryEvent,
  peerResponseEvent,
  queryErrorEvent
} from './query/events.js'
import type { KadDHTComponents, QueryEvent } from './index.js'
import type { AbortOptions, Logger, Stream, PeerId, PeerInfo, Startable, RoutingOptions } from '@libp2p/interface'

export interface NetworkInit {
  protocol: string
  logPrefix: string
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

    const { protocol } = init
    this.components = components
    this.log = components.logger.forComponent(`${init.logPrefix}:network`)
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
  async * sendRequest (to: PeerId, msg: Partial<Message>, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      return
    }

    const type = msg.type

    if (type == null) {
      throw new CodeError('Message type was missing', 'ERR_INVALID_PARAMETERS')
    }

    this.log('sending %s to %p', msg.type, to)
    yield dialPeerEvent({ peer: to }, options)
    yield sendQueryEvent({ to, type }, options)

    let stream: Stream | undefined

    try {
      const connection = await this.components.connectionManager.openConnection(to, options)
      const stream = await connection.newStream(this.protocol, options)

      const response = await this._writeReadMessage(stream, msg, options)

      yield peerResponseEvent({
        from: to,
        messageType: response.type,
        closer: response.closer.map(fromPbPeerInfo),
        providers: response.providers.map(fromPbPeerInfo),
        record: response.record == null ? undefined : Libp2pRecord.deserialize(response.record)
      }, options)
    } catch (err: any) {
      this.log.error('could not send %s to %p', msg.type, to, err)
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
  async * sendMessage (to: PeerId, msg: Partial<Message>, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      return
    }

    const type = msg.type

    if (type == null) {
      throw new CodeError('Message type was missing', 'ERR_INVALID_PARAMETERS')
    }

    this.log('sending %s to %p', msg.type, to)
    yield dialPeerEvent({ peer: to }, options)
    yield sendQueryEvent({ to, type }, options)

    let stream: Stream | undefined

    try {
      const connection = await this.components.connectionManager.openConnection(to, options)
      const stream = await connection.newStream(this.protocol, options)

      await this._writeMessage(stream, msg, options)

      yield peerResponseEvent({ from: to, messageType: type }, options)
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
  async _writeMessage (stream: Stream, msg: Partial<Message>, options: AbortOptions): Promise<void> {
    const pb = pbStream(stream)
    await pb.write(msg, Message, options)
    await pb.unwrap().close(options)
  }

  /**
   * Write a message and read its response.
   * If no response is received after the specified timeout
   * this will error out.
   */
  async _writeReadMessage (stream: Stream, msg: Partial<Message>, options: AbortOptions): Promise<Message> {
    const pb = pbStream(stream)

    await pb.write(msg, Message, options)

    const message = await pb.read(Message, options)

    await pb.unwrap().close(options)

    // tell any listeners about new peers we've seen
    message.closer.forEach(peerData => {
      this.safeDispatchEvent<PeerInfo>('peer', {
        detail: fromPbPeerInfo(peerData)
      })
    })
    message.providers.forEach(peerData => {
      this.safeDispatchEvent<PeerInfo>('peer', {
        detail: fromPbPeerInfo(peerData)
      })
    })

    return message
  }
}
