import { logger } from '@libp2p/logger'
import { codes } from '../errors.js'
import {
  setDelayedInterval,
  clearDelayedInterval
  // @ts-expect-error set-delayed-interval does not export types
} from 'set-delayed-interval'
import { namespaceToCid } from './utils.js'
import {
  RELAY_RENDEZVOUS_NS
} from './constants.js'
import type { AddressSorter } from '@libp2p/interface-peer-store'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Components } from '../components.js'
import type { HopConfig, RelayAdvertiseConfig } from './index.js'

const log = logger('libp2p:circuit:relay')

export interface RelayInit {
  addressSorter?: AddressSorter
  maxListeners?: number
  hop: HopConfig
  advertise: RelayAdvertiseConfig
}

export class Relay implements Startable {
  private readonly components: Components
  private readonly init: RelayInit
  private timeout?: any
  private started: boolean

  /**
   * Creates an instance of Relay
   */
  constructor (components: Components, init: RelayInit) {
    this.components = components
    this.started = false
    this.init = init
    this._advertiseService = this._advertiseService.bind(this)
  }

  isStarted () {
    return this.started
  }

  /**
   * Start Relay service
   */
  async start () {
    // Advertise service if HOP enabled and advertising enabled
    if (this.init.hop.enabled === true && this.init.advertise.enabled === true) {
      this.timeout = setDelayedInterval(
        this._advertiseService, this.init.advertise.ttl, this.init.advertise.bootDelay
      )
    }

    this.started = true
  }

  /**
   * Stop Relay service
   */
  async stop () {
    try {
      clearDelayedInterval(this.timeout)
    } catch (err) { }

    this.started = false
  }

  /**
   * Advertise hop relay service in the network.
   */
  async _advertiseService () {
    try {
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
      await this.components.contentRouting.provide(cid)
    } catch (err: any) {
      if (err.code === codes.ERR_NO_ROUTERS_AVAILABLE) {
        log.error('a content router, such as a DHT, must be provided in order to advertise the relay service', err)
        await this.stop()
      } else {
        log.error('could not advertise service: ', err)
      }
    }
  }
}
