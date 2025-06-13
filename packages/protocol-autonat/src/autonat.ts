import { serviceCapabilities, serviceDependencies } from '@libp2p/interface'
import { peerSet } from '@libp2p/peer-collections'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import { createScalableCuckooFilter } from '@libp2p/utils/filters'
import { isGlobalUnicast } from '@libp2p/utils/multiaddr/is-global-unicast'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { PeerQueue } from '@libp2p/utils/peer-queue'
import { repeatingTask } from '@libp2p/utils/repeating-task'
import { trackedMap } from '@libp2p/utils/tracked-map'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { anySignal } from 'any-signal'
import { pbStream } from 'it-protobuf-stream'
import { setMaxListeners } from 'main-event'
import * as Digest from 'multiformats/hashes/digest'
import { DEFAULT_CONNECTION_THRESHOLD, MAX_INBOUND_STREAMS, MAX_MESSAGE_SIZE, MAX_OUTBOUND_STREAMS, PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION, TIMEOUT } from './constants.js'
import { Message } from './pb/index.js'
import type { AutoNATComponents, AutoNATServiceInit } from './index.js'
import type { Logger, Connection, PeerId, Startable, AbortOptions, IncomingStreamData } from '@libp2p/interface'
import type { AddressType } from '@libp2p/interface-internal'
import type { PeerSet } from '@libp2p/peer-collections'
import type { Filter } from '@libp2p/utils/filters'
import type { RepeatingTask } from '@libp2p/utils/repeating-task'
import type { Multiaddr } from '@multiformats/multiaddr'

// if more than 3 peers manage to dial us on what we believe to be our external
// IP then we are convinced that it is, in fact, our external IP
// https://github.com/libp2p/specs/blob/master/autonat/autonat-v1.md#autonat-protocol
const REQUIRED_SUCCESSFUL_DIALS = 4
const REQUIRED_FAILED_DIALS = 8

interface TestAddressOptions extends AbortOptions {
  multiaddr: Multiaddr
  peerId: PeerId
}

interface DialResults {
  /**
   * The address being tested
   */
  multiaddr: Multiaddr

  /**
   * The number of successful dials from peers
   */
  success: number

  /**
   * The number of dial failures from peers
   */
  failure: number

  /**
   * For the multiaddr corresponding the the string key of the `dialResults`
   * map, these are the IP segments that a successful dial result has been
   * received from
   */
  networkSegments: string[]

  /**
   * Ensure that the same peer id can't verify multiple times
   */
  verifyingPeers: PeerSet

  /**
   * The number of peers currently verifying this address
   */
  queue: PeerQueue<void, TestAddressOptions>

  /**
   * Updated when this address is verified or failed
   */
  result?: boolean

  /**
   * The type of address
   */
  type: AddressType

  /**
   * The last time the address was verified
   */
  lastVerified?: number
}

export class AutoNATService implements Startable {
  private readonly components: AutoNATComponents
  private readonly protocol: string
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly maxMessageSize: number
  private started: boolean
  private readonly log: Logger
  private topologyId?: string
  private readonly dialResults: Map<string, DialResults>
  private readonly findPeers: RepeatingTask
  private readonly addressFilter: Filter
  private readonly connectionThreshold: number

  constructor (components: AutoNATComponents, init: AutoNATServiceInit) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:auto-nat')
    this.started = false
    this.protocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.connectionThreshold = init.connectionThreshold ?? DEFAULT_CONNECTION_THRESHOLD
    this.maxMessageSize = init.maxMessageSize ?? MAX_MESSAGE_SIZE
    this.dialResults = trackedMap({
      name: 'libp2p_autonat_dial_results',
      metrics: components.metrics
    })
    this.findPeers = repeatingTask(this.findRandomPeers.bind(this), 60_000)
    this.addressFilter = createScalableCuckooFilter(1024)
  }

  readonly [Symbol.toStringTag] = '@libp2p/autonat'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/autonat'
  ]

  get [serviceDependencies] (): string[] {
    return [
      '@libp2p/identify'
    ]
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await this.components.registrar.handle(this.protocol, (data) => {
      void this.handleIncomingAutonatStream(data)
        .catch(err => {
          this.log.error('error handling incoming autonat stream - %e', err)
        })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams
    })

    this.topologyId = await this.components.registrar.register(this.protocol, {
      onConnect: (peerId, connection) => {
        this.verifyExternalAddresses(connection)
          .catch(err => {
            this.log.error('could not verify addresses - %e', err)
          })
      }
    })

    this.findPeers.start()
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)

    if (this.topologyId != null) {
      await this.components.registrar.unhandle(this.topologyId)
    }

    this.dialResults.clear()
    this.findPeers.stop()
    this.started = false
  }

  private allAddressesAreVerified (): boolean {
    return this.components.addressManager.getAddressesWithMetadata().every(addr => {
      if (addr.expires > Date.now()) {
        // ignore any unverified addresses within their TTL
        return true
      }

      return addr.verified
    })
  }

  async findRandomPeers (options?: AbortOptions): Promise<void> {
    // skip if all addresses are verified
    if (this.allAddressesAreVerified()) {
      return
    }

    const signal = anySignal([
      AbortSignal.timeout(10_000),
      options?.signal
    ])

    // spend a few seconds finding random peers - dial them which will run
    // identify to trigger the topology callbacks and run AutoNAT
    try {
      this.log('starting random walk to find peers to run AutoNAT')

      for await (const peer of this.components.randomWalk.walk({ signal })) {
        if (!(await this.components.connectionManager.isDialable(peer.multiaddrs))) {
          this.log.trace('random peer %p was not dialable %s', peer.id, peer.multiaddrs.map(ma => ma.toString()).join(', '))

          // skip peers we can't dial
          continue
        }

        try {
          this.log.trace('dial random peer %p', peer.id)
          await this.components.connectionManager.openConnection(peer.multiaddrs, {
            signal
          })
        } catch {}

        if (this.allAddressesAreVerified()) {
          this.log('stopping random walk, all addresses are verified')
          return
        }

        if (!this.hasConnectionCapacity()) {
          this.log('stopping random walk, too close to max connections')
          return
        }
      }
    } catch {}
  }

  /**
   * Handle an incoming AutoNAT request
   */
  async handleIncomingAutonatStream (data: IncomingStreamData): Promise<void> {
    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)

    const messages = pbStream(data.stream, {
      maxDataLength: this.maxMessageSize
    }).pb(Message)

    try {
      const request = await messages.read({
        signal
      })
      const response = await this.handleAutonatMessage(request, data.connection, {
        signal
      })
      await messages.write(response, {
        signal
      })
      await messages.unwrap().unwrap().close({
        signal
      })
    } catch (err: any) {
      this.log.error('error handling incoming autonat stream - %e', err)
      data.stream.abort(err)
    }
  }

  private async handleAutonatMessage (message: Message, connection: Connection, options?: AbortOptions): Promise<Message> {
    const ourHosts = this.components.addressManager.getAddresses()
      .map(ma => ma.toOptions().host)

    const dialRequest = message.dial

    if (dialRequest == null) {
      this.log.error('dial was missing from message')

      return {
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse: {
          status: Message.ResponseStatus.E_BAD_REQUEST,
          statusText: 'No Dial message found in message'
        }
      }
    }

    let peerId: PeerId
    const peer = dialRequest.peer

    if (peer?.id == null) {
      this.log.error('PeerId missing from message')

      return {
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse: {
          status: Message.ResponseStatus.E_BAD_REQUEST,
          statusText: 'missing peer info'
        }
      }
    }

    try {
      const digest = Digest.decode(peer.id)
      peerId = peerIdFromMultihash(digest)
    } catch (err) {
      this.log.error('invalid PeerId - %e', err)

      return {
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse: {
          status: Message.ResponseStatus.E_BAD_REQUEST,
          statusText: 'bad peer id'
        }
      }
    }

    this.log('incoming request from %p', peerId)

    // reject any dial requests that arrive via relays
    if (!connection.remotePeer.equals(peerId)) {
      this.log('target peer %p did not equal sending peer %p', peerId, connection.remotePeer)

      return {
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse: {
          status: Message.ResponseStatus.E_BAD_REQUEST,
          statusText: 'peer id mismatch'
        }
      }
    }

    // get a list of multiaddrs to dial
    const multiaddrs = peer.addrs
      .map(buf => multiaddr(buf))
      .filter(ma => {
        const options = ma.toOptions()

        if (isPrivate(ma)) {
          // don't try to dial private addresses
          return false
        }

        if (options.host !== connection.remoteAddr.toOptions().host) {
          // skip any Multiaddrs where the target node's IP does not match the sending node's IP
          this.log.trace('not dialing %a - target host did not match remote host %a', ma, connection.remoteAddr)
          return false
        }

        if (ourHosts.includes(options.host)) {
          // don't try to dial nodes on the same host as us
          return false
        }

        if (this.components.transportManager.dialTransportForMultiaddr(ma) == null) {
          // skip any Multiaddrs that have transports we do not support
          this.log.trace('not dialing %a - transport unsupported', ma)
          return false
        }

        return true
      })
      .map(ma => {
        if (ma.getPeerId() == null) {
          // make sure we have the PeerId as part of the Multiaddr
          ma = ma.encapsulate(`/p2p/${peerId.toString()}`)
        }

        return ma
      })

    // make sure we have something to dial
    if (multiaddrs.length === 0) {
      this.log('refused to dial all multiaddrs for %p from message', peerId)

      return {
        type: Message.MessageType.DIAL_RESPONSE,
        dialResponse: {
          status: Message.ResponseStatus.E_DIAL_REFUSED,
          statusText: 'no dialable addresses'
        }
      }
    }

    this.log('dial multiaddrs %s for peer %p', multiaddrs.map(ma => ma.toString()).join(', '), peerId)

    let errorMessage = ''
    let lastMultiaddr = multiaddrs[0]

    for (const multiaddr of multiaddrs) {
      let connection: Connection | undefined
      lastMultiaddr = multiaddr

      try {
        connection = await this.components.connectionManager.openConnection(multiaddr, options)

        if (!connection.remoteAddr.equals(multiaddr)) {
          this.log.error('tried to dial %a but dialed %a', multiaddr, connection.remoteAddr)
          throw new Error('Unexpected remote address')
        }

        this.log('successfully dialed %p via %a', peerId, multiaddr)

        return {
          type: Message.MessageType.DIAL_RESPONSE,
          dialResponse: {
            status: Message.ResponseStatus.OK,
            addr: connection.remoteAddr.decapsulateCode(protocols('p2p').code).bytes
          }
        }
      } catch (err: any) {
        this.log.error('could not dial %p - %e', peerId, err)
        errorMessage = err.message
      } finally {
        if (connection != null) {
          await connection.close()
        }
      }
    }

    return {
      type: Message.MessageType.DIAL_RESPONSE,
      dialResponse: {
        status: Message.ResponseStatus.E_DIAL_ERROR,
        statusText: errorMessage,
        addr: lastMultiaddr.bytes
      }
    }
  }

  /**
   * The AutoNAT v1 server is not required to send us the address that it
   * dialed successfully.
   *
   * When addresses fail, it can be because they are NATed, or because the peer
   * did't support the transport, we have no way of knowing, so just send them
   * one address so we can treat the response as:
   *
   * - OK - the dial request worked and the address is not NATed
   * - E_DIAL_ERROR - the dial request failed and the address may be NATed
   * - E_DIAL_REFUSED/E_BAD_REQUEST/E_INTERNAL_ERROR - the remote didn't dial the address
   */
  private getFirstUnverifiedMultiaddr (segment: string, supportsIPv6: boolean): DialResults | undefined {
    const addrs = this.components.addressManager.getAddressesWithMetadata()
      .sort((a, b) => {
        // sort addresses, de-prioritize observed addresses
        if (a.type === 'observed' && b.type !== 'observed') {
          return 1
        }

        if (b.type === 'observed' && a.type !== 'observed') {
          return -1
        }

        return 0
      })
      .filter(addr => {
        const expired = addr.expires < Date.now()

        if (!expired) {
          // skip verified/non-verified addresses within their TTL
          return false
        }

        const options = addr.multiaddr.toOptions()

        if (options.family === 6) {
          // do not send IPv6 addresses to peers without IPv6 addresses
          if (!supportsIPv6) {
            return false
          }

          if (!isGlobalUnicast(addr.multiaddr)) {
            // skip non-globally routable addresses
            return false
          }
        }

        if (isPrivate(addr.multiaddr)) {
          // skip private addresses
          return false
        }

        return true
      })

    for (const addr of addrs) {
      const addrString = addr.multiaddr.toString()
      let results = this.dialResults.get(addrString)

      if (results != null) {
        if (results.networkSegments.includes(segment)) {
          this.log.trace('%a already has a network segment result from %s', results.multiaddr, segment)
          // skip this address if we already have a dial result from the
          // network segment the peer is in
          continue
        }

        if (results.queue.size > 10) {
          this.log.trace('%a already has enough peers queued', results.multiaddr)
          // already have enough peers verifying this address, skip on to the
          // next one
          continue
        }
      }

      // will include this multiaddr, ensure we have a results object
      if (results == null) {
        const needsRevalidating = addr.expires < Date.now()

        // allow re-validating addresses that worked previously
        if (needsRevalidating) {
          this.addressFilter.remove?.(addrString)
        }

        if (this.addressFilter.has(addrString)) {
          continue
        }

        // only try to validate the address once
        this.addressFilter.add(addrString)

        this.log.trace('creating dial result %s %s', needsRevalidating ? 'to revalidate' : 'for', addrString)
        results = {
          multiaddr: addr.multiaddr,
          success: 0,
          failure: 0,
          networkSegments: [],
          verifyingPeers: peerSet(),
          queue: new PeerQueue({
            concurrency: 3,
            maxSize: 50
          }),
          type: addr.type,
          lastVerified: addr.lastVerified
        }

        this.dialResults.set(addrString, results)
      }

      return results
    }
  }

  /**
   * Removes any multiaddr result objects created for old multiaddrs that we are
   * no longer waiting on
   */
  private removeOutdatedMultiaddrResults (): void {
    const unverifiedMultiaddrs = new Set(this.components.addressManager.getAddressesWithMetadata()
      .filter(({ expires }) => {
        if (expires < Date.now()) {
          return true
        }

        return false
      })
      .map(({ multiaddr }) => multiaddr.toString())
    )

    for (const multiaddr of this.dialResults.keys()) {
      if (!unverifiedMultiaddrs.has(multiaddr)) {
        this.log.trace('remove results for %a', multiaddr)
        this.dialResults.delete(multiaddr)
      }
    }
  }

  /**
   * Our multicodec topology noticed a new peer that supports autonat
   */
  async verifyExternalAddresses (connection: Connection): Promise<void> {
    // do nothing if we are not running
    if (!this.isStarted()) {
      return
    }

    // perform cleanup
    this.removeOutdatedMultiaddrResults()

    const peer = await this.components.peerStore.get(connection.remotePeer)

    // if the remote peer has IPv6 addresses, we can probably send them an IPv6
    // address to verify, otherwise only send them IPv4 addresses
    const supportsIPv6 = peer.addresses.some(({ multiaddr }) => {
      return multiaddr.toOptions().family === 6
    })

    // get multiaddrs this peer is eligible to verify
    const segment = this.getNetworkSegment(connection.remoteAddr)
    const results = this.getFirstUnverifiedMultiaddr(segment, supportsIPv6)

    if (results == null) {
      this.log.trace('no unverified public addresses found for peer %p to verify, not requesting verification', connection.remotePeer)
      return
    }

    if (!this.hasConnectionCapacity()) {
      // we are near the max connection limit - any dial attempts from remote
      // peers may be rejected which will get flagged as false dial errors and
      // lead us to un-verify an otherwise reachable address

      if (results.lastVerified != null) {
        this.log('automatically re-verifying %a because we are too close to the connection limit', results.multiaddr)
        this.confirmAddress(results)
      } else {
        this.log('skipping verifying %a because we are too close to the connection limit', results.multiaddr)
      }

      return
    }

    results.queue.add(async (options: TestAddressOptions) => {
      await this.askPeerToVerify(connection, segment, options)
    }, {
      peerId: connection.remotePeer,
      multiaddr: results.multiaddr
    })
      .catch(err => {
        if (results?.result == null) {
          this.log.error('error from %p verifying address %a - %e', connection.remotePeer, results?.multiaddr, err)
        }
      })
  }

  private async askPeerToVerify (connection: Connection, segment: string, options: TestAddressOptions): Promise<void> {
    let results = this.dialResults.get(options.multiaddr.toString())

    if (results == null) {
      this.log('%a was verified while %p was queued', options.multiaddr, connection.remotePeer)
      return
    }

    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)

    this.log.trace('asking %p to verify multiaddr %s', connection.remotePeer, options.multiaddr)

    const stream = await connection.newStream(this.protocol, {
      signal
    })

    try {
      const messages = pbStream(stream).pb(Message)
      const [, response] = await Promise.all([
        messages.write({
          type: Message.MessageType.DIAL,
          dial: {
            peer: {
              id: this.components.peerId.toMultihash().bytes,
              addrs: [options.multiaddr.bytes]
            }
          }
        }, { signal }),
        messages.read({ signal })
      ])

      if (response.type !== Message.MessageType.DIAL_RESPONSE || response.dialResponse == null) {
        this.log('invalid autonat response from %p - %j', connection.remotePeer, response)
        return
      }

      const status = response.dialResponse.status

      this.log.trace('autonat response from %p for %a is %s', connection.remotePeer, options.multiaddr, status)

      if (status !== Message.ResponseStatus.OK && status !== Message.ResponseStatus.E_DIAL_ERROR) {
        return
      }

      results = this.dialResults.get(options.multiaddr.toString())

      if (results == null) {
        this.log.trace('peer reported %a as %s but there is no result object', options.multiaddr, response.dialResponse.status)
        return
      }

      if (results.networkSegments.includes(segment)) {
        this.log.trace('%a results included network segment %s', options.multiaddr, segment)
        return
      }

      if (results.result != null) {
        this.log.trace('already resolved result for %a, ignoring response from', options.multiaddr, connection.remotePeer)
        return
      }

      if (results.verifyingPeers.has(connection.remotePeer)) {
        this.log.trace('peer %p has already verified %a, ignoring response', connection.remotePeer, options.multiaddr)
        return
      }

      results.verifyingPeers.add(connection.remotePeer)
      results.networkSegments.push(segment)

      if (status === Message.ResponseStatus.OK) {
        results.success++

        // observed addresses require more confirmations
        if (results.type !== 'observed') {
          this.confirmAddress(results)
          return
        }
      } else if (status === Message.ResponseStatus.E_DIAL_ERROR) {
        results.failure++
      }

      this.log('%a success %d failure %d', results.multiaddr, results.success, results.failure)

      if (results.success === REQUIRED_SUCCESSFUL_DIALS) {
        this.confirmAddress(results)
      }

      if (results.failure === REQUIRED_FAILED_DIALS) {
        this.unconfirmAddress(results)
      }
    } finally {
      try {
        await stream.close({
          signal
        })
      } catch (err: any) {
        stream.abort(err)
      }
    }
  }

  private hasConnectionCapacity (): boolean {
    const connections = this.components.connectionManager.getConnections()
    const currentConnectionCount = connections.length
    const maxConnections = this.components.connectionManager.getMaxConnections()

    return ((currentConnectionCount / maxConnections) * 100) < this.connectionThreshold
  }

  private confirmAddress (results: DialResults): void {
    // we are now convinced
    this.log('%s address %a is externally dialable', results.type, results.multiaddr)
    this.components.addressManager.confirmObservedAddr(results.multiaddr)
    this.dialResults.delete(results.multiaddr.toString())

    // abort & remove any outstanding verification jobs for this multiaddr
    results.result = true
    results.queue.abort()
  }

  private unconfirmAddress (results: DialResults): void {
    // we are now unconvinced
    this.log('%s address %a is not externally dialable', results.type, results.multiaddr)
    this.components.addressManager.removeObservedAddr(results.multiaddr)
    this.dialResults.delete(results.multiaddr.toString())

    // abort & remove any outstanding verification jobs for this multiaddr
    results.result = false
    results.queue.abort()
  }

  private getNetworkSegment (ma: Multiaddr): string {
    // make sure we use different network segments
    const options = ma.toOptions()

    if (options.family === 4) {
      const octets = options.host.split('.')
      return octets[0].padStart(3, '0')
    }

    const octets = options.host.split(':')
    return octets[0].padStart(4, '0')
  }
}
