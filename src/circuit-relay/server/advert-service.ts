import { logger } from '@libp2p/logger'
import { codes } from '../../errors.js'
import { namespaceToCid } from '../utils.js'
import {
  DEFAULT_ADVERT_BOOT_DELAY,
  RELAY_RENDEZVOUS_NS
} from '../constants.js'
import type { Startable } from '@libp2p/interfaces/startable'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import { EventEmitter } from '@libp2p/interfaces/events'
import pRetry from 'p-retry'

const log = logger('libp2p:circuit-relay:advert-service')

export interface AdvertServiceInit {
  /**
   * How long to wait after startup to begin advertising the service
   * - if some configured content routers take a while to warm up (for
   * example, the DHT needs some peers to be able to publish) this
   * value should be high enough that they will have warmed up
   */
  bootDelay?: number
}

export interface AdvertServiceComponents {
  contentRouting: ContentRouting
}

export interface AdvertServiceEvents {
  'advert:success': CustomEvent<unknown>
  'advert:error': CustomEvent<Error>
}

export class AdvertService extends EventEmitter<AdvertServiceEvents> implements Startable {
  private readonly contentRouting: ContentRouting
  private timeout?: any
  private started: boolean
  private readonly bootDelay: number

  /**
   * Creates an instance of Relay
   */
  constructor (components: AdvertServiceComponents, init?: AdvertServiceInit) {
    super()

    this.contentRouting = components.contentRouting
    this.bootDelay = init?.bootDelay ?? DEFAULT_ADVERT_BOOT_DELAY
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * Start Relay service
   */
  start (): void {
    if (this.started) {
      return
    }

    // Advertise service if HOP enabled and advertising enabled
    this.timeout = setTimeout(() => {
      this._advertiseService().catch(err => {
        log.error('could not advertise service', err)
      })
    }, this.bootDelay)

    this.started = true
  }

  /**
   * Stop Relay service
   */
  stop (): void {
    try {
      clearTimeout(this.timeout)
    } catch (err) { }

    this.started = false
  }

  /**
   * Advertise hop relay service in the network.
   */
  async _advertiseService (): Promise<void> {
    await pRetry(async () => {
      try {
        const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
        await this.contentRouting.provide(cid)

        this.safeDispatchEvent('advert:success', { detail: undefined })
      } catch (err: any) {
        this.safeDispatchEvent('advert:error', { detail: err })

        if (err.code === codes.ERR_NO_ROUTERS_AVAILABLE) {
          log.error('a content router, such as a DHT, must be provided in order to advertise the relay service', err)
          this.stop()
          return
        }

        log.error('could not advertise service', err)
        throw err
      }
    })
  }
}
