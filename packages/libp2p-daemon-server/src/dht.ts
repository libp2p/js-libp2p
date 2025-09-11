/* eslint max-depth: ["error", 6] */

import {
  DHTResponse
} from '@libp2p/daemon-protocol'
import { logger } from '@libp2p/logger'
import drain from 'it-drain'
import { ErrorResponse, OkResponse } from './responses.js'
import type { PeerId } from '@libp2p/interface'
import type { KadDHT } from '@libp2p/kad-dht'
import type { CID } from 'multiformats/cid'

const log = logger('libp2p:daemon-server:dht')

export interface DHTOperationsInit {
  dht: KadDHT
}

export class DHTOperations {
  private readonly dht: KadDHT

  constructor (init: DHTOperationsInit) {
    const { dht } = init

    this.dht = dht
  }

  async * provide (cid: CID): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      await drain(this.dht.provide(cid))
      yield OkResponse()
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * getClosestPeers (key: Uint8Array): AsyncGenerator<Uint8Array, void, undefined> {
    yield OkResponse({
      dht: {
        type: DHTResponse.Type.BEGIN
      }
    })

    for await (const event of this.dht.getClosestPeers(key)) {
      if (event.name === 'PEER_RESPONSE') {
        yield * event.closer.map(peer => DHTResponse.encode({
          type: DHTResponse.Type.VALUE,
          value: peer.id.toMultihash().bytes
        }))
      }
    }

    yield DHTResponse.encode({
      type: DHTResponse.Type.END
    })
  }

  async * getPublicKey (peerId: PeerId): AsyncGenerator<Uint8Array, void, undefined> {
    yield ErrorResponse(new Error('FIX ME: not implemented'))
  }

  async * getValue (key: Uint8Array): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      for await (const event of this.dht.get(key)) {
        if (event.name === 'VALUE') {
          yield OkResponse({
            dht: {
              type: DHTResponse.Type.VALUE,
              value: event.value
            }
          })
        }
      }
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * putValue (key: Uint8Array, value: Uint8Array): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      await drain(this.dht.put(key, value))

      yield OkResponse()
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * findPeer (peerId: PeerId): AsyncGenerator<Uint8Array, void, undefined> {
    try {
      for await (const event of this.dht.findPeer(peerId)) {
        if (event.name === 'FINAL_PEER') {
          yield OkResponse({
            dht: {
              type: DHTResponse.Type.VALUE,
              peer: {
                id: event.peer.id.toMultihash().bytes,
                addrs: event.peer.multiaddrs.map(m => m.bytes)
              }
            }
          })
        }
      }

      throw new Error('Peer not found')
    } catch (err: any) {
      log.error(err)
      yield ErrorResponse(err)
    }
  }

  async * findProviders (cid: CID, count: number): AsyncGenerator<Uint8Array, void, undefined> {
    yield OkResponse({
      dht: {
        type: DHTResponse.Type.BEGIN
      }
    })

    try {
      const maxNumProviders = count
      let found = 0

      for await (const event of this.dht.findProviders(cid)) {
        if (event.name === 'PEER_RESPONSE') {
          for (const provider of event.providers) {
            found++

            yield DHTResponse.encode({
              type: DHTResponse.Type.VALUE,
              peer: {
                id: provider.id.toMultihash().bytes,
                addrs: (provider.multiaddrs ?? []).map(m => m.bytes)
              }
            })
          }

          if (maxNumProviders === found) {
            break
          }
        }
      }
    } catch (err: any) {
      yield ErrorResponse(err)
    }

    yield DHTResponse.encode({
      type: DHTResponse.Type.END
    })
  }
}
