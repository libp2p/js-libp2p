import drain from 'it-drain'
import { CodeError } from '@libp2p/interfaces/errors'
import type { DHT, QueryEvent } from '@libp2p/interface-dht'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { CID } from 'multiformats/cid'
import type { AbortOptions } from '@libp2p/interfaces'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { CustomProgressEvent, type ProgressEvent, type ProgressOptions } from 'progress-events'

export type FindProvidersProgressEvents =
  ProgressEvent<'content-routing:find-providers:dht:event', QueryEvent>

export type PutProgressEvents =
  ProgressEvent<'content-routing:put:dht:event', QueryEvent>

export type GetProgressEvents =
  ProgressEvent<'content-routing:get:dht:event', QueryEvent>

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

  async * findProviders (cid: CID, options: AbortOptions & ProgressOptions<FindProvidersProgressEvents> = {}): AsyncGenerator<PeerInfo, void, undefined> {
    for await (const event of this.dht.findProviders(cid, options)) {
      options.onProgress?.(new CustomProgressEvent('content-routing:find-providers:dht:event', event))

      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }

  async put (key: Uint8Array, value: Uint8Array, options: AbortOptions & ProgressOptions<PutProgressEvents> = {}): Promise<void> {
    for await (const event of this.dht.put(key, value, options)) {
      options.onProgress?.(new CustomProgressEvent('content-routing:put:dht:event', event))
    }
  }

  async get (key: Uint8Array, options: AbortOptions & ProgressOptions<GetProgressEvents> = {}): Promise<Uint8Array> {
    for await (const event of this.dht.get(key, options)) {
      options.onProgress?.(new CustomProgressEvent('content-routing:get:dht:event', event))

      if (event.name === 'VALUE') {
        return event.value
      }
    }

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
  }
}
