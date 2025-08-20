import { upnpNat } from '@achingbrain/nat-port-mapper'
import { serviceCapabilities, serviceDependencies, start, stop } from '@libp2p/interface'
import { debounce } from '@libp2p/utils/debounce'
import { setMaxListeners } from 'main-event'
import { SearchGatewayFinder } from './search-gateway-finder.js'
import { StaticGatewayFinder } from './static-gateway-finder.js'
import { UPnPPortMapper } from './upnp-port-mapper.js'
import type { UPnPNATComponents, UPnPNATInit, UPnPNAT as UPnPNATInterface } from './index.js'
import type { Gateway, UPnPNAT as UPnPNATClient } from '@achingbrain/nat-port-mapper'
import type { Logger, Startable } from '@libp2p/interface'
import type { DebouncedFunction } from '@libp2p/utils/debounce'
import type { TypedEventTarget } from 'main-event'

export interface GatewayFinderEvents {
  gateway: CustomEvent<Gateway>
}

export interface GatewayFinder extends TypedEventTarget<GatewayFinderEvents> {

}

export class UPnPNAT implements Startable, UPnPNATInterface {
  private readonly log: Logger
  private readonly components: UPnPNATComponents
  private readonly init: UPnPNATInit
  private started: boolean
  public portMappingClient: UPnPNATClient
  private shutdownController?: AbortController
  private readonly mapIpAddressesDebounced: DebouncedFunction
  private readonly gatewayFinder: GatewayFinder
  private readonly portMappers: UPnPPortMapper[]
  private readonly autoConfirmAddress: boolean

  constructor (components: UPnPNATComponents, init: UPnPNATInit) {
    this.log = components.logger.forComponent('libp2p:upnp-nat')
    this.components = components
    this.init = init
    this.started = false
    this.portMappers = []
    this.autoConfirmAddress = init.autoConfirmAddress ?? false

    this.portMappingClient = init.portMappingClient ?? upnpNat({
      description: init.portMappingDescription ?? `${components.nodeInfo.name}@${components.nodeInfo.version} ${components.peerId.toString()}`,
      ttl: init.portMappingTTL,
      autoRefresh: init.portMappingAutoRefresh,
      refreshThreshold: init.portMappingRefreshThreshold
    })

    // trigger update when our addresses change
    this.mapIpAddressesDebounced = debounce(async () => {
      try {
        await this.mapIpAddresses()
      } catch (err: any) {
        this.log.error('error mapping IP addresses - %e', err)
      }
    }, 5_000)

    if (init.gateways != null) {
      this.gatewayFinder = new StaticGatewayFinder(components, {
        portMappingClient: this.portMappingClient,
        gateways: init.gateways
      })
    } else {
      // trigger update when we discovery gateways on the network
      this.gatewayFinder = new SearchGatewayFinder(components, {
        portMappingClient: this.portMappingClient,
        initialSearchInterval: init.initialGatewaySearchInterval,
        initialSearchTimeout: init.initialGatewaySearchTimeout,
        initialSearchMessageInterval: init.initialGatewaySearchMessageInterval,
        searchInterval: init.gatewaySearchInterval,
        searchTimeout: init.gatewaySearchTimeout,
        searchMessageInterval: init.gatewaySearchMessageInterval
      })
    }

    this.onGatewayDiscovered = this.onGatewayDiscovered.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/upnp-nat'

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
   * Stops the NAT manager
   */
  async stop (): Promise<void> {
    this.shutdownController?.abort()
    this.components.events.removeEventListener('self:peer:update', this.mapIpAddressesDebounced)
    this.gatewayFinder.removeEventListener('gateway', this.onGatewayDiscovered)
    await stop(this.mapIpAddressesDebounced, this.gatewayFinder, ...this.portMappers)
    this.started = false
  }

  onGatewayDiscovered (event: CustomEvent<Gateway>): void {
    const mapper = new UPnPPortMapper(this.components, {
      ...this.init,
      gateway: event.detail
    })

    this.portMappers.push(mapper)

    start(mapper)
      .then(() => {
        this.mapIpAddressesDebounced()
      })
      .catch(() => {})
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
