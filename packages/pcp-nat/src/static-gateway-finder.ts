import { TypedEventEmitter } from '@libp2p/interface'
import type { GatewayFinder, GatewayFinderEvents } from './pcp-nat.js'
import type { Gateway, PCPNAT } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Logger } from '@libp2p/interface'

export interface StaticGatewayFinderComponents {
  logger: ComponentLogger
}

export interface StaticGatewayFinderInit {
  portMappingClient: PCPNAT
  gatewayIP: string
}

export class StaticGatewayFinder extends TypedEventEmitter<GatewayFinderEvents> implements GatewayFinder {
  private readonly log: Logger
  private gateway: Gateway | undefined
  private readonly gatewayIP: string
  private readonly portMappingClient: PCPNAT
  private started: boolean

  constructor (components: StaticGatewayFinderComponents, init: StaticGatewayFinderInit) {
    super()

    this.log = components.logger.forComponent('libp2p:pcp-nat:static-gateway-finder')
    this.portMappingClient = init.portMappingClient
    this.gatewayIP = init.gatewayIP
    this.started = false
    this.gateway = undefined
  }

  async start (): Promise<void> {
    this.started = true
  }

  async afterStart (): Promise<void> {
    try {
      const gateway = await this.portMappingClient.getGateway()

      if (!this.started) {
        return
      }

      this.log('found static gateway at %s', this.gatewayIP)
      this.gateway = gateway
      this.safeDispatchEvent('gateway', {
        detail: gateway
      })
    } catch (err) {
      this.log.error('could not contact static gateway at %s - %e', this.gatewayIP, err)
    }
  }

  async stop (): Promise<void> {
    this.started = false
  }
}
