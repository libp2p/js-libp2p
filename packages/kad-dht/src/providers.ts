import { PeerMap } from '@libp2p/peer-collections'
import * as varint from 'uint8-varint'
import { parseProviderKey, readProviderTime, toProviderKey } from './utils.js'
import type { AbortOptions, ComponentLogger, Logger, Metrics, PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats'

export interface ProvidersInit {
  logPrefix: string
  datastorePrefix: string
}

export interface ProvidersComponents {
  datastore: Datastore
  logger: ComponentLogger
  metrics?: Metrics
}

interface WriteProviderEntryOptions extends AbortOptions {
  time?: Date
}

/**
 * Provides a mechanism to add and remove provider records from the datastore
 */
export class Providers {
  private readonly log: Logger
  private readonly datastore: Datastore
  private readonly datastorePrefix: string

  constructor (components: ProvidersComponents, init: ProvidersInit) {
    this.log = components.logger.forComponent(`${init.logPrefix}:providers`)
    this.datastorePrefix = `${init.datastorePrefix}/provider`
    this.datastore = components.datastore
  }

  /**
   * Add a new provider for the given CID
   */
  async addProvider (cid: CID, provider: PeerId, options?: AbortOptions): Promise<void> {
    this.log.trace('%p provides %s', provider, cid)
    await this.writeProviderEntry(cid, provider, options)
  }

  /**
   * Remove a provider for the given CID
   */
  async removeProvider (cid: CID, provider: PeerId, options?: AbortOptions): Promise<void> {
    const key = toProviderKey(this.datastorePrefix, cid, provider)
    this.log.trace('%p no longer provides %s', provider, cid)
    await this.datastore.delete(key, options)
  }

  /**
   * Get a list of providers for the given CID
   */
  async getProviders (cid: CID, options?: AbortOptions): Promise<PeerId[]> {
    this.log.trace('get providers for %c', cid)
    const provs = await this.loadProviders(cid, options)
    this.log.trace('got %d providers for %c', provs.size, cid)

    return [...provs.keys()]
  }

  /**
   * Write a provider into the given store
   */
  private async writeProviderEntry (cid: CID, peerId: PeerId, options?: WriteProviderEntryOptions): Promise<void> {
    const key = toProviderKey(this.datastorePrefix, cid, peerId)
    const buffer = varint.encode(options?.time?.getTime() ?? Date.now())

    await this.datastore.put(key, buffer, options)
  }

  /**
   * Load providers for the given CID from the store
   */
  private async loadProviders (cid: CID, options?: AbortOptions): Promise<PeerMap<Date>> {
    const providers = new PeerMap<Date>()
    const key = toProviderKey(this.datastorePrefix, cid)

    for await (const entry of this.datastore.query({ prefix: key.toString() }, options)) {
      const { peerId } = parseProviderKey(entry.key)
      providers.set(peerId, readProviderTime(entry.value))
    }

    return providers
  }
}
