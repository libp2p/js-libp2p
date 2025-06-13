import { TypedEventEmitter } from 'main-event'
import type { GatewayFinder, GatewayFinderEvents } from './upnp-nat.js'
import type { Gateway, UPnPNAT } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Logger } from '@libp2p/interface'

export interface StaticGatewayFinderComponents {
  logger: ComponentLogger
}

export interface StaticGatewayFinderInit {
  portMappingClient: UPnPNAT
  gateways: string[]
}

export class StaticGatewayFinder extends TypedEventEmitter<GatewayFinderEvents> implements GatewayFinder {
  private readonly log: Logger
  private readonly gatewayUrls: URL[]
  private readonly gateways: Gateway[]
  private readonly portMappingClient: UPnPNAT
  private started: boolean

  constructor (components: StaticGatewayFinderComponents, init: StaticGatewayFinderInit) {
    super()

    this.log = components.logger.forComponent('libp2p:upnp-nat:static-gateway-finder')
    this.portMappingClient = init.portMappingClient
    this.started = false
    this.gateways = []
    this.gatewayUrls = init.gateways.map(url => new URL(url))
  }

  async start (): Promise<void> {
    this.started = true
  }

  async afterStart (): Promise<void> {
    for (const url of this.gatewayUrls) {
      try {
        this.log('fetching gateway descriptor from %s', url)
        const gateway = await this.portMappingClient.getGateway(url)

        if (!this.started) {
          return
        }

        this.log('found static gateway at %s', url)
        this.gateways.push(gateway)
        this.safeDispatchEvent('gateway', {
          detail: gateway
        })
      } catch (err) {
        this.log.error('could not contact static gateway at %s - %e', url, err)
      }
    }
  }

  async stop (): Promise<void> {
    this.started = false
  }
}
