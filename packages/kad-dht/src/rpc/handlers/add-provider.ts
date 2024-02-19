import { CodeError } from '@libp2p/interface'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { CID } from 'multiformats/cid'
import type { Message } from '../../message/dht.js'
import type { Providers } from '../../providers'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId } from '@libp2p/interface'

export interface AddProviderComponents {
  logger: ComponentLogger
}

export interface AddProviderHandlerInit {
  providers: Providers
  logPrefix: string
}

export class AddProviderHandler implements DHTMessageHandler {
  private readonly providers: Providers
  private readonly log: Logger

  constructor (components: AddProviderComponents, init: AddProviderHandlerInit) {
    this.log = components.logger.forComponent(`${init.logPrefix}:rpc:handlers:add-provider`)
    this.providers = init.providers
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message | undefined> {
    this.log('start')

    if (msg.key == null || msg.key.length === 0) {
      throw new CodeError('Missing key', 'ERR_MISSING_KEY')
    }

    let cid: CID
    try {
      // this is actually just the multihash, not the whole CID
      cid = CID.decode(msg.key)
    } catch (err: any) {
      throw new CodeError('Invalid CID', 'ERR_INVALID_CID')
    }

    if (msg.providers == null || msg.providers.length === 0) {
      this.log.error('no providers found in message')
    }

    await Promise.all(
      msg.providers.map(async (pi) => {
        // Ignore providers not from the originator
        if (!peerId.equals(pi.id)) {
          this.log('invalid provider peer %p from %p', pi.id, peerId)
          return
        }

        if (pi.multiaddrs.length < 1) {
          this.log('no valid addresses for provider %p. Ignore', peerId)
          return
        }

        this.log('received provider %p for %s (addrs %s)', peerId, cid, pi.multiaddrs.map((m) => multiaddr(m).toString()))

        await this.providers.addProvider(cid, peerIdFromBytes(pi.id))
      })
    )

    return undefined
  }
}
