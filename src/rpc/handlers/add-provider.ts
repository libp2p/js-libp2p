import { CID } from 'multiformats/cid'
import { CodeError } from '@libp2p/interfaces/errors'
import { logger } from '@libp2p/logger'
import type { Providers } from '../../providers'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { DHTMessageHandler } from '../index.js'
import type { Message } from '../../message/index.js'

const log = logger('libp2p:kad-dht:rpc:handlers:add-provider')

export interface AddProviderHandlerInit {
  providers: Providers
}

export class AddProviderHandler implements DHTMessageHandler {
  private readonly providers: Providers

  constructor (init: AddProviderHandlerInit) {
    const { providers } = init
    this.providers = providers
  }

  async handle (peerId: PeerId, msg: Message): Promise<Message | undefined> {
    log('start')

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

    if (msg.providerPeers == null || msg.providerPeers.length === 0) {
      log.error('no providers found in message')
    }

    await Promise.all(
      msg.providerPeers.map(async (pi) => {
        // Ignore providers not from the originator
        if (!pi.id.equals(peerId)) {
          log('invalid provider peer %p from %p', pi.id, peerId)
          return
        }

        if (pi.multiaddrs.length < 1) {
          log('no valid addresses for provider %p. Ignore', peerId)
          return
        }

        log('received provider %p for %s (addrs %s)', peerId, cid, pi.multiaddrs.map((m) => m.toString()))

        await this.providers.addProvider(cid, pi.id)
      })
    )

    return undefined
  }
}
