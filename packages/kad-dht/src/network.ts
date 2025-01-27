import { InvalidParametersError, TypedEventEmitter } from '@libp2p/interface'
import { Libp2pRecord } from '@libp2p/record'
import { AdaptiveTimeout, type AdaptiveTimeoutInit } from '@libp2p/utils/adaptive-timeout'
import { pbStream } from 'it-protobuf-stream'
import { Message } from './message/dht.js'
import { fromPbPeerInfo } from './message/utils.js'
import {
  dialPeerEvent,
  sendQueryEvent,
  peerResponseEvent,
  queryErrorEvent
} from './query/events.js'
import type { KadDHTComponents, QueryEvent } from './index.js'
import type { AbortOptions, Logger, Stream, PeerId, PeerInfo, Startable, RoutingOptions, CounterGroup } from '@libp2p/interface'

export interface NetworkInit {
  protocol: string
  logPrefix: string
  metricsPrefix: string
  timeout?: Omit<AdaptiveTimeoutInit, 'metricsName' | 'metrics'>
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
  private readonly timeout: AdaptiveTimeout
  private readonly metrics: {
    operations?: CounterGroup
    errors?: CounterGroup
  }

  /**
   * Create a new network
   */
  constructor (components: KadDHTComponents, init: NetworkInit) {
    super()

    this.components = components
    this.log = components.logger.forComponent(`${init.logPrefix}:network`)
    this.running = false
    this.protocol = init.protocol
    this.timeout = new AdaptiveTimeout({
      ...(init.timeout ?? {}),
      metrics: components.metrics,
      metricName: `${init.metricsPrefix}_network_message_send_times_milliseconds`
    })
    this.metrics = {
      operations: components.metrics?.registerCounterGroup(`${init.metricsPrefix}_outbound_rpc_requests_total`),
      errors: components.metrics?.registerCounterGroup(`${init.metricsPrefix}_outbound_rpc_errors_total`)
    }

    this.sendRequest = components.metrics?.traceFunction('libp2p.kadDHT.sendRequest', this.sendRequest.bind(this), {
      optionsIndex: 2,
      getAttributesFromArgs ([to, message], attrs) {
        return {
          ...attrs,
          to: to.toString(),
          'message type': `${message.type}`
        }
      },
      getAttributesFromYieldedValue: (event, attrs) => {
        if (event.name === 'PEER_RESPONSE') {
          if (event.providers.length > 0) {
            event.providers.forEach((value, index) => {
              attrs[`providers-${index}`] = value.id.toString()
            })
          }

          if (event.closer.length > 0) {
            event.closer.forEach((value, index) => {
              attrs[`closer-${index}`] = value.id.toString()
            })
          }
        }

        return attrs
      }
    }) ?? this.sendRequest
    this.sendMessage = components.metrics?.traceFunction('libp2p.kadDHT.sendMessage', this.sendMessage.bind(this), {
      optionsIndex: 2,
      getAttributesFromArgs ([to, message], attrs) {
        return {
          ...attrs,
          to: to.toString(),
          'message type': `${message.type}`
        }
      },
      getAttributesFromYieldedValue: (event, attrs) => {
        if (event.name === 'PEER_RESPONSE') {
          if (event.providers.length > 0) {
            event.providers.forEach((value, index) => {
              attrs[`providers-${index}`] = value.id.toString()
            })
          }

          if (event.closer.length > 0) {
            event.closer.forEach((value, index) => {
              attrs[`closer-${index}`] = value.id.toString()
            })
          }
        }

        return attrs
      }
    }) ?? this.sendMessage
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
   * Send a request and read a response
   */
  async * sendRequest (to: PeerId, msg: Partial<Message>, options: RoutingOptions = {}): AsyncGenerator<QueryEvent> {
    if (!this.running) {
      return
    }

    const type = msg.type

    if (type == null) {
      throw new InvalidParametersError('Message type was missing')
    }

    this.log('sending %s to %p', msg.type, to)
    yield dialPeerEvent({ peer: to }, options)
    yield sendQueryEvent({ to, type }, options)

    let stream: Stream | undefined
    const signal = this.timeout.getTimeoutSignal(options)

    options = {
      ...options,
      signal
    }

    try {
      this.metrics.operations?.increment({ [type]: true })

      const connection = await this.components.connectionManager.openConnection(to, options)
      stream = await connection.newStream(this.protocol, options)
      const response = await this._writeReadMessage(stream, msg, options)

      stream.close(options)
        .catch(err => {
          this.log.error('error closing stream to %p', to, err)
          stream?.abort(err)
        })

      yield peerResponseEvent({
        from: to,
        messageType: response.type,
        closer: response.closer.map(fromPbPeerInfo),
        providers: response.providers.map(fromPbPeerInfo),
        record: response.record == null ? undefined : Libp2pRecord.deserialize(response.record)
      }, options)
    } catch (err: any) {
      this.metrics.errors?.increment({ [type]: true })

      stream?.abort(err)

      // only log if the incoming signal was not aborted - this means we were
      // no longer interested in the query result
      if (options.signal?.aborted !== true) {
        this.log.error('could not send %s to %p - %e', msg.type, to, err)
      }

      yield queryErrorEvent({ from: to, error: err }, options)
    } finally {
      this.timeout.cleanUp(signal)
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
      throw new InvalidParametersError('Message type was missing')
    }

    this.log('sending %s to %p', msg.type, to)
    yield dialPeerEvent({ peer: to }, options)
    yield sendQueryEvent({ to, type }, options)

    let stream: Stream | undefined
    const signal = this.timeout.getTimeoutSignal(options)

    options = {
      ...options,
      signal
    }

    try {
      this.metrics.operations?.increment({ [type]: true })

      const connection = await this.components.connectionManager.openConnection(to, options)
      stream = await connection.newStream(this.protocol, options)

      await this._writeMessage(stream, msg, options)

      stream.close(options)
        .catch(err => {
          this.log.error('error closing stream to %p', to, err)
          stream?.abort(err)
        })

      yield peerResponseEvent({ from: to, messageType: type }, options)
    } catch (err: any) {
      this.metrics.errors?.increment({ [type]: true })

      stream?.abort(err)
      yield queryErrorEvent({ from: to, error: err }, options)
    } finally {
      this.timeout.cleanUp(signal)
    }
  }

  /**
   * Write a message to the given stream
   */
  async _writeMessage (stream: Stream, msg: Partial<Message>, options: AbortOptions): Promise<void> {
    const pb = pbStream(stream)
    await pb.write(msg, Message, options)
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
