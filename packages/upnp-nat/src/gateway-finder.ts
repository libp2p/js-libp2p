import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { repeatingTask } from '@libp2p/utils/repeating-task'
import { DEFAULT_GATEWAY_SEARCH_INTERVAL, DEFAULT_GATEWAY_SEARCH_TIMEOUT } from './constants.js'
import type { Gateway, UPnPNAT } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Logger } from '@libp2p/interface'
import type { RepeatingTask } from '@libp2p/utils/repeating-task'

export interface GatewayFinderComponents {
  logger: ComponentLogger
}

export interface GatewayFinderInit {
  portMappingClient: UPnPNAT
}

export interface GatewayFinderEvents {
  'gateway': CustomEvent<Gateway>
}

export class GatewayFinder extends TypedEventEmitter<GatewayFinderEvents> {
  private readonly log: Logger
  private readonly gateways: Gateway[]
  private readonly findGateways: RepeatingTask
  private readonly portMappingClient: UPnPNAT
  private started: boolean

  constructor (components: GatewayFinderComponents, init: GatewayFinderInit) {
    super()

    this.log = components.logger.forComponent('libp2p:upnp-nat')
    this.portMappingClient = init.portMappingClient
    this.started = false
    this.gateways = []

    // every five minutes, search for network gateways for one minute
    this.findGateways = repeatingTask(async (options) => {
      for await (const gateway of this.portMappingClient.findGateways(options)) {
        if (this.gateways.some(g => g.id === gateway.id)) {
          // already seen this gateway
          continue
        }

        this.gateways.push(gateway)
        this.safeDispatchEvent('gateway', {
          detail: gateway
        })
      }
    }, DEFAULT_GATEWAY_SEARCH_INTERVAL, {
      runImmediately: true,
      timeout: DEFAULT_GATEWAY_SEARCH_TIMEOUT
    })
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true
    await start(this.findGateways)
  }

  /**
   * Stops the NAT manager
   */
  async stop (): Promise<void> {
    await stop(this.findGateways)
    this.started = false
  }
}
