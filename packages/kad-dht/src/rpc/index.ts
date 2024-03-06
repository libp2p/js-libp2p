import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { Message, MessageType } from '../message/dht.js'
import { AddProviderHandler } from './handlers/add-provider.js'
import { FindNodeHandler, type FindNodeHandlerComponents } from './handlers/find-node.js'
import { GetProvidersHandler, type GetProvidersHandlerComponents } from './handlers/get-providers.js'
import { GetValueHandler, type GetValueHandlerComponents } from './handlers/get-value.js'
import { PingHandler } from './handlers/ping.js'
import { PutValueHandler, type PutValueHandlerComponents } from './handlers/put-value.js'
import type { PeerInfoMapper, Validators } from '../index.js'
import type { PeerRouting } from '../peer-routing'
import type { Providers } from '../providers'
import type { RoutingTable } from '../routing-table'
import type { Logger, PeerId } from '@libp2p/interface'
import type { IncomingStreamData } from '@libp2p/interface-internal'

export interface DHTMessageHandler {
  handle(peerId: PeerId, msg: Message): Promise<Message | undefined>
}

export interface RPCInit {
  routingTable: RoutingTable
  providers: Providers
  peerRouting: PeerRouting
  validators: Validators
  logPrefix: string
  peerInfoMapper: PeerInfoMapper
}

export interface RPCComponents extends GetValueHandlerComponents, PutValueHandlerComponents, FindNodeHandlerComponents, GetProvidersHandlerComponents {

}

export class RPC {
  private readonly handlers: Record<string, DHTMessageHandler>
  private readonly routingTable: RoutingTable
  private readonly log: Logger

  constructor (components: RPCComponents, init: RPCInit) {
    const { providers, peerRouting, validators, logPrefix, peerInfoMapper } = init

    this.log = components.logger.forComponent(`${logPrefix}:rpc`)
    this.routingTable = init.routingTable
    this.handlers = {
      [MessageType.GET_VALUE.toString()]: new GetValueHandler(components, { peerRouting, logPrefix }),
      [MessageType.PUT_VALUE.toString()]: new PutValueHandler(components, { validators, logPrefix }),
      [MessageType.FIND_NODE.toString()]: new FindNodeHandler(components, { peerRouting, logPrefix, peerInfoMapper }),
      [MessageType.ADD_PROVIDER.toString()]: new AddProviderHandler(components, { providers, logPrefix }),
      [MessageType.GET_PROVIDERS.toString()]: new GetProvidersHandler(components, { peerRouting, providers, logPrefix, peerInfoMapper }),
      [MessageType.PING.toString()]: new PingHandler(components, { logPrefix })
    }
  }

  /**
   * Process incoming DHT messages
   */
  async handleMessage (peerId: PeerId, msg: Message): Promise<Message | undefined> {
    try {
      await this.routingTable.add(peerId)
    } catch (err: any) {
      this.log.error('Failed to update the kbucket store', err)
    }

    // get handler & execute it
    const handler = this.handlers[msg.type]

    if (handler == null) {
      this.log.error(`no handler found for message type: ${msg.type}`)
      return
    }

    return handler.handle(peerId, msg)
  }

  /**
   * Handle incoming streams on the dht protocol
   */
  onIncomingStream (data: IncomingStreamData): void {
    Promise.resolve().then(async () => {
      const { stream, connection } = data
      const peerId = connection.remotePeer

      try {
        await this.routingTable.add(peerId)
      } catch (err: any) {
        this.log.error(err)
      }

      const self = this // eslint-disable-line @typescript-eslint/no-this-alias

      await pipe(
        stream,
        (source) => lp.decode(source),
        async function * (source) {
          for await (const msg of source) {
            // handle the message
            const desMessage = Message.decode(msg)
            self.log('incoming %s from %p', desMessage.type, peerId)
            const res = await self.handleMessage(peerId, desMessage)

            // Not all handlers will return a response
            if (res != null) {
              yield Message.encode(res)
            }
          }
        },
        (source) => lp.encode(source),
        stream
      )
    })
      .catch(err => {
        this.log.error(err)
      })
  }
}
