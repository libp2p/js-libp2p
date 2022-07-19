import type { AddressManagerEvents } from '@libp2p/interface-address-manager'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { Multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import type { Components } from '@libp2p/components'
import type { PeerId } from '@libp2p/interface-peer-id'

export interface AddressManagerInit {
  announceFilter?: AddressFilter

  /**
   * list of multiaddrs string representation to listen
   */
  listen?: string[]

  /**
   * list of multiaddrs string representation to announce
   */
  announce?: string[]

  /**
   * list of multiaddrs string representation to never announce
   */
  noAnnounce?: string[]
}

export interface AddressFilter {
  (addrs: Multiaddr[]): Multiaddr[]
}

const defaultAddressFilter = (addrs: Multiaddr[]): Multiaddr[] => addrs

interface ObservedAddressMetadata {
  confident: boolean
}

function stripPeerId (ma: Multiaddr, peerId: PeerId) {
  const observedPeerId = ma.getPeerId()

  // strip our peer id if it has been passed
  if (observedPeerId != null) {
    const peerId = peerIdFromString(observedPeerId)

    // use same encoding for comparison
    if (peerId.equals(peerId)) {
      ma = ma.decapsulate(new Multiaddr(`/p2p/${peerId.toString()}`))
    }
  }

  return ma
}

export class DefaultAddressManager extends EventEmitter<AddressManagerEvents> {
  private readonly components: Components
  private readonly listen: Set<string>
  private readonly announce: Set<string>
  private readonly observed: Map<string, ObservedAddressMetadata>
  private readonly announceFilter: AddressFilter

  /**
   * Responsible for managing the peer addresses.
   * Peers can specify their listen and announce addresses.
   * The listen addresses will be used by the libp2p transports to listen for new connections,
   * while the announce addresses will be used for the peer addresses' to other peers in the network.
   */
  constructor (components: Components, init: AddressManagerInit) {
    super()

    const { listen = [], announce = [] } = init

    this.components = components
    this.listen = new Set(listen.map(ma => ma.toString()))
    this.announce = new Set(announce.map(ma => ma.toString()))
    this.observed = new Map()
    this.announceFilter = init.announceFilter ?? defaultAddressFilter
  }

  /**
   * Get peer listen multiaddrs
   */
  getListenAddrs (): Multiaddr[] {
    return Array.from(this.listen).map((a) => new Multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs
   */
  getAnnounceAddrs (): Multiaddr[] {
    return Array.from(this.announce).map((a) => new Multiaddr(a))
  }

  /**
   * Get observed multiaddrs
   */
  getObservedAddrs (): Multiaddr[] {
    return Array.from(this.observed)
      .map(([ma]) => new Multiaddr(ma))
  }

  /**
   * Add peer observed addresses
   */
  addObservedAddr (addr: Multiaddr): void {
    addr = stripPeerId(addr, this.components.getPeerId())
    const addrString = addr.toString()

    if (this.observed.has(addrString)) {
      return
    }

    this.observed.set(addrString, {
      confident: false
    })
  }

  confirmObservedAddr (addr: Multiaddr) {
    addr = stripPeerId(addr, this.components.getPeerId())
    const addrString = addr.toString()

    const metadata = this.observed.get(addrString) ?? {
      confident: false
    }

    const startingConfidence = metadata.confident

    this.observed.set(addrString, {
      confident: true
    })

    // only trigger the change:addresses event if our confidence in an address has changed
    if (startingConfidence === false) {
      this.dispatchEvent(new CustomEvent('change:addresses'))
    }
  }

  removeObservedAddr (addr: Multiaddr) {
    addr = stripPeerId(addr, this.components.getPeerId())
    const addrString = addr.toString()

    this.observed.delete(addrString)
  }

  getAddresses (): Multiaddr[] {
    let addrs = this.getAnnounceAddrs().map(ma => ma.toString())

    if (addrs.length === 0) {
      // no configured announce addrs, add configured listen addresses
      addrs = this.components.getTransportManager().getAddrs().map(ma => ma.toString())
    }

    // add observed addresses we are confident in
    addrs = addrs.concat(
      Array.from(this.observed)
        .filter(([ma, metadata]) => metadata.confident)
        .map(([ma]) => ma)
    )

    // dedupe multiaddrs
    const addrSet = new Set(addrs)

    // Create advertising list
    return this.announceFilter(Array.from(addrSet)
      .map(str => new Multiaddr(str)))
      .map(ma => {
        if (ma.getPeerId() === this.components.getPeerId().toString()) {
          return ma
        }

        return ma.encapsulate(`/p2p/${this.components.getPeerId().toString()}`)
      })
  }
}
