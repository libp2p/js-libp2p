import { CodeError } from '@libp2p/interfaces/errors'
import { messages, codes } from '../errors.js'
import type { PeerRouting } from '@libp2p/interface-peer-routing'
import type { DHT, QueryEvent } from '@libp2p/interface-dht'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AbortOptions } from '@libp2p/interfaces'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { CustomProgressEvent, type ProgressEvent, type ProgressOptions } from 'progress-events'

export type FindPeerProgressEvents =
  ProgressEvent<'libp2p:peer-routing:find-peer:dht:event', QueryEvent>

export type GetClosestPeerProgressEvents =
  ProgressEvent<'libp2p:peer-routing:get-closest-peer:dht:event', QueryEvent>

/**
 * Wrapper class to convert events into returned values
 */
export class DHTPeerRouting implements PeerRouting<
  FindPeerProgressEvents,
  GetClosestPeerProgressEvents
> {
  private readonly dht: DHT

  constructor (dht: DHT) {
    this.dht = dht
  }

  async findPeer (peerId: PeerId, options: AbortOptions & ProgressOptions<FindPeerProgressEvents> = {}): Promise<PeerInfo> {
    for await (const event of this.dht.findPeer(peerId, options)) {
      options.onProgress?.(new CustomProgressEvent('libp2p:peer-routing:find-peer:dht:event', event))

      if (event.name === 'FINAL_PEER') {
        return event.peer
      }
    }

    throw new CodeError(messages.NOT_FOUND, codes.ERR_NOT_FOUND)
  }

  async * getClosestPeers (key: Uint8Array, options: AbortOptions & ProgressOptions<GetClosestPeerProgressEvents> = {}): AsyncIterable<PeerInfo> {
    for await (const event of this.dht.getClosestPeers(key, options)) {
      options.onProgress?.(new CustomProgressEvent('libp2p:peer-routing:get-closest-peer:dht:event', event))

      if (event.name === 'FINAL_PEER') {
        yield event.peer
      }
    }
  }
}
