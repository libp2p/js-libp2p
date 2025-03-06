import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * The type of address:
 *
 * - 'transport' a listen address supplied by a transport
 * - 'announce' a pre-configured announce address
 * - 'observed' a peer reported this as a public address
 * - 'dns-mapping' a DNS address dynamically mapped to one or more public addresses
 * - 'ip-mapping' an external IP address dynamically mapped to a LAN address
 */
export type AddressType = 'transport' | 'announce' | 'observed' | 'dns-mapping' | 'ip-mapping'

/**
 * An address that has been configured or detected
 */
export interface NodeAddress {
  /**
   * The multiaddr that represents the address
   */
  multiaddr: Multiaddr

  /**
   * Dynamically configured addresses such as observed or IP/DNS mapped ones
   * must be verified as valid by AutoNAT or some other means before the current
   * node will add them to it's peer record and share them with peers.
   *
   * When this value is true, it's safe to share the address.
   */
  verified: boolean

  /**
   * The timestamp at which the address was last verified
   */
  lastVerified?: number

  /**
   * A millisecond timestamp after which this address should be reverified
   */
  expires: number

  /**
   * The source of this address
   */
  type: AddressType
}

export interface ConfirmAddressOptions {
  /**
   * Override the TTL of the observed address verification
   */
  ttl?: number

  /**
   * Allows hinting which type of address this is
   */
  type?: AddressType
}

/**
 * The `AddressManager` provides an interface for managing peer addresses
 * in libp2p. It supports handling multiple types of addresses, verifying their validity,
 * and storing mappings between internal and external addresses.
 */
export interface AddressManager {
  /**
   * Get peer listen multiaddrs
   *
   * @returns An array of `Multiaddr` objects representing listen addresses.
   */
  getListenAddrs(): Multiaddr[]

  /**
   * Get peer announcing multiaddrs
   *
   * @returns An array of `Multiaddr` objects representing announce addresses.
   */
  getAnnounceAddrs(): Multiaddr[]

  /**
   * Get observed multiaddrs - these addresses may not have been confirmed as
   * publicly dialable yet
   *
   * @returns An array of `Multiaddr` objects representing observed addresses.
   */
  getObservedAddrs(): Multiaddr[]

  /**
   * Signal that we have confidence an observed multiaddr is publicly dialable -
   * this will make it appear in the output of `getAddresses()`
   *
   * @param addr - The observed address.
   * @param options - Additional options for confirmation.
   */
  confirmObservedAddr(addr: Multiaddr, options?: ConfirmAddressOptions): void

  /**
   * Signal that we do not have confidence an observed multiaddr is publicly dialable -
   * this will remove it from the output of `getObservedAddrs()`
   *
   * @param addr - The observed address to remove.
   */
  removeObservedAddr(addr: Multiaddr): void

  /**
   * Add peer observed addresses.  These will then appear in the output of `getObservedAddrs()`
   * but not `getAddresses()` until their dialability has been confirmed via a call to
   * confirmObservedAddr.
   *
   * @param addr - The observed address to add.
   */
  addObservedAddr(addr: Multiaddr): void

  /**
   * Get the current node's addresses
   *
   * @returns An array of `Multiaddr` objects representing node addresses.
   */
  getAddresses(): Multiaddr[]

  /**
   * Return all known addresses with metadata
   *
   * @returns An array of `NodeAddress` objects.
   */
  getAddressesWithMetadata(): NodeAddress[]

  /**
   * Adds a mapping between one or more IP addresses and a domain name - when
   * `getAddresses` is invoked, where the IP addresses are present in a
   * multiaddr, an additional multiaddr will be added with `ip4` and `ip6`
   * tuples replaced with `dns4` and `dns6 ones respectively.
   *
   * @param domain - The domain name to map.
   * @param ipAddresses - The associated IP addresses.
   */
  addDNSMapping(domain: string, ipAddresses: string[]): void

  /**
   * Remove a mapping previously added with `addDNSMapping`.
   *
   * @param domain - The domain name mapping to remove.
   */
  removeDNSMapping(domain: string): void

  /**
   * Add a publicly routable address/port/protocol tuple that this node is
   * reachable on. Where this node listens on a link-local (e.g. LAN) address
   * with the same protocol for any transport, an additional listen address will
   * be added with the IP and port replaced with this IP and port.
   *
   * It's possible to add a IPv6 address here and have it added to the address
   * list, this is for the case when a router has an external IPv6 address with
   * port forwarding configured, but it does IPv6 -> IPv4 NAT.
   *
   * @param internalIp - The internal IP address.
   * @param internalPort - The internal port number.
   * @param externalIp - The external IP address.
   * @param externalPort - The external port number (optional).
   * @param protocol - The transport protocol (`tcp` or `udp`).
   */
  addPublicAddressMapping (internalIp: string, internalPort: number, externalIp: string, externalPort?: number, protocol?: 'tcp' | 'udp'): void

  /**
   * Remove a publicly routable address that this node is no longer reachable on
   *
   * @param internalIp - The internal IP address.
   * @param internalPort - The internal port number.
   * @param externalIp - The external IP address.
   * @param externalPort - The external port number (optional).
   * @param protocol - The transport protocol (`tcp` or `udp`).
   */
  removePublicAddressMapping (internalIp: string, internalPort: number, externalIp: string, externalPort?: number, protocol?: 'tcp' | 'udp'): void
}
