import { start, stop } from '@libp2p/interface'
import { repeatingTask } from '@libp2p/utils/repeating-task'
import { TypedEventEmitter } from 'main-event'
import { DEFAULT_GATEWAY_SEARCH_INTERVAL, DEFAULT_GATEWAY_SEARCH_MESSAGE_INTERVAL, DEFAULT_GATEWAY_SEARCH_TIMEOUT, DEFAULT_INITIAL_GATEWAY_SEARCH_INTERVAL, DEFAULT_INITIAL_GATEWAY_SEARCH_MESSAGE_INTERVAL, DEFAULT_INITIAL_GATEWAY_SEARCH_TIMEOUT } from './constants.js'
import type { GatewayFinder, GatewayFinderEvents } from './upnp-nat.js'
import type { Gateway, UPnPNAT } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Logger } from '@libp2p/interface'
import type { RepeatingTask } from '@libp2p/utils/repeating-task'

export interface SearchGatewayFinderComponents {
  logger: ComponentLogger
}

export interface SearchGatewayFinderInit {
  portMappingClient: UPnPNAT
  initialSearchInterval?: number
  initialSearchTimeout?: number
  initialSearchMessageInterval?: number
  searchInterval?: number
  searchTimeout?: number
  searchMessageInterval?: number
}

export class SearchGatewayFinder extends TypedEventEmitter<GatewayFinderEvents> implements GatewayFinder {
  private readonly log: Logger
  private readonly gateways: Gateway[]
  private readonly findGateways: RepeatingTask
  private readonly portMappingClient: UPnPNAT
  private started: boolean

  constructor (components: SearchGatewayFinderComponents, init: SearchGatewayFinderInit) {
    super()

    this.log = components.logger.forComponent('libp2p:upnp-nat')
    this.portMappingClient = init.portMappingClient
    this.started = false
    this.gateways = []

    // every five minutes, search for network gateways for one minute
    this.findGateways = repeatingTask(async (options) => {
      try {
        const searchMessageInterval = this.gateways.length > 0
          ? init.searchMessageInterval ?? DEFAULT_GATEWAY_SEARCH_MESSAGE_INTERVAL
          : init.initialSearchMessageInterval ?? DEFAULT_INITIAL_GATEWAY_SEARCH_MESSAGE_INTERVAL

        this.log('begin gateway search, sending M-SEARCH every %dms', searchMessageInterval)

        for await (const gateway of this.portMappingClient.findGateways({
          ...options,
          searchInterval: searchMessageInterval
        })) {
          if (this.gateways.some(g => {
            return g.id === gateway.id && g.family === gateway.family
          })) {
            // already seen this gateway
            continue
          }

          this.gateways.push(gateway)
          this.safeDispatchEvent('gateway', {
            detail: gateway
          })

          // we've found a gateway, wait for longer before searching again
          const searchInterval = init.searchTimeout ?? DEFAULT_GATEWAY_SEARCH_INTERVAL
          const searchTimeout = init.searchTimeout ?? DEFAULT_GATEWAY_SEARCH_TIMEOUT
          this.log('switching gateway search to every %dms, timing out after %dms', searchInterval, searchTimeout)
          this.findGateways.setInterval(searchInterval)
          this.findGateways.setTimeout(searchTimeout)
        }

        this.log('gateway search finished, found %d gateways', this.gateways.length)
      } catch (err) {
        this.log.error('gateway search errored - %e', err)
      }
    }, init.initialSearchInterval ?? DEFAULT_INITIAL_GATEWAY_SEARCH_INTERVAL, {
      runImmediately: true,
      timeout: init.initialSearchTimeout ?? DEFAULT_INITIAL_GATEWAY_SEARCH_TIMEOUT
    })
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true
    await start(this.findGateways)
  }

  async stop (): Promise<void> {
    await stop(this.findGateways)
    this.started = false
  }
}
