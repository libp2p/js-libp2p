import { InvalidMessageError, TimeoutError } from '@libp2p/interface'
import { pbStream } from '@libp2p/utils'
import { Message, MessageType } from '../message/dht.ts'
import { AddProviderHandler } from './handlers/add-provider.ts'
import { FindNodeHandler } from './handlers/find-node.ts'
import { GetProvidersHandler } from './handlers/get-providers.ts'
import { GetValueHandler } from './handlers/get-value.ts'
import { PingHandler } from './handlers/ping.ts'
import { PutValueHandler } from './handlers/put-value.ts'
import type { PeerInfoMapper, Validators } from '../index.ts'
import type { PeerRouting } from '../peer-routing/index.ts'
import type { Providers } from '../providers.ts'
import type { FindNodeHandlerComponents } from './handlers/find-node.ts'
import type { GetProvidersHandlerComponents } from './handlers/get-providers.ts'
import type { GetValueHandlerComponents } from './handlers/get-value.ts'
import type { PutValueHandlerComponents } from './handlers/put-value.ts'
import type { RoutingTable } from '../routing-table/index.ts'
import type { CounterGroup, Logger, Metrics, PeerId, MetricGroup, Connection, Stream } from '@libp2p/interface'

export interface DHTMessageHandler {
  handle(peerId: PeerId, msg: Message): Promise<Message | undefined>
}

export interface RPCInit {
  routingTable: RoutingTable
  providers: Providers
  peerRouting: PeerRouting
  validators: Validators
  logPrefix: string
  metricsPrefix: string
  datastorePrefix: string
  peerInfoMapper: PeerInfoMapper
  incomingMessageTimeout?: number
}

export interface RPCComponents extends GetValueHandlerComponents, PutValueHandlerComponents, FindNodeHandlerComponents, GetProvidersHandlerComponents {
  metrics?: Metrics
}

export class RPC {
  private readonly handlers: Record<string, DHTMessageHandler>
  private readonly log: Logger
  private readonly metrics: {
    operations?: CounterGroup
    errors?: CounterGroup
    rpcTime?: MetricGroup
  }

  private readonly incomingMessageTimeout: number

  constructor (components: RPCComponents, init: RPCInit) {
    this.metrics = {
      operations: components.metrics?.registerCounterGroup(`${init.metricsPrefix}_inbound_rpc_requests_total`),
      errors: components.metrics?.registerCounterGroup(`${init.metricsPrefix}_inbound_rpc_errors_total`),
      rpcTime: components.metrics?.registerMetricGroup(`${init.metricsPrefix}_inbound_rpc_time_seconds`, { label: 'operation' })
    }

    this.log = components.logger.forComponent(`${init.logPrefix}:rpc`)
    this.incomingMessageTimeout = init.incomingMessageTimeout ?? 10_000
    this.handlers = {
      [MessageType.GET_VALUE.toString()]: new GetValueHandler(components, init),
      [MessageType.PUT_VALUE.toString()]: new PutValueHandler(components, init),
      [MessageType.FIND_NODE.toString()]: new FindNodeHandler(components, init),
      [MessageType.ADD_PROVIDER.toString()]: new AddProviderHandler(components, init),
      [MessageType.GET_PROVIDERS.toString()]: new GetProvidersHandler(components, init),
      [MessageType.PING.toString()]: new PingHandler(components, init)
    }
  }

  /**
   * Process incoming DHT messages
   */
  async handleMessage (peerId: PeerId, msg: Message): Promise<Message | undefined> {
    // get handler & execute it
    const handler = this.handlers[msg.type]

    if (handler == null) {
      throw new InvalidMessageError(`No handler found for message type: ${msg.type}`)
    }

    try {
      this.metrics.operations?.increment({
        [msg.type]: true
      })

      return await handler.handle(peerId, msg)
    } catch (err) {
      this.metrics.errors?.increment({
        [msg.type]: true
      })

      throw err
    }
  }

  /**
   * Handle incoming streams on the dht protocol
   */
  async onIncomingStream (stream: Stream, connection: Connection): Promise<void> {
    const abortListener = (): void => {
      stream.abort(new TimeoutError())
    }

    let signal = AbortSignal.timeout(this.incomingMessageTimeout)
    signal.addEventListener('abort', abortListener)

    const messages = pbStream(stream).pb(Message)

    while (true) {
      // the remote will not send any more data
      if (stream.readStatus !== 'readable') {
        await stream.close({
          signal
        })

        break
      }

      const message = await messages.read({
        signal
      })

      const stopSuccessTimer = this.metrics?.rpcTime?.timer(message.type.toString())
      const stopErrorTimer = this.metrics?.rpcTime?.timer(message.type.toString())
      let errored = false

      try {
        // handle the message
        this.log('incoming %s from %p', message.type, connection.remotePeer)
        const res = await this.handleMessage(connection.remotePeer, message)

        // Not all handlers will return a response
        if (res != null) {
          await messages.write(res, {
            signal
          })
        }
      } catch (err: any) {
        errored = true
        stopErrorTimer?.()

        this.log.error('error handling incoming message - %e', err)
        stream.abort(err)

        return
      } finally {
        if (!errored) {
          stopSuccessTimer?.()
        }
      }

      // we have received a message so reset the timeout controller to
      // allow the remote to send another
      signal.removeEventListener('abort', abortListener)
      signal = AbortSignal.timeout(this.incomingMessageTimeout)
      signal.addEventListener('abort', abortListener)
    }
  }
}
