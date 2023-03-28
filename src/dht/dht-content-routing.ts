import { CodeError } from '@libp2p/interfaces/errors'
import type { DHT, QueryEvent } from '@libp2p/interface-dht'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { CID } from 'multiformats/cid'
import type { AbortOptions } from '@libp2p/interfaces'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { CustomProgressEvent, type ProgressEvent, type ProgressOptions } from 'progress-events'

export type ProvideProgressEvents =
  ProgressEvent<'libp2p:content-routing:provide:dht:event', QueryEvent>

export type FindProvidersProgressEvents =
  ProgressEvent<'libp2p:content-routing:find-providers:dht:event', QueryEvent>

export type PutProgressEvents =
  ProgressEvent<'libp2p:content-routing:put:dht:event', QueryEvent>

export type GetProgressEvents =
  ProgressEvent<'libp2p:content-routing:get:dht:event', QueryEvent>

/**
 * Wrapper class to convert events into returned values
 */
export class DHTContentRouting implements ContentRouting<
  ProvideProgressEvents,
  FindProvidersProgressEvents,
  PutProgressEvents,
  GetProgressEvents
> {
  private readonly dht: DHT

  constructor (dht: DHT) {
    this.dht = dht
  }

  async provide (cid: CID, options: AbortOptions & ProgressOptions<ProvideProgressEvents> = {}): Promise<void> {
    for await (const event of this.dht.provide(cid, options)) {
      options.onProgress?.(new CustomProgressEvent('libp2p:content-routing:provide:dht:event', event))
    }
  }

  async * findProviders (cid: CID, options: AbortOptions & ProgressOptions<FindProvidersProgressEvents> = {}): AsyncGenerator<PeerInfo, void, undefined> {
    for await (const event of this.dht.findProviders(cid, options)) {
      options.onProgress?.(new CustomProgressEvent('libp2p:content-routing:find-providers:dht:event', event))

      if (event.name === 'PROVIDER') {
        yield * event.providers
      }
    }
  }

  async put (key: Uint8Array, value: Uint8Array, options: AbortOptions & ProgressOptions<PutProgressEvents> = {}): Promise<void> {
    for await (const event of this.dht.put(key, value, options)) {
      options.onProgress?.(new CustomProgressEvent('libp2p:content-routing:put:dht:event', event))
    }
  }

  async get (key: Uint8Array, options: AbortOptions & ProgressOptions<GetProgressEvents> = {}): Promise<Uint8Array> {
    for await (const event of this.dht.get(key, options)) {
      options.onProgress?.(new CustomProgressEvent('libp2p:content-routing:get:dht:event', event))

      if (event.name === 'VALUE') {
        return event.value
      }
    }

    throw new CodeError('Not found', 'ERR_NOT_FOUND')
  }
}
