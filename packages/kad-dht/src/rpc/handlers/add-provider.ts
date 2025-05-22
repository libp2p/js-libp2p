import { InvalidMessageError } from '@libp2p/interface'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import type { Message } from '../../message/dht.js'
import type { Providers } from '../../providers.js'
import type { DHTMessageHandler } from '../index.js'
import type { ComponentLogger, Logger, PeerId, PeerStore } from '@libp2p/interface'

export interface AddProviderComponents {
  peerId: PeerId
  peerStore: PeerStore
  logger: ComponentLogger
}

export interface AddProviderHandlerInit {
  providers: Providers
  logPrefix: string
}

export class AddProviderHandler implements DHTMessageHandler {
  private readonly peerId: PeerId
  private readonly providers: Providers
  private readonly peerStore: PeerStore
  private readonly log: Logger

  constructor (components: AddProviderComponents, init: AddProviderHandlerInit) {
    this.log = components.logger.forComponent(`${init.logPrefix}:rpc:handlers:add-provider`)
    this.peerId = components.peerId
    this.providers = init.providers
    this.peerStore = components.peerStore
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message | undefined> {
    if (msg.key == null || msg.key.length === 0) {
      throw new InvalidMessageError('Missing key')
    }

    let cid: CID
    try {
      // this is actually just the multihash, not the whole CID
      cid = CID.decode(msg.key)
    } catch (err: any) {
      throw new InvalidMessageError('Invalid CID')
    }

    if (msg.providers == null || msg.providers.length === 0) {
      this.log.error('no providers found in message')
    }

    this.log('%p asked us, %p to store provider record for for %c', peerId, this.peerId, cid)

    await Promise.all(
      msg.providers.map(async (pi) => {
        const digest = Digest.decode(pi.id)
        const providerId = peerIdFromMultihash(digest)
        const providerMultiaddrs = pi.multiaddrs.map(buf => multiaddr(buf))

        // Ignore providers not from the originator
        if (!peerId.equals(providerId)) {
          this.log('invalid provider peer %p from %p', pi.id, peerId)
          return
        }

        if (pi.multiaddrs.length < 1) {
          this.log('no valid addresses for provider %p. Ignore', peerId)
          return
        }

        this.log.trace('received provider %p for %s (addrs %s)', peerId, cid, providerMultiaddrs)

        await this.providers.addProvider(cid, providerId)
        await this.peerStore.merge(providerId, {
          multiaddrs: providerMultiaddrs
        })
      })
    )

    return undefined
  }
}
