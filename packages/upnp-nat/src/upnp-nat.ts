import { upnpNat } from '@achingbrain/nat-port-mapper'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { InvalidParametersError, serviceCapabilities, start, stop } from '@libp2p/interface'
import { debounce } from '@libp2p/utils/debounce'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { isPrivateIp } from '@libp2p/utils/private-ip'
import { multiaddr } from '@multiformats/multiaddr'
import { QUICV1, TCP, WebSockets, WebSocketsSecure, WebTransport } from '@multiformats/multiaddr-matcher'
import { raceSignal } from 'race-signal'
import { dynamicExternalAddress, staticExternalAddress } from './check-external-address.js'
import { DoubleNATError, InvalidIPAddressError } from './errors.js'
import type { ExternalAddress } from './check-external-address.js'
import type { UPnPNATComponents, UPnPNATInit, UPnPNAT as UPnPNATInterface } from './index.js'
import type { NatAPI, MapPortOptions } from '@achingbrain/nat-port-mapper'
import type { Libp2pEvents, Logger, Startable, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { DebouncedFunction } from '@libp2p/utils/debounce'
import type { Multiaddr } from '@multiformats/multiaddr'

const DEFAULT_TTL = 7200

export type { NatAPI, MapPortOptions }

export class UPnPNAT implements Startable, UPnPNATInterface {
  public client: NatAPI
  private readonly addressManager: AddressManager
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly externalAddress: ExternalAddress
  private readonly localAddress?: string
  private readonly description: string
  private readonly ttl: number
  private readonly keepAlive: boolean
  private readonly gateway?: string
  private started: boolean
  private readonly log: Logger
  private readonly gatewayDetectionTimeout: number
  private readonly mappedPorts: Map<number, number>
  private readonly onSelfPeerUpdate: DebouncedFunction

  constructor (components: UPnPNATComponents, init: UPnPNATInit) {
    this.log = components.logger.forComponent('libp2p:upnp-nat')
    this.addressManager = components.addressManager
    this.events = components.events
    this.started = false
    this.localAddress = init.localAddress
    this.description = init.description ?? `${components.nodeInfo.name}@${components.nodeInfo.version} ${components.peerId.toString()}`
    this.ttl = init.ttl ?? DEFAULT_TTL
    this.keepAlive = init.keepAlive ?? true
    this.gateway = init.gateway
    this.gatewayDetectionTimeout = init.gatewayDetectionTimeout ?? 10000
    this.mappedPorts = new Map()

    if (this.ttl < DEFAULT_TTL) {
      throw new InvalidParametersError(`NatManager ttl should be at least ${DEFAULT_TTL} seconds`)
    }

    this.client = init.client ?? upnpNat({
      description: this.description,
      ttl: this.ttl,
      keepAlive: this.keepAlive,
      gateway: this.gateway
    })

    this.onSelfPeerUpdate = debounce(this._onSelfPeerUpdate.bind(this), init.delay ?? 5000)

    if (typeof init.externalAddress === 'string') {
      this.externalAddress = staticExternalAddress(init.externalAddress)
    } else {
      this.externalAddress = dynamicExternalAddress({
        client: this.client,
        addressManager: this.addressManager,
        logger: components.logger
      }, init.externalAddress)
    }
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
    this.events.addEventListener('self:peer:update', this.onSelfPeerUpdate)
    await start(this.externalAddress, this.onSelfPeerUpdate)
  }

  /**
   * Stops the NAT manager
   */
  async stop (): Promise<void> {
    try {
      await this.client?.close()
    } catch (err: any) {
      this.log.error(err)
    }

    this.events.removeEventListener('self:peer:update', this.onSelfPeerUpdate)
    await stop(this.externalAddress, this.onSelfPeerUpdate)
    this.started = false
  }

  _onSelfPeerUpdate (): void {
    this.mapIpAddresses()
      .catch(err => {
        this.log.error('error mapping IP addresses - %e', err)
      })
  }

  private getUnmappedAddresses (multiaddrs: Multiaddr[], ipType: 4 | 6): Multiaddr[] {
    const output: Multiaddr[] = []

    for (const ma of multiaddrs) {
      // ignore public addresses
      if (!isPrivate(ma)) {
        continue
      }

      // ignore loopback
      if (isLoopback(ma)) {
        continue
      }

      // only IP based addresses
      if (!(
        TCP.exactMatch(ma) ||
        WebSockets.exactMatch(ma) ||
        WebSocketsSecure.exactMatch(ma) ||
        QUICV1.exactMatch(ma) ||
        WebTransport.exactMatch(ma)
      )) {
        continue
      }

      const { port, family } = ma.toOptions()

      if (family !== ipType) {
        continue
      }

      if (this.mappedPorts.has(port)) {
        continue
      }

      output.push(ma)
    }

    return output
  }

  async mapIpAddresses (): Promise<void> {
    if (this.externalAddress == null) {
      this.log('discovering public address')
    }

    const publicIp = await this.externalAddress.getPublicIp({
      signal: AbortSignal.timeout(this.gatewayDetectionTimeout)
    })

    this.externalAddress ?? await raceSignal(this.client.externalIp(), AbortSignal.timeout(this.gatewayDetectionTimeout), {
      errorMessage: `Did not discover a "urn:schemas-upnp-org:device:InternetGatewayDevice:1" device on the local network after ${this.gatewayDetectionTimeout}ms - UPnP may not be configured on your router correctly`
    })

    let ipType: 4 | 6 = 4

    if (isIPv4(publicIp)) {
      ipType = 4
    } else if (isIPv6(publicIp)) {
      ipType = 6
    } else {
      throw new InvalidIPAddressError(`Public address ${publicIp} was not an IPv4 address`)
    }

    // filter addresses to get private, non-relay, IP based addresses that we
    // haven't mapped yet
    const addresses = this.getUnmappedAddresses(this.addressManager.getAddresses(), ipType)

    if (addresses.length === 0) {
      this.log('no private, non-relay, unmapped, IP based addresses found')
      return
    }

    this.log('%s public IP %s', this.externalAddress != null ? 'using configured' : 'discovered', publicIp)

    this.assertNotBehindDoubleNAT(publicIp)

    for (const addr of addresses) {
      // try to open uPnP ports for each thin waist address
      const { family, host, port, transport } = addr.toOptions()

      if (family === 6) {
        // only support IPv4 addresses
        continue
      }

      if (this.mappedPorts.has(port)) {
        // already mapped this port
        continue
      }

      const protocol = transport.toUpperCase()

      this.log(`creating mapping of ${host}:${port}`)

      const mappedPort = await this.client.map(port, {
        localAddress: host,
        protocol: protocol === 'TCP' ? 'TCP' : 'UDP'
      })

      this.mappedPorts.set(port, mappedPort)

      const ma = multiaddr(addr.toString().replace(`/ip${family}/${host}/${transport}/${port}`, `/ip${family}/${publicIp}/${transport}/${mappedPort}`))

      this.log(`created mapping of ${publicIp}:${mappedPort} to ${host}:${port} as %a`, ma)

      this.addressManager.addObservedAddr(ma)
    }
  }

  /**
   * Some ISPs have double-NATs, there's not much we can do with them
   */
  private assertNotBehindDoubleNAT (publicIp: string): void {
    const isPrivate = isPrivateIp(publicIp)

    if (isPrivate === true) {
      throw new DoubleNATError(`${publicIp} is private - please set config.nat.externalIp to an externally routable IP or ensure you are not behind a double NAT`)
    }

    if (isPrivate == null) {
      throw new InvalidParametersError(`${publicIp} is not an IP address`)
    }
  }
}
