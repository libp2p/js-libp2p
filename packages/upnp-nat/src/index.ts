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
