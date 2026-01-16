import { pcpNat } from '@achingbrain/nat-port-mapper'
import { serviceCapabilities, serviceDependencies, setMaxListeners, start, stop } from '@libp2p/interface'
import { debounce } from '@libp2p/utils/debounce'
import { PCPPortMapper } from './pcp-port-mapper.js'
import { StaticGatewayFinder } from './static-gateway-finder.js'
import type { PCPNATComponents, PCPNATInit, PCPNAT as PCPNATInterface } from './index.js'
import type { Gateway, PCPNAT as PCPNATClient } from '@achingbrain/nat-port-mapper'
import type { Logger, Startable, TypedEventTarget } from '@libp2p/interface'
import type { DebouncedFunction } from '@libp2p/utils/debounce'

export interface GatewayFinderEvents {
  'gateway': CustomEvent<Gateway>
}

export interface GatewayFinder extends TypedEventTarget<GatewayFinderEvents> {

}

export class PCPNAT implements Startable, PCPNATInterface {
  private readonly log: Logger
  private readonly components: PCPNATComponents
  private readonly init: PCPNATInit
  private started: boolean
  public portMappingClient: PCPNATClient
  private shutdownController?: AbortController
  private readonly mapIpAddressesDebounced: DebouncedFunction
  private readonly gatewayFinder: GatewayFinder
  private readonly portMappers: PCPPortMapper[]
  private readonly autoConfirmAddress: boolean
  private readonly gatewayIP: string

  constructor (gatewayIP: string, components: PCPNATComponents, init: PCPNATInit) {
    this.log = components.logger.forComponent('libp2p:pcp-nat')
    this.components = components
    this.init = init
    this.started = false
    this.portMappers = []
    this.gatewayIP = gatewayIP
    this.autoConfirmAddress = init.autoConfirmAddress ?? false

    this.portMappingClient = init.portMappingClient ?? pcpNat(gatewayIP, {
      ttl: init.portMappingTTL,
      autoRefresh: init.portMappingAutoRefresh
    })

    // trigger update when our addresses change
    this.mapIpAddressesDebounced = debounce(async () => {
      try {
        await this.mapIpAddresses()
      } catch (err: any) {
        this.log.error('error mapping IP addresses - %e', err)
      }
    }, 5_000)

    this.gatewayFinder = new StaticGatewayFinder(components, {
      portMappingClient: this.portMappingClient,
      gatewayIP
    })

    this.onGatewayDiscovered = this.onGatewayDiscovered.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/pcp-nat'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/nat-traversal'
  ]

  get [serviceDependencies] (): string[] {
    if (!this.autoConfirmAddress) {
      return [
        '@libp2p/autonat'
      ]
    }

    return []
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    this.started = true
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
    this.components.events.addEventListener('self:peer:update', this.mapIpAddressesDebounced)
    this.gatewayFinder.addEventListener('gateway', this.onGatewayDiscovered)
    await start(this.mapIpAddressesDebounced, this.gatewayFinder, ...this.portMappers)
  }

  /**
   * Stops the PCP manager
   */
  async stop (): Promise<void> {
    this.shutdownController?.abort()
    this.components.events.removeEventListener('self:peer:update', this.mapIpAddressesDebounced)
    this.gatewayFinder.removeEventListener('gateway', this.onGatewayDiscovered)
    await stop(this.mapIpAddressesDebounced, this.gatewayFinder, ...this.portMappers)
    this.started = false
  }

  onGatewayDiscovered (event: CustomEvent<Gateway>): void {
    const mapper = new PCPPortMapper(this.components, {
      ...this.init,
      gateway: event.detail,
      externalAddress: this.gatewayIP
    })

    this.portMappers.push(mapper)

    start(mapper)
      .then(() => {
        this.mapIpAddressesDebounced()
      })
      .catch(() => { })
  }

  async mapIpAddresses (): Promise<void> {
    try {
      await Promise.all(
        this.portMappers.map(async mapper => mapper.mapIpAddresses({
          autoConfirmAddress: this.autoConfirmAddress
        }))
      )
    } catch (err: any) {
      this.log.error('error mapping IP addresses - %e', err)
    }
  }
}
