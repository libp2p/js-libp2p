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
 */

import { UPnPNAT as UPnPNATClass } from './upnp-nat.js'
import type { UPnPNAT as UPnPNATClient, MapPortOptions } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Libp2pEvents, NodeInfo, PeerId, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

export type { UPnPNATClient, MapPortOptions }

export interface PMPOptions {
  /**
   * Whether to enable PMP as well as UPnP
   */
  enabled?: boolean
}

export interface UPnPNATInit {
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
   * A preconfigured instance of a NatAPI client can be passed as an option,
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
