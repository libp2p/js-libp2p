import { CID } from 'multiformats/cid'
import errcode from 'err-code'
import { logger } from '@libp2p/logger'
import type { Providers } from '../../providers'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { DHTMessageHandler } from '../index.js'
import type { Message } from '../../message/index.js'
import type { Initializable } from '@libp2p/interfaces/components'

const log = logger('libp2p:kad-dht:rpc:handlers:add-provider')

export interface AddProviderHandlerInit {
  providers: Providers
}

export class AddProviderHandler implements DHTMessageHandler, Initializable {
  private readonly providers: Providers

  constructor (init: AddProviderHandlerInit) {
    const { providers } = init
    this.providers = providers
  }

  init (): void {

  }

  async handle (peerId: PeerId, msg: Message) {
    log('start')

    if (msg.key == null || msg.key.length === 0) {
      throw errcode(new Error('Missing key'), 'ERR_MISSING_KEY')
    }

    let cid: CID
    try {
      // this is actually just the multihash, not the whole CID
      cid = CID.decode(msg.key)
    } catch (err: any) {
      throw errcode(new Error('Invalid CID'), 'ERR_INVALID_CID')
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
