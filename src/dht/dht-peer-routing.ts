import errCode from 'err-code'
import { messages, codes } from '../errors.js'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { DHT } from '@libp2p/interface-dht'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AbortOptions } from '@libp2p/interfaces'

/**
 * Wrapper class to convert events into returned values
 */
export class DHTPeerRouting implements PeerRouting {
  private readonly dht: DHT

  constructor (dht: DHT) {
    this.dht = dht
  }

  async findPeer (peerId: PeerId, options: AbortOptions = {}) {
    for await (const event of this.dht.findPeer(peerId, options)) {
      if (event.name === 'FINAL_PEER') {
        return event.peer
      }
    }

    throw errCode(new Error(messages.NOT_FOUND), codes.ERR_NOT_FOUND)
  }

  async * getClosestPeers (key: Uint8Array, options: AbortOptions = {}) {
    for await (const event of this.dht.getClosestPeers(key, options)) {
      if (event.name === 'FINAL_PEER') {
        yield event.peer
      }
    }
  }
}
