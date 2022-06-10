import errCode from 'err-code'
import { messages, codes } from '../errors.js'
import {
  storeAddresses,
  uniquePeers,
  requirePeers
} from './utils.js'
import drain from 'it-drain'
import merge from 'it-merge'
import { pipe } from 'it-pipe'
import type { ContentRouting } from '@libp2p/interfaces/content-routing'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Startable } from '@libp2p/interfaces/startable'
import type { CID } from 'multiformats/cid'
import type { Components } from '@libp2p/interfaces/components'

export interface CompoundContentRoutingInit {
  routers: ContentRouting[]
}

export class CompoundContentRouting implements ContentRouting, Startable {
  private readonly routers: ContentRouting[]
  private started: boolean
  private readonly components: Components

  constructor (components: Components, init: CompoundContentRoutingInit) {
    this.routers = init.routers ?? []
    this.started = false
    this.components = components
  }

  isStarted () {
    return this.started
  }

  async start () {
    this.started = true
  }

  async stop () {
    this.started = false
  }

  /**
   * Iterates over all content routers in parallel to find providers of the given key
   */
  async * findProviders (key: CID, options: AbortOptions = {}) {
    if (this.routers.length === 0) {
      throw errCode(new Error('No content this.routers available'), codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    yield * pipe(
      merge(
        ...this.routers.map(router => router.findProviders(key, options))
      ),
      (source) => storeAddresses(source, this.components.getPeerStore()),
      (source) => uniquePeers(source),
      (source) => requirePeers(source)
    )
  }

  /**
   * Iterates over all content routers in parallel to notify it is
   * a provider of the given key
   */
  async provide (key: CID, options: AbortOptions = {}) {
    if (this.routers.length === 0) {
      throw errCode(new Error('No content routers available'), codes.ERR_NO_ROUTERS_AVAILABLE)
    }

    await Promise.all(this.routers.map(async (router) => await router.provide(key, options)))
  }

  /**
   * Store the given key/value pair in the available content routings
   */
  async put (key: Uint8Array, value: Uint8Array, options?: AbortOptions) {
    if (!this.isStarted()) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    const dht = this.components.getDHT()

    if (dht != null) {
      await drain(dht.put(key, value, options))
    }
  }

  /**
   * Get the value to the given key.
   * Times out after 1 minute by default.
   */
  async get (key: Uint8Array, options?: AbortOptions): Promise<Uint8Array> {
    if (!this.isStarted()) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    const dht = this.components.getDHT()

    if (dht != null) {
      for await (const event of dht.get(key, options)) {
        if (event.name === 'VALUE') {
          return event.value
        }
      }
    }

    throw errCode(new Error(messages.NOT_FOUND), codes.ERR_NOT_FOUND)
  }

  /**
   * Get the `n` values to the given key without sorting
   */
  async * getMany (key: Uint8Array, nVals: number, options: AbortOptions) { // eslint-disable-line require-await
    if (!this.isStarted()) {
      throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
    }

    if (nVals == null || nVals === 0) {
      return
    }

    let gotValues = 0
    const dht = this.components.getDHT()

    if (dht != null) {
      for await (const event of dht.get(key, options)) {
        if (event.name === 'VALUE') {
          yield { from: event.from, val: event.value }

          gotValues++

          if (gotValues === nVals) {
            break
          }
        }
      }
    }

    if (gotValues === 0) {
      throw errCode(new Error(messages.NOT_FOUND), codes.ERR_NOT_FOUND)
    }
  }
}
