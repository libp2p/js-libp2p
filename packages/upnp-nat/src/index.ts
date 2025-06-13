/**
 * @packageDocumentation
 *
 * The service exported by this module attempts to configure NAT hole punching
 * via UPnP.
 *
 * This will make your node publicly accessible from the internet.
 *
 * For this to work there are some prerequisites:
 *
 * 1. Your router must have UPnP support enabled
 * 2. Your libp2p node must be listening on a non-loopback IPv4 address
 * 3. You must not be [double-NATed](https://kb.netgear.com/30186/What-is-double-NAT-and-why-is-it-bad) by your ISP
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { uPnPNAT } from '@libp2p/upnp-nat'
 *
 * const node = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/ip4/0.0.0.0/tcp/0'
 *     ]
 *   },
 *   transports: [
 *     tcp()
 *   ],
 *   services: {
 *     upnpNAT: uPnPNAT()
 *   }
 * })
 * ```
 *
 * @example Manually specifying gateways and external ports
 *
 * Some ISP-provided routers are under powered and may require rebooting before
 * they will respond to SSDP M-SEARCH messages.
 *
 * You can manually specify your external address and/or gateways, though note
 * that those gateways will still need to have UPnP enabled in order for libp2p
 * to configure mapping of external ports (for IPv4) and/or opening pinholes in
 * the firewall (for IPv6).
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { uPnPNAT } from '@libp2p/upnp-nat'
 *
 * const node = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/ip4/0.0.0.0/tcp/0'
 *     ]
 *   },
 *   transports: [
 *     tcp()
 *   ],
 *   services: {
 *     upnpNAT: uPnPNAT({
 *       // manually specify external address - this will normally be an IPv4
 *       // address that the router is performing NAT with
 *       externalAddress: '92.137.164.96',
 *       gateways: [
 *         // an IPv4 gateway
 *         'http://192.168.1.1:8080/path/to/descriptor.xml',
 *         // an IPv6 gateway
 *         'http://[xx:xx:xx:xx]:8080/path/to/descriptor.xml'
 *       ]
 *     })
 *   }
 * })
 * ```
 */

import { UPnPNAT as UPnPNATClass } from './upnp-nat.js'
import type { UPnPNAT as UPnPNATClient, MapPortOptions } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Libp2pEvents, NodeInfo, PeerId } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'

export type { UPnPNATClient, MapPortOptions }

export interface PMPOptions {
  /**
   * Whether to enable PMP as well as UPnP
   */
  enabled?: boolean
}

export interface UPnPNATInit {
  /**
   * By default we query discovered/configured gateways for their external
   * address. To specify it manually instead, pass a value here.
   *
   * Typically this would be an IPv4 address that the router performs NAT with.
   */
  externalAddress?: string

  /**
   * Check if the external address has changed this often in ms. Ignored if an
   * external address is specified.
   *
   * @default 30000
   */
  externalAddressCheckInterval?: number

  /**
   * Do not take longer than this to check if the external address has changed
   * in ms.  Ignored if an external address is specified.
   *
   * @default 10000
   */
  externalAddressCheckTimeout?: number

  /**
   * A string value to use for the port mapping description on the gateway
   */
  portMappingDescription?: string

  /**
   * How long UPnP port mappings should last for in ms
   *
   * @default 720_000
   */
  portMappingTTL?: number

  /**
   * Whether to automatically refresh UPnP port mappings when their TTL is
   * reached
   *
   * @default true
   */
  portMappingAutoRefresh?: boolean

  /**
   * How long before a port mapping expires to refresh it in ms
   *
   * @default 60_000
   */
  portMappingRefreshThreshold?: number

  /**
   * A pre-configured instance of a NatAPI client can be passed as an option,
   * otherwise one will be created
   */
  portMappingClient?: UPnPNATClient

  /**
   * Any mapped addresses are added to the observed address list. These
   * addresses require additional verification by the `@libp2p/autonat` protocol
   * or similar before they are trusted.
   *
   * To skip this verification and trust them immediately pass `true` here
   *
   * @default false
   */
  autoConfirmAddress?: boolean

  /**
   * By default we search for local gateways using SSDP M-SEARCH messages. To
   * manually specify a gateway instead, pass values here.
   *
   * A lot of ISP-provided gateway/routers are under powered so may need
   * rebooting before they will respond to M-SEARCH messages.
   *
   * Each value is an IPv4 or IPv6 URL of the UPnP device descriptor document,
   * e.g. `http://192.168.1.1:8080/description.xml`. Please see the
   * documentation of your gateway to discover the URL.
   *
   * Note that some gateways will randomize the port/path the descriptor
   * document is served from and even change it over time so you may be forced
   * to use an SSDP search instead.
   */
  gateways?: string[]

  /**
   * How often to search for network gateways in ms.
   *
   * This interval is used before a gateway has been found on the network, after
   * that it switches to `gatewaySearchInterval` which lowers the frequency of
   * the search.
   *
   * @default 5_000
   */
  initialGatewaySearchInterval?: number

  /**
   * How often to send the `M-SEARCH` SSDP message during a gateway search in
   * ms.
   *
   * Some routers are flaky and may not respond to every query so decreasing
   * this will increase the number of search messages sent before the timeout.
   *
   * This interval is used before a gateway has been found on the network, after
   * that it switches to `gatewaySearchMessageInterval` which lowers the
   * frequency of search messages sent.
   *
   * @default 1_000
   */
  initialGatewaySearchMessageInterval?: number

  /**
   * How long to search for gateways for before giving up in ms.
   *
   * This timeout is used before a gateway has been found on the network, after
   * that it switches to `gatewaySearchTimeout` which increases the timeout to
   * give gateways more time to respond.
   *
   * @default 5_000
   */
  initialGatewaySearchTimeout?: number

  /**
   * How often to search for network gateways in ms.
   *
   * This interval is used after a gateway has been found on the network.
   *
   * @default 300_000
   */
  gatewaySearchInterval?: number

  /**
   * How often to send the `M-SEARCH` SSDP message during a gateway search in
   * ms.
   *
   * Some routers are flaky and may not respond to every query so decreasing
   * this will increase the number of search messages sent before the timeout.
   *
   * This interval is used after a gateway has been found on the network.
   *
   * @default 10_000
   */
  gatewaySearchMessageInterval?: number

  /**
   * How long to search for gateways for before giving up in ms.
   *
   * This timeout is used after a gateway has been found on the network.
   *
   * @default 60_000
   */
  gatewaySearchTimeout?: number
}

export interface UPnPNATComponents {
  peerId: PeerId
  nodeInfo: NodeInfo
  logger: ComponentLogger
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
}

export interface UPnPNAT {
  portMappingClient: UPnPNATClient
}

export function uPnPNAT (init: UPnPNATInit = {}): (components: UPnPNATComponents) => UPnPNAT {
  return (components: UPnPNATComponents) => {
    return new UPnPNATClass(components, init)
  }
}
