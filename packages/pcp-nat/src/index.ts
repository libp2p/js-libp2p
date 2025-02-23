/**
 * @packageDocumentation
 *
 * The service exported by this module attempts to configure NAT hole punching
 * via PCP (Port Control Protocol).
 *
 * This will make your node publicly accessible from the internet.
 *
 * For this to work there are some prerequisites:
 *
 * 1. Your router must have PCP support enabled
 * 2. Your libp2p node must be listening on a non-loopback IPv4 or IPv6 address
 * 3. You must not be [double-NATed](https://kb.netgear.com/30186/What-is-double-NAT-and-why-is-it-bad) by your ISP
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { tcp } from '@libp2p/tcp'
 * import { PCPNAT } from '@libp2p/pcp-nat'
 *
 * const node = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/ip6/2001:db8:85a3:8d3:aaaa:aaaa:aaaa:aaaa/tcp/0'
 *     ]
 *   },
 *   transports: [
 *     tcp()
 *   ],
 *   services: {
       pcpNat: pcpNAT("2001:db8:85a3:8d3:1319:8a2e:370:7348") // IPv6 Global Unicast Address (GUA) LAN address of your router
 *   }
 * })
 * ```
 */

import { PCPNAT as PCPClass } from './pcp-nat.js'
import type { PCPNAT as PCPNATClient, MapPortOptions } from '@achingbrain/nat-port-mapper'
import type { ComponentLogger, Libp2pEvents, NodeInfo, PeerId, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

export type { PCPNATClient, MapPortOptions }

export interface PCPNATInit {
  /**
   * By default we query configured gateways for their external
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
   * How long PCP port mappings should last for in ms
   *
   * @default 720_000
   */
  portMappingTTL?: number

  /**
   * Whether to automatically refresh PCP port mappings
   *
   * @default true
   */
  portMappingAutoRefresh?: boolean

  /**
   * A preconfigured instance of a PCPNatAPI client can be passed as an option,
   * otherwise one will be created
   */
  portMappingClient?: PCPNATClient

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
}

export interface PCPNATComponents {
  peerId: PeerId
  nodeInfo: NodeInfo
  logger: ComponentLogger
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
}

export interface PCPNAT {
  portMappingClient: PCPNATClient
}

export function pcpNAT (gateway: string, init: PCPNATInit = {}): (components: PCPNATComponents) => PCPNAT {
  return (components: PCPNATComponents) => {
    return new PCPClass(gateway, components, init)
  }
}
