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
}
