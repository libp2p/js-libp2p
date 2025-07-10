import { isIPv4 } from '@chainsafe/is-ip'
import { InvalidParametersError, start, stop } from '@libp2p/interface'
import { isLinkLocal } from '@libp2p/utils/multiaddr/is-link-local'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { isPrivateIp } from '@libp2p/utils/private-ip'
import { multiaddr } from '@multiformats/multiaddr'
import { QUIC_V1, TCP, WebSockets, WebSocketsSecure, WebTransport } from '@multiformats/multiaddr-matcher'
import { dynamicExternalAddress, staticExternalAddress } from './check-external-address.js'
import { DoubleNATError } from './errors.js'
import type { ExternalAddress } from './check-external-address.js'
import type { Gateway } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Logger } from '@libp2p/interface'
import type { AddressManager, NodeAddress } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

const MAX_DATE = 8_640_000_000_000_000

export interface UPnPPortMapperInit {
  gateway: Gateway
  externalAddress?: string
  externalAddressCheckInterval?: number
  externalAddressCheckTimeout?: number
}

export interface UPnPPortMapperComponents {
  logger: ComponentLogger
  addressManager: AddressManager
}

interface PortMapping {
  externalHost: string
  externalPort: number
}

export interface MapPortsOptions {
  autoConfirmAddress?: boolean
}

export class UPnPPortMapper {
  private readonly gateway: Gateway
  private readonly externalAddress: ExternalAddress
  private readonly addressManager: AddressManager
  private readonly log: Logger
  private readonly mappedPorts: Map<string, PortMapping>
  private started: boolean

  constructor (components: UPnPPortMapperComponents, init: UPnPPortMapperInit) {
    this.log = components.logger.forComponent(`libp2p:upnp-nat:gateway:${init.gateway.id}`)
    this.addressManager = components.addressManager
    this.gateway = init.gateway

    if (init.externalAddress != null) {
      this.externalAddress = staticExternalAddress(init.externalAddress)
    } else {
      this.externalAddress = dynamicExternalAddress({
        gateway: this.gateway,
        addressManager: this.addressManager,
        logger: components.logger
      }, {
        interval: init.externalAddressCheckInterval,
        timeout: init.externalAddressCheckTimeout,
        onExternalAddressChange: this.remapPorts.bind(this)
      })
    }
    this.gateway = init.gateway
    this.mappedPorts = new Map()
    this.started = false
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await start(this.externalAddress)
    this.started = true
  }

  async stop (): Promise<void> {
    try {
      const shutdownTimeout = AbortSignal.timeout(1000)

      await this.gateway.stop({
        signal: shutdownTimeout
      })
    } catch (err: any) {
      this.log.error('error closing gateway - %e', err)
    }

    await stop(this.externalAddress)
    this.started = false
  }

  /**
   * Update the local address mappings when the gateway's external interface
   * address changes
   */
  private remapPorts (newExternalHost: string): void {
    for (const [key, { externalHost, externalPort }] of this.mappedPorts.entries()) {
      const [
        host,
        port,
        transport
      ] = key.split('-')

      this.addressManager.removePublicAddressMapping(host, parseInt(port), externalHost, externalPort, transport === 'tcp' ? 'tcp' : 'udp')
      this.addressManager.addPublicAddressMapping(host, parseInt(port), newExternalHost, externalPort, transport === 'tcp' ? 'tcp' : 'udp')
    }
  }

  /**
   * Return any eligible multiaddrs that are not mapped on the detected gateway
   */
  private getUnmappedAddresses (multiaddrs: NodeAddress[], publicAddresses: string[]): Multiaddr[] {
    const output: Multiaddr[] = []

    for (const { multiaddr: ma, type } of multiaddrs) {
      // only consider transport addresses, ignore mapped/observed addrs
      if (type !== 'transport') {
        continue
      }

      const stringTuples = ma.stringTuples()
      const address = `${stringTuples[0][1]}`

      // ignore public IPv4 addresses
      if (isIPv4(address) && !isPrivate(ma)) {
        continue
      }

      // ignore any addresses that match the interface on the network gateway
      if (publicAddresses.includes(address)) {
        continue
      }

      // ignore loopback
      if (isLoopback(ma)) {
        continue
      }

      // ignore link-local addresses
      if (isLinkLocal(ma)) {
        continue
      }

      // only IP based addresses
      if (!this.isIPAddress(ma)) {
        continue
      }

      const { port, transport } = ma.toOptions()

      if (this.mappedPorts.has(`${port}-${transport}`)) {
        continue
      }

      output.push(ma)
    }

    return output
  }

  async mapIpAddresses (options?: MapPortsOptions): Promise<void> {
    try {
      const externalHost = await this.externalAddress.getPublicIp()

      // filter addresses to get private, non-relay, IP based addresses that we
      // haven't mapped yet
      const addresses = this.getUnmappedAddresses(this.addressManager.getAddressesWithMetadata(), [externalHost])

      if (addresses.length === 0) {
        this.log('no private, non-relay, unmapped, IP based addresses found')
        return
      }

      this.log('discovered public IP %s', externalHost)

      this.assertNotBehindDoubleNAT(externalHost)

      for (const addr of addresses) {
        // try to open uPnP ports for each thin waist address
        const { port, host, transport, family } = addr.toOptions()

        // don't try to open port on IPv6 host via IPv4 gateway
        if (family === 4 && this.gateway.family !== 'IPv4') {
          continue
        }

        // don't try to open port on IPv4 host via IPv6 gateway
        if (family === 6 && this.gateway.family !== 'IPv6') {
          continue
        }

        const key = `${host}-${port}-${transport}`

        if (this.mappedPorts.has(key)) {
          // already mapped this port
          continue
        }

        try {
          const mapping = await this.gateway.map(port, host, {
            protocol: transport === 'tcp' ? 'TCP' : 'UDP'
          })
          this.mappedPorts.set(key, mapping)
          this.addressManager.addPublicAddressMapping(mapping.internalHost, mapping.internalPort, mapping.externalHost, mapping.externalPort, transport === 'tcp' ? 'tcp' : 'udp')
          this.log('created mapping of %s:%s to %s:%s for protocol %s', mapping.internalHost, mapping.internalPort, mapping.externalHost, mapping.externalPort, transport)

          if (options?.autoConfirmAddress === true) {
            const ma = multiaddr(`/ip${isIPv4(mapping.externalHost) ? 4 : 6}/${mapping.externalHost}/${transport}/${mapping.externalPort}`)
            this.log('auto-confirming IP address %a', ma)
            this.addressManager.confirmObservedAddr(ma, {
              ttl: MAX_DATE - Date.now()
            })
          }
        } catch (err) {
          this.log.error('failed to create mapping for %s:%d for protocol - %e', host, port, transport, err)
        }
      }
    } catch (err: any) {
      this.log.error('error finding gateways - %e', err)
    }
  }

  /**
   * Some ISPs have double-NATs, there's not much we can do with them
   */
  private assertNotBehindDoubleNAT (publicIp: string): void {
    const isPrivate = isPrivateIp(publicIp)

    if (isPrivate === true) {
      throw new DoubleNATError(`${publicIp} is private - please init uPnPNAT with 'externalAddress' set to an externally routable IP or ensure you are not behind a double NAT`)
    }

    if (isPrivate == null) {
      throw new InvalidParametersError(`${publicIp} is not an IP address`)
    }
  }

  private isIPAddress (ma: Multiaddr): boolean {
    return TCP.exactMatch(ma) ||
      WebSockets.exactMatch(ma) ||
      WebSocketsSecure.exactMatch(ma) ||
      QUIC_V1.exactMatch(ma) ||
      WebTransport.exactMatch(ma)
  }
}
