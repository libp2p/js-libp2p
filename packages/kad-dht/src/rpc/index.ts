import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
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
import { type CounterGroup, type Logger, type Metrics, type PeerId, type IncomingStreamData, TimeoutError } from '@libp2p/interface'

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
  }
  private readonly incomingMessageTimeout: number

  constructor (components: RPCComponents, init: RPCInit) {
    this.metrics = {
      operations: components.metrics?.registerCounterGroup(`${init.metricsPrefix}_inbound_rpc_requests_total`),
      errors: components.metrics?.registerCounterGroup(`${init.metricsPrefix}_inbound_rpc_errors_total`)
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
    let message = 'unknown'

    Promise.resolve().then(async () => {
      const { stream, connection } = data
      const peerId = connection.remotePeer
      const self = this

      const abortListener = (): void => {
        stream.abort(new TimeoutError())
      }

      let signal = AbortSignal.timeout(this.incomingMessageTimeout)
      signal.addEventListener('abort', abortListener)

      await pipe(
        stream,
        (source) => lp.decode(source),
        async function * (source) {
          for await (const msg of source) {
            // handle the message
            const desMessage = Message.decode(msg)
            message = desMessage.type
            self.log('incoming %s from %p', desMessage.type, peerId)
            const res = await self.handleMessage(peerId, desMessage)

            // Not all handlers will return a response
            if (res != null) {
              yield Message.encode(res)
            }

            // we have received a message so reset the timeout controller to
            // allow the remote to send another
            signal.removeEventListener('abort', abortListener)
            signal = AbortSignal.timeout(self.incomingMessageTimeout)
            signal.addEventListener('abort', abortListener)
          }
        },
        (source) => lp.encode(source),
        stream
      )
    })
      .catch(err => {
        this.log.error('error handling %s RPC message from %p - %e', message, data.connection.remotePeer, err)
      })
  }
}
