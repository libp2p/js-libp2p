import drain from 'it-drain'
import { CodeError } from '@libp2p/interfaces/errors'
import type { DHT } from '@libp2p/interface-dht'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { CID } from 'multiformats/cid'
import type { AbortOptions } from '@libp2p/interfaces'
import type { PeerInfo } from '@libp2p/interface-peer-info'

/**
 * Wrapper class to convert events into returned values
 */
export class DHTContentRouting implements ContentRouting {
  private readonly dht: DHT

  constructor (dht: DHT) {
    this.dht = dht
  }

  async provide (cid: CID): Promise<void> {
    await drain(this.dht.provide(cid))
  }

  async * findProviders (cid: CID, options: AbortOptions = {}): AsyncGenerator<PeerInfo, void, undefined> {
    for await (const event of this.dht.findProviders(cid, options)) {
      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }

  async put (key: Uint8Array, value: Uint8Array, options?: AbortOptions): Promise<void> {
    await drain(this.dht.put(key, value, options))
  }

  async get (key: Uint8Array, options?: AbortOptions): Promise<Uint8Array> {
    for await (const event of this.dht.get(key, options)) {
      if (event.name === 'VALUE') {
        return event.value
      }
    }

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
  }
}
