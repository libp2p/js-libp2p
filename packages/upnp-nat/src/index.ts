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

import { UPnPNAT as UPnPNATClass, type NatAPI, type MapPortOptions } from './upnp-nat.js'
import type { ExternalAddressCheckerInit } from './check-external-address.js'
import type { ComponentLogger, Libp2pEvents, NodeInfo, PeerId, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'

export type { NatAPI, MapPortOptions }

export interface PMPOptions {
  /**
   * Whether to enable PMP as well as UPnP
   */
  enabled?: boolean
}

export interface UPnPNATInit {
  /**
   * Pass a string to hard code the external address, otherwise it will be
   * auto-detected
   */
  externalAddress?: string | ExternalAddressCheckerInit

  /**
   * Pass a value to use instead of auto-detection
   */
  localAddress?: string

  /**
   * A string value to use for the port mapping description on the gateway
   */
  description?: string

  /**
   * How long UPnP port mappings should last for in seconds (minimum 1200)
   */
  ttl?: number

  /**
   * Whether to automatically refresh UPnP port mappings when their TTL is reached
   */
  keepAlive?: boolean

  /**
   * Pass a value to use instead of auto-detection
   */
  gateway?: string

  /**
   * How long in ms to wait before giving up trying to auto-detect a
   * `urn:schemas-upnp-org:device:InternetGatewayDevice:1` device on the local
   * network
   *
   * @default 10000
   */
  gatewayDetectionTimeout?: number

  /**
   * Ports are mapped when the `self:peer:update` event fires, which happens
   * when the node's addresses change. To avoid starting to map ports while
   * multiple addresses are being added, the mapping function is debounced by
   * this number of ms
   *
   * @default 5000
   */
  delay?: number

  /**
   * A preconfigured instance of a NatAPI client can be passed as an option,
   * otherwise one will be created
   */
  client?: NatAPI
}

export interface UPnPNATComponents {
  peerId: PeerId
  nodeInfo: NodeInfo
  logger: ComponentLogger
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
}

export interface UPnPNAT {
  client: NatAPI
}

export function uPnPNAT (init: UPnPNATInit = {}): (components: UPnPNATComponents) => UPnPNAT {
  return (components: UPnPNATComponents) => {
    return new UPnPNATClass(components, init)
  }
}
