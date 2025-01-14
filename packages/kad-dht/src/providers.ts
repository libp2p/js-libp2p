import { PeerMap } from '@libp2p/peer-collections'
import * as varint from 'uint8-varint'
import { parseProviderKey, readProviderTime, toProviderKey } from './utils.js'
import type { ComponentLogger, Logger, Metrics, PeerId } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'
import type { Mortice } from 'mortice'
import type { CID } from 'multiformats'

export interface ProvidersInit {
  logPrefix: string
  datastorePrefix: string
  lock: Mortice
}

export interface ProvidersComponents {
  datastore: Datastore
  logger: ComponentLogger
  metrics?: Metrics
}

/**
 * Provides a mechanism to add and remove provider records from the datastore
 */
export class Providers {
  private readonly log: Logger
  private readonly datastore: Datastore
  private readonly datastorePrefix: string
  private readonly lock: Mortice

  constructor (components: ProvidersComponents, init: ProvidersInit) {
    this.log = components.logger.forComponent(`${init.logPrefix}:providers`)
    this.datastorePrefix = `${init.datastorePrefix}/provider`
    this.datastore = components.datastore
    this.lock = init.lock
  }

  /**
   * Add a new provider for the given CID
   */
  async addProvider (cid: CID, provider: PeerId): Promise<void> {
    const release = await this.lock.readLock()

    try {
      this.log('%p provides %s', provider, cid)
      await this.writeProviderEntry(cid, provider)
    } finally {
      release()
    }
  }

  /**
   * Remove a provider for the given CID
   */
  async removeProvider (cid: CID, provider: PeerId): Promise<void> {
    const release = await this.lock.writeLock()

    try {
      const key = toProviderKey(this.datastorePrefix, cid, provider)
      this.log('%p no longer provides %s', provider, cid)
      await this.datastore.delete(key)
    } finally {
      release()
    }
  }

  /**
   * Get a list of providers for the given CID
   */
  async getProviders (cid: CID): Promise<PeerId[]> {
    const release = await this.lock.readLock()

    try {
      this.log('get providers for %c', cid)
      const provs = await this.loadProviders(cid)
      this.log('got %d providers for %c', provs.size, cid)

      return [...provs.keys()]
    } finally {
      release()
    }
  }

  /**
   * Write a provider into the given store
   */
  private async writeProviderEntry (cid: CID, peerId: PeerId, time: Date = new Date()): Promise<void> {
    const key = toProviderKey(this.datastorePrefix, cid, peerId)
    const buffer = varint.encode(time.getTime())

    await this.datastore.put(key, buffer)
  }

  /**
   * Load providers for the given CID from the store
   */
  private async loadProviders (cid: CID): Promise<PeerMap<Date>> {
    const providers = new PeerMap<Date>()
    const key = toProviderKey(this.datastorePrefix, cid)

    for await (const entry of this.datastore.query({ prefix: key.toString() })) {
      const { peerId } = parseProviderKey(entry.key)
      providers.set(peerId, readProviderTime(entry.value))
    }

    return providers
  }
}
