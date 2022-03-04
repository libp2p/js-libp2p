import { pipe } from 'it-pipe'
import * as lp from 'it-length-prefixed'
import { Logger, logger } from '@libp2p/logger'
import type { RoutingTable } from '../routing-table'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { Message, MESSAGE_TYPE, MESSAGE_TYPE_LOOKUP } from '../message/index.js'
import { AddProviderHandler } from './handlers/add-provider.js'
import { FindNodeHandler } from './handlers/find-node.js'
import { GetProvidersHandler } from './handlers/get-providers.js'
import { GetValueHandler } from './handlers/get-value.js'
import { PingHandler } from './handlers/ping.js'
import { PutValueHandler } from './handlers/put-value.js'
import type { IncomingStreamData } from '@libp2p/interfaces/registrar'
import type { KeyBook, AddressBook } from '@libp2p/interfaces/peer-store'
import type { Providers } from '../providers'
import type { PeerRouting } from '../peer-routing'
import type { Datastore } from 'interface-datastore'
import type { Validators } from '@libp2p/interfaces/dht'

export interface DHTMessageHandler {
  handle: (peerId: PeerId, msg: Message) => Promise<Message | undefined>
}

export interface RPCOptions {
  peerId: PeerId
  routingTable: RoutingTable
  keyBook: KeyBook
  addressBook: AddressBook
  providers: Providers
  peerRouting: PeerRouting
  datastore: Datastore
  validators: Validators
  lan: boolean
}

export class RPC {
  private readonly handlers: Record<number, DHTMessageHandler>
  private readonly routingTable: RoutingTable
  private readonly log: Logger

  constructor (options: RPCOptions) {
    const { keyBook, addressBook, providers, peerRouting, datastore, validators, lan, peerId } = options

    this.log = logger('libp2p:kad-dht:rpc:' + peerId.toString())

    this.routingTable = options.routingTable
    this.handlers = {
      [MESSAGE_TYPE.GET_VALUE]: new GetValueHandler({ keyBook, peerRouting, datastore }),
      [MESSAGE_TYPE.PUT_VALUE]: new PutValueHandler({ peerId, validators, datastore }),
      [MESSAGE_TYPE.FIND_NODE]: new FindNodeHandler({ peerRouting, lan }),
      [MESSAGE_TYPE.ADD_PROVIDER]: new AddProviderHandler({ providers }),
      [MESSAGE_TYPE.GET_PROVIDERS]: new GetProvidersHandler({ peerRouting, providers, addressBook, lan }),
      [MESSAGE_TYPE.PING]: new PingHandler()
    }
  }

  /**
   * Process incoming DHT messages
   */
  async handleMessage (peerId: PeerId, msg: Message) {
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

    return await handler.handle(peerId, msg)
  }

  /**
   * Handle incoming streams on the dht protocol
   */
  onIncomingStream (evt: CustomEvent<IncomingStreamData>) {
    Promise.resolve().then(async () => {
      const { stream, connection } = evt.detail
      const peerId = connection.remotePeer

      try {
        await this.routingTable.add(peerId)
      } catch (err: any) {
        this.log.error(err)
      }

      const self = this // eslint-disable-line @typescript-eslint/no-this-alias

      await pipe(
        stream.source,
        lp.decode(),
        source => (async function * () {
          for await (const msg of source) {
            // handle the message
            const desMessage = Message.deserialize(msg.slice())
            self.log('incoming %s from %p', MESSAGE_TYPE_LOOKUP[desMessage.type], peerId)
            const res = await self.handleMessage(peerId, desMessage)

            // Not all handlers will return a response
            if (res != null) {
              yield res.serialize()
            }
          }
        })(),
        lp.encode(),
        stream.sink
      )
    })
      .catch(err => {
        this.log.error(err)
      })
  }
}
