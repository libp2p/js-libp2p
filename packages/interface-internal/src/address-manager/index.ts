import type { Multiaddr } from '@multiformats/multiaddr'

export interface AddressManager {
  /**
   * Get peer listen multiaddrs
   */
  getListenAddrs(): Multiaddr[]

  /**
   * Get peer announcing multiaddrs
   */
  getAnnounceAddrs(): Multiaddr[]

  /**
   * Get observed multiaddrs - these addresses may not have been confirmed as
   * publicly dialable yet
   */
  getObservedAddrs(): Multiaddr[]

  /**
   * Signal that we have confidence an observed multiaddr is publicly dialable -
   * this will make it appear in the output of getAddresses()
   */
  confirmObservedAddr(addr: Multiaddr): void

  /**
   * Signal that we do not have confidence an observed multiaddr is publicly dialable -
   * this will remove it from the output of getObservedAddrs()
   */
  removeObservedAddr(addr: Multiaddr): void

  /**
   * Add peer observed addresses.  These will then appear in the output of getObservedAddrs
   * but not getAddresses() until their dialability has been confirmed via a call to
   * confirmObservedAddr.
   */
  addObservedAddr(addr: Multiaddr): void

  /**
   * Get the current node's addresses
   */
  getAddresses(): Multiaddr[]

  /**
   * Adds a mapping between one or more IP addresses and a domain name - when
   * `getAddresses` is invoked, where the IP addresses are present in a
   * multiaddr, an additional multiaddr will be added with `ip4` and `ip6`
   * tuples replaced with `dns4` and `dns6 ones respectively.
   */
  addDNSMapping(domain: string, ipAddresses: string[]): void

  /**
   * Remove a mapping previously added with `addDNSMapping`.
   */
  removeDNSMapping(domain: string): void
}
