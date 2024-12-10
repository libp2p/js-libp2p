/* eslint-disable complexity */
import { isIPv4 } from '@chainsafe/is-ip'
import { peerIdFromString } from '@libp2p/peer-id'
import { debounce } from '@libp2p/utils/debounce'
import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import { multiaddr } from '@multiformats/multiaddr'
import { DNSMappings } from './dns-mappings.js'
import { IPMappings } from './ip-mappings.js'
import { ObservedAddresses } from './observed-addresses.js'
import { TransportAddresses } from './transport-addresses.js'
import type { ComponentLogger, Libp2pEvents, Logger, TypedEventTarget, PeerId, PeerStore } from '@libp2p/interface'
import type { AddressManager as AddressManagerInterface, TransportManager, NodeAddress, ConfirmAddressOptions } from '@libp2p/interface-internal'
import type { Filter } from '@libp2p/utils/filters'
import type { Multiaddr } from '@multiformats/multiaddr'

const ONE_MINUTE = 60_000

export const defaultValues = {
  maxObservedAddresses: 10,
  addressVerificationTTL: ONE_MINUTE * 10,
  addressVerificationRetry: ONE_MINUTE * 5
}

export interface AddressManagerInit {
  /**
   * Pass an function in this field to override the list of addresses
   * that are announced to the network
   */
  announceFilter?: AddressFilter

  /**
   * A list of string multiaddrs to listen on
   */
  listen?: string[]

  /**
   * A list of string multiaddrs to use instead of those reported by transports
   */
  announce?: string[]

  /**
   * A list of string multiaddrs string to never announce
   */
  noAnnounce?: string[]

  /**
   * A list of string multiaddrs to add to the list of announced addresses
   */
  appendAnnounce?: string[]

  /**
   * Limits the number of observed addresses we will store
   */
  maxObservedAddresses?: number

  /**
   * How long before each public address should be reverified in ms.
   *
   * Requires `@libp2p/autonat` or some other verification method to be
   * configured.
   *
   * @default 600_000
   */
  addressVerificationTTL?: number

  /**
   * After a transport or mapped address has failed to verify, how long to wait
   * before retrying it in ms
   *
   * Requires `@libp2p/autonat` or some other verification method to be
   * configured.
   *
   * @default 300_000
   */
  addressVerificationRetry?: number
}

export interface AddressManagerComponents {
  peerId: PeerId
  transportManager: TransportManager
  peerStore: PeerStore
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * A function that takes a list of multiaddrs and returns a list
 * to announce
 */
export interface AddressFilter {
  (addrs: Multiaddr[]): Multiaddr[]
}

const defaultAddressFilter = (addrs: Multiaddr[]): Multiaddr[] => addrs

/**
 * If the passed multiaddr contains the passed peer id, remove it
 */
function stripPeerId (ma: Multiaddr, peerId: PeerId): Multiaddr {
  const observedPeerIdStr = ma.getPeerId()

  // strip our peer id if it has been passed
  if (observedPeerIdStr != null) {
    const observedPeerId = peerIdFromString(observedPeerIdStr)

    // use same encoding for comparison
    if (observedPeerId.equals(peerId)) {
      ma = ma.decapsulate(multiaddr(`/p2p/${peerId.toString()}`))
    }
  }

  return ma
}

export class AddressManager implements AddressManagerInterface {
  private readonly log: Logger
  private readonly components: AddressManagerComponents
  // this is an array to allow for duplicates, e.g. multiples of `/ip4/0.0.0.0/tcp/0`
  private readonly listen: string[]
  private readonly announce: Set<string>
  private readonly appendAnnounce: Set<string>
  private readonly announceFilter: AddressFilter
  private readonly observed: ObservedAddresses
  private readonly dnsMappings: DNSMappings
  private readonly ipMappings: IPMappings
  private readonly transportAddresses: TransportAddresses
  private readonly observedAddressFilter: Filter
  private readonly addressVerificationTTL: number
  private readonly addressVerificationRetry: number

  /**
   * Responsible for managing the peer addresses.
   * Peers can specify their listen and announce addresses.
   * The listen addresses will be used by the libp2p transports to listen for new connections,
   * while the announce addresses will be used for the peer addresses' to other peers in the network.
   */
  constructor (components: AddressManagerComponents, init: AddressManagerInit = {}) {
    const { listen = [], announce = [], appendAnnounce = [] } = init

    this.components = components
    this.log = components.logger.forComponent('libp2p:address-manager')
    this.listen = listen.map(ma => ma.toString())
    this.announce = new Set(announce.map(ma => ma.toString()))
    this.appendAnnounce = new Set(appendAnnounce.map(ma => ma.toString()))
    this.observed = new ObservedAddresses(components, init)
    this.dnsMappings = new DNSMappings(components, init)
    this.ipMappings = new IPMappings(components, init)
    this.transportAddresses = new TransportAddresses(components, init)
    this.announceFilter = init.announceFilter ?? defaultAddressFilter
    this.observedAddressFilter = createScalableCuckooFilter(1024)
    this.addressVerificationTTL = init.addressVerificationTTL ?? defaultValues.addressVerificationTTL
    this.addressVerificationRetry = init.addressVerificationRetry ?? defaultValues.addressVerificationRetry

    // this method gets called repeatedly on startup when transports start listening so
    // debounce it so we don't cause multiple self:peer:update events to be emitted
    this._updatePeerStoreAddresses = debounce(this._updatePeerStoreAddresses.bind(this), 1000)

    // update our stored addresses when new transports listen
    components.events.addEventListener('transport:listening', () => {
      this._updatePeerStoreAddresses()
    })
    // update our stored addresses when existing transports stop listening
    components.events.addEventListener('transport:close', () => {
      this._updatePeerStoreAddresses()
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/address-manager'

  _updatePeerStoreAddresses (): void {
    // if announce addresses have been configured, ensure they make it into our peer
    // record for things like identify
    const addrs = this.getAddresses()
      .map(ma => {
        // strip our peer id if it is present
        if (ma.getPeerId() === this.components.peerId.toString()) {
          return ma.decapsulate(`/p2p/${this.components.peerId.toString()}`)
        }

        return ma
      })

    this.components.peerStore.patch(this.components.peerId, {
      multiaddrs: addrs
    })
      .catch(err => {
        this.log.error('error updating addresses', err)
      })
  }

  /**
   * Get peer listen multiaddrs
   */
  getListenAddrs (): Multiaddr[] {
    return Array.from(this.listen).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs
   */
  getAnnounceAddrs (): Multiaddr[] {
    return Array.from(this.announce).map((a) => multiaddr(a))
  }

  /**
   * Get peer announcing multiaddrs
   */
  getAppendAnnounceAddrs (): Multiaddr[] {
    return Array.from(this.appendAnnounce).map((a) => multiaddr(a))
  }

  /**
   * Get observed multiaddrs
   */
  getObservedAddrs (): Multiaddr[] {
    return this.observed.getAll().map(addr => addr.multiaddr)
  }

  /**
   * Add peer observed addresses
   */
  addObservedAddr (addr: Multiaddr): void {
    const tuples = addr.stringTuples()
    const socketAddress = `${tuples[0][1]}:${tuples[1][1]}`

    // ignore if this address if it's been observed before
    if (this.observedAddressFilter.has(socketAddress)) {
      return
    }

    this.observedAddressFilter.add(socketAddress)

    addr = stripPeerId(addr, this.components.peerId)

    // ignore observed address if it is an IP mapping
    if (this.ipMappings.has(addr)) {
      return
    }

    // ignore observed address if it is a DNS mapping
    if (this.dnsMappings.has(addr)) {
      return
    }

    this.observed.add(addr)
  }

  confirmObservedAddr (addr: Multiaddr, options?: ConfirmAddressOptions): void {
    addr = stripPeerId(addr, this.components.peerId)
    let startingConfidence = true

    if (options?.type === 'observed' || this.observed.has(addr)) {
      startingConfidence = this.observed.confirm(addr, options?.ttl ?? this.addressVerificationTTL)
    }

    if (options?.type === 'transport' || this.transportAddresses.has(addr)) {
      startingConfidence = this.transportAddresses.confirm(addr, options?.ttl ?? this.addressVerificationTTL)
    }

    if (options?.type === 'dns-mapping' || this.dnsMappings.has(addr)) {
      startingConfidence = this.dnsMappings.confirm(addr, options?.ttl ?? this.addressVerificationTTL)
    }

    if (options?.type === 'ip-mapping' || this.ipMappings.has(addr)) {
      startingConfidence = this.ipMappings.confirm(addr, options?.ttl ?? this.addressVerificationTTL)
    }

    // only trigger the 'self:peer:update' event if our confidence in an address has changed
    if (!startingConfidence) {
      this._updatePeerStoreAddresses()
    }
  }

  removeObservedAddr (addr: Multiaddr, options?: ConfirmAddressOptions): void {
    addr = stripPeerId(addr, this.components.peerId)

    let startingConfidence = false

    if (this.observed.has(addr)) {
      startingConfidence = this.observed.remove(addr)
    }

    if (this.transportAddresses.has(addr)) {
      startingConfidence = this.transportAddresses.unconfirm(addr, options?.ttl ?? this.addressVerificationRetry)
    }

    if (this.dnsMappings.has(addr)) {
      startingConfidence = this.dnsMappings.unconfirm(addr, options?.ttl ?? this.addressVerificationRetry)
    }

    if (this.ipMappings.has(addr)) {
      startingConfidence = this.ipMappings.unconfirm(addr, options?.ttl ?? this.addressVerificationRetry)
    }

    // only trigger the 'self:peer:update' event if our confidence in an address has changed
    if (startingConfidence) {
      this._updatePeerStoreAddresses()
    }
  }

  getAddresses (): Multiaddr[] {
    const addresses = new Set<string>()

    const multiaddrs = this.getAddressesWithMetadata()
      .filter(addr => {
        if (!addr.verified) {
          return false
        }

        const maStr = addr.multiaddr.toString()

        if (addresses.has(maStr)) {
          return false
        }

        addresses.add(maStr)

        return true
      })
      .map(address => address.multiaddr)

    // filter addressees before returning
    return this.announceFilter(
      multiaddrs.map(str => {
        const ma = multiaddr(str)

        // do not append our peer id to a path multiaddr as it will become invalid
        if (ma.protos().pop()?.path === true) {
          return ma
        }

        if (ma.getPeerId() === this.components.peerId.toString()) {
          return ma
        }

        return ma.encapsulate(`/p2p/${this.components.peerId.toString()}`)
      })
    )
  }

  getAddressesWithMetadata (): NodeAddress[] {
    const announceMultiaddrs = this.getAnnounceAddrs()

    if (announceMultiaddrs.length > 0) {
      return announceMultiaddrs.map(multiaddr => ({
        multiaddr,
        verified: true,
        type: 'announce',
        expires: Date.now() + this.addressVerificationTTL,
        lastVerified: Date.now()
      }))
    }

    let addresses: NodeAddress[] = []

    // add transport addresses
    addresses = addresses.concat(
      this.components.transportManager.getAddrs()
        .map(multiaddr => this.transportAddresses.get(multiaddr, this.addressVerificationTTL))
    )

    // add append announce addresses
    addresses = addresses.concat(
      this.getAppendAnnounceAddrs().map(multiaddr => ({
        multiaddr,
        verified: true,
        type: 'announce',
        expires: Date.now() + this.addressVerificationTTL,
        lastVerified: Date.now()
      }))
    )

    // add observed addresses
    addresses = addresses.concat(
      this.observed.getAll()
    )

    // add ip mapped addresses
    addresses = addresses.concat(
      this.ipMappings.getAll(addresses)
    )

    // add ip->domain mappings, must be done after IP mappings
    addresses = addresses.concat(
      this.dnsMappings.getAll(addresses)
    )

    return addresses
  }

  addDNSMapping (domain: string, addresses: string[]): void {
    this.dnsMappings.add(domain, addresses)
  }

  removeDNSMapping (domain: string): void {
    if (this.dnsMappings.remove(multiaddr(`/dns/${domain}`))) {
      this._updatePeerStoreAddresses()
    }
  }

  addPublicAddressMapping (internalIp: string, internalPort: number, externalIp: string, externalPort: number = internalPort, protocol: 'tcp' | 'udp' = 'tcp'): void {
    this.ipMappings.add(internalIp, internalPort, externalIp, externalPort, protocol)

    // remove duplicate observed addresses
    this.observed.removePrefixed(`/ip${isIPv4(externalIp) ? 4 : 6}/${externalIp}/${protocol}/${externalPort}`)
  }

  removePublicAddressMapping (internalIp: string, internalPort: number, externalIp: string, externalPort: number = internalPort, protocol: 'tcp' | 'udp' = 'tcp'): void {
    if (this.ipMappings.remove(multiaddr(`/ip${isIPv4(externalIp) ? 4 : 6}/${externalIp}/${protocol}/${externalPort}`))) {
      this._updatePeerStoreAddresses()
    }
  }
}
