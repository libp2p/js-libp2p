import { TimeoutError } from '@libp2p/interface'
import { pbStream } from 'it-protobuf-stream'
import { Message, MessageType } from '../message/dht.js'
import { AddProviderHandler } from './handlers/add-provider.js'
import { FindNodeHandler } from './handlers/find-node.js'
import { GetProvidersHandler } from './handlers/get-providers.js'
import { GetValueHandler } from './handlers/get-value.js'
import { PingHandler } from './handlers/ping.js'
import { PutValueHandler } from './handlers/put-value.js'
import type { PeerInfoMapper, Validators } from '../index.js'
import type { PeerRouting } from '../peer-routing/index.js'
import type { Providers } from '../providers.js'
import type { FindNodeHandlerComponents } from './handlers/find-node.js'
import type { GetProvidersHandlerComponents } from './handlers/get-providers.js'
import type { GetValueHandlerComponents } from './handlers/get-value.js'
import type { PutValueHandlerComponents } from './handlers/put-value.js'
import type { RoutingTable } from '../routing-table/index.js'
import type { CounterGroup, Logger, Metrics, PeerId, IncomingStreamData, MetricGroup } from '@libp2p/interface'

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
      this.log.error(`no handler found for message type: ${msg.type}`)
      return
    }

    try {
      this.metrics.operations?.increment({
        [msg.type]: true
      })

      return await handler.handle(peerId, msg)
    } catch {
      this.metrics.errors?.increment({
        [msg.type]: true
      })
    }
  }

  /**
   * Handle incoming streams on the dht protocol
   */
  onIncomingStream (data: IncomingStreamData): void {
    const message = 'unknown'

    Promise.resolve().then(async () => {
      const { stream, connection } = data

      const abortListener = (): void => {
        stream.abort(new TimeoutError())
      }

      let signal = AbortSignal.timeout(this.incomingMessageTimeout)
      signal.addEventListener('abort', abortListener)

      const messages = pbStream(stream).pb(Message)

      try {
        while (true) {
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
          } catch (err) {
            errored = true
            stopErrorTimer?.()

            throw err
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
      } catch (err: any) {
        stream.abort(err)
      }
    })
      .catch(err => {
        this.log.error('error handling %s RPC message from %p - %e', message, data.connection.remotePeer, err)
      })
  }
}
