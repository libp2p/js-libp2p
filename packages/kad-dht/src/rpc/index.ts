import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { Message, MESSAGE_TYPE } from '../message/index.js'
import { AddProviderHandler } from './handlers/add-provider.js'
import { FindNodeHandler, type FindNodeHandlerComponents } from './handlers/find-node.js'
import { GetProvidersHandler, type GetProvidersHandlerComponents } from './handlers/get-providers.js'
import { GetValueHandler, type GetValueHandlerComponents } from './handlers/get-value.js'
import { PingHandler } from './handlers/ping.js'
import { PutValueHandler, type PutValueHandlerComponents } from './handlers/put-value.js'
import type { Validators } from '../index.js'
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
  lan: boolean
}

export interface RPCComponents extends GetValueHandlerComponents, PutValueHandlerComponents, FindNodeHandlerComponents, GetProvidersHandlerComponents {

}

export class RPC {
  private readonly handlers: Record<string, DHTMessageHandler>
  private readonly routingTable: RoutingTable
  private readonly log: Logger

  constructor (components: RPCComponents, init: RPCInit) {
    const { providers, peerRouting, validators, lan } = init

    this.log = components.logger.forComponent('libp2p:kad-dht:rpc')
    this.routingTable = init.routingTable
    this.handlers = {
      [MESSAGE_TYPE.GET_VALUE]: new GetValueHandler(components, { peerRouting }),
      [MESSAGE_TYPE.PUT_VALUE]: new PutValueHandler(components, { validators }),
      [MESSAGE_TYPE.FIND_NODE]: new FindNodeHandler(components, { peerRouting, lan }),
      [MESSAGE_TYPE.ADD_PROVIDER]: new AddProviderHandler(components, { providers }),
      [MESSAGE_TYPE.GET_PROVIDERS]: new GetProvidersHandler(components, { peerRouting, providers, lan }),
      [MESSAGE_TYPE.PING]: new PingHandler(components)
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
            const desMessage = Message.deserialize(msg)
            self.log('incoming %s from %p', desMessage.type, peerId)
            const res = await self.handleMessage(peerId, desMessage)

            // Not all handlers will return a response
            if (res != null) {
              yield res.serialize()
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
