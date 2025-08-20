/* eslint-disable complexity */
import { isIPv4 } from '@chainsafe/is-ip'
import { peerIdFromString } from '@libp2p/peer-id'
import { debounce } from '@libp2p/utils/debounce'
import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import { isPrivateIp } from '@libp2p/utils/private-ip'
import { multiaddr } from '@multiformats/multiaddr'
import { QUIC_V1, TCP, WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import { DNSMappings } from './dns-mappings.js'
import { IPMappings } from './ip-mappings.js'
import { ObservedAddresses } from './observed-addresses.js'
import { TransportAddresses } from './transport-addresses.js'
import type { ComponentLogger, Libp2pEvents, Logger, PeerId, PeerStore, Metrics } from '@libp2p/interface'
import type { AddressManager as AddressManagerInterface, TransportManager, NodeAddress, ConfirmAddressOptions } from '@libp2p/interface-internal'
import type { Filter } from '@libp2p/utils/filters'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'

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
  metrics?: Metrics
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

    if (options?.type === 'transport' || this.transportAddresses.has(addr)) {
      const transportStartingConfidence = this.transportAddresses.confirm(addr, options?.ttl ?? this.addressVerificationTTL)

      if (!transportStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
    }

    if (options?.type === 'dns-mapping' || this.dnsMappings.has(addr)) {
      const dnsMappingStartingConfidence = this.dnsMappings.confirm(addr, options?.ttl ?? this.addressVerificationTTL)

      if (!dnsMappingStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
    }

    if (options?.type === 'ip-mapping' || this.ipMappings.has(addr)) {
      const ipMappingStartingConfidence = this.ipMappings.confirm(addr, options?.ttl ?? this.addressVerificationTTL)

      if (!ipMappingStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
    }

    if (options?.type === 'observed' || this.observed.has(addr)) {
      // try to match up observed address with local transport listener
      if (this.maybeUpgradeToIPMapping(addr)) {
        this.ipMappings.confirm(addr, options?.ttl ?? this.addressVerificationTTL)
        startingConfidence = false
      } else {
        const observedStartingConfidence = this.observed.confirm(addr, options?.ttl ?? this.addressVerificationTTL)

        if (!observedStartingConfidence && startingConfidence) {
          startingConfidence = false
        }
      }
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
      const observedStartingConfidence = this.observed.remove(addr)

      if (!observedStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
    }

    if (this.transportAddresses.has(addr)) {
      const transportStartingConfidence = this.transportAddresses.unconfirm(addr, options?.ttl ?? this.addressVerificationRetry)

      if (!transportStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
    }

    if (this.dnsMappings.has(addr)) {
      const dnsMappingStartingConfidence = this.dnsMappings.unconfirm(addr, options?.ttl ?? this.addressVerificationRetry)

      if (!dnsMappingStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
    }

    if (this.ipMappings.has(addr)) {
      const ipMappingStartingConfidence = this.ipMappings.unconfirm(addr, options?.ttl ?? this.addressVerificationRetry)

      if (!ipMappingStartingConfidence && startingConfidence) {
        startingConfidence = false
      }
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
        const lastComponent = ma.getComponents().pop()

        if (lastComponent?.value === this.components.peerId.toString()) {
          return ma
        }

        return ma.encapsulate(`/p2p/${this.components.peerId.toString()}`)
      })
    )
  }

  getAddressesWithMetadata (): NodeAddress[] {
    const announceMultiaddrs = this.getAnnounceAddrs()

    if (announceMultiaddrs.length > 0) {
      // allow transports to add certhashes and other runtime information
      this.components.transportManager.getListeners().forEach(listener => {
        listener.updateAnnounceAddrs(announceMultiaddrs)
      })

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

    const appendAnnounceMultiaddrs = this.getAppendAnnounceAddrs()

    // add append announce addresses
    if (appendAnnounceMultiaddrs.length > 0) {
      // allow transports to add certhashes and other runtime information
      this.components.transportManager.getListeners().forEach(listener => {
        listener.updateAnnounceAddrs(appendAnnounceMultiaddrs)
      })

      addresses = addresses.concat(
        appendAnnounceMultiaddrs.map(multiaddr => ({
          multiaddr,
          verified: true,
          type: 'announce',
          expires: Date.now() + this.addressVerificationTTL,
          lastVerified: Date.now()
        }))
      )
    }

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

  /**
   * Where an external service (router, gateway, etc) is forwarding traffic to
   * us, attempt to add an IP mapping for the external address - this will
   * include the observed mapping in the address list where we also have a DNS
   * mapping for the external IP.
   *
   * Returns true if we added a new mapping
   */
  private maybeUpgradeToIPMapping (ma: Multiaddr): boolean {
    // this address is already mapped
    if (this.ipMappings.has(ma)) {
      return false
    }

    const maOptions = ma.toOptions()

    // only public IPv4 addresses
    if (maOptions.family === 6 || maOptions.host === '127.0.0.1' || isPrivateIp(maOptions.host) === true) {
      return false
    }

    const listeners = this.components.transportManager.getListeners()

    const transportMatchers: Array<(ma: Multiaddr) => boolean> = [
      (ma: Multiaddr) => WebSockets.exactMatch(ma) || WebSocketsSecure.exactMatch(ma),
      (ma: Multiaddr) => TCP.exactMatch(ma),
      (ma: Multiaddr) => QUIC_V1.exactMatch(ma)
    ]

    for (const matcher of transportMatchers) {
      // is the incoming address the same type as the matcher
      if (!matcher(ma)) {
        continue
      }

      // get the listeners for this transport
      const transportListeners = listeners.filter(listener => {
        return listener.getAddrs().filter(ma => {
          // only IPv4 addresses of the matcher type
          return ma.toOptions().family === 4 && matcher(ma)
        }).length > 0
      })

      // because the NAT mapping could be forwarding different external ports to
      // internal ones, we can only be sure enough to add a mapping if there is
      // a single listener
      if (transportListeners.length !== 1) {
        continue
      }

      // we have one listener which listens on one port so whatever the external
      // NAT port mapping is, it should be for this listener
      const linkLocalAddr = transportListeners[0].getAddrs().filter(ma => {
        return ma.toOptions().host !== '127.0.0.1'
      }).pop()

      if (linkLocalAddr == null) {
        continue
      }

      const linkLocalOptions = linkLocalAddr.toOptions()

      // upgrade observed address to IP mapping
      this.observed.remove(ma)
      this.ipMappings.add(
        linkLocalOptions.host,
        linkLocalOptions.port,
        maOptions.host,
        maOptions.port,
        maOptions.transport
      )

      return true
    }

    return false
  }
}
