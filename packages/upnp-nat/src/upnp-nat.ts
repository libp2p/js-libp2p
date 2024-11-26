import { upnpNat } from '@achingbrain/nat-port-mapper'
import { serviceCapabilities, setMaxListeners, start, stop } from '@libp2p/interface'
import { debounce } from '@libp2p/utils/debounce'
import { DEFAULT_PORT_MAPPING_TTL } from './constants.js'
import { GatewayFinder } from './gateway-finder.js'
import { UPnPPortMapper } from './upnp-port-mapper.js'
import type { UPnPNATComponents, UPnPNATInit, UPnPNAT as UPnPNATInterface } from './index.js'
import type { Gateway, UPnPNAT as UPnPNATClient } from '@achingbrain/nat-port-mapper'
import type { Logger, Startable } from '@libp2p/interface'
import type { DebouncedFunction } from '@libp2p/utils/debounce'

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

  constructor (components: UPnPNATComponents, init: UPnPNATInit) {
    this.log = components.logger.forComponent('libp2p:upnp-nat')
    this.components = components
    this.init = init
    this.started = false
    this.portMappers = []

    this.portMappingClient = init.portMappingClient ?? upnpNat({
      description: init.portMappingDescription ?? `${components.nodeInfo.name}@${components.nodeInfo.version} ${components.peerId.toString()}`,
      ttl: init.portMappingTTL ?? DEFAULT_PORT_MAPPING_TTL,
      autoRefresh: init.portMappingAutoRefresh ?? true
    })

    // trigger update when our addresses change
    this.mapIpAddressesDebounced = debounce(async () => {
      try {
        await this.mapIpAddresses()
      } catch (err: any) {
        this.log.error('error mapping IP addresses - %e', err)
      }
    }, 5_000)

    // trigger update when we discovery gateways on the network
    this.gatewayFinder = new GatewayFinder(components, {
      portMappingClient: this.portMappingClient
    })

    this.onGatewayDiscovered = this.onGatewayDiscovered.bind(this)
  }

  readonly [Symbol.toStringTag] = '@libp2p/upnp-nat'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/nat-traversal'
  ]

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
        this.portMappers.map(async mapper => mapper.mapIpAddresses())
      )
    } catch (err: any) {
      this.log.error('error mapping IP addresses - %e', err)
    }
  }
}
