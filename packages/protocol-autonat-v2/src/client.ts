import { InvalidParametersError, ProtocolError, serviceCapabilities, serviceDependencies } from '@libp2p/interface'
import { peerSet } from '@libp2p/peer-collections'
import { createScalableCuckooFilter, isGlobalUnicast, isPrivate, PeerQueue, repeatingTask, trackedMap, pbStream, getNetConfig } from '@libp2p/utils'
import { anySignal } from 'any-signal'
import { setMaxListeners } from 'main-event'
import { DEFAULT_CONNECTION_THRESHOLD, DIAL_DATA_CHUNK_SIZE, MAX_DIAL_DATA_BYTES, MAX_INBOUND_STREAMS, MAX_MESSAGE_SIZE, MAX_OUTBOUND_STREAMS, TIMEOUT } from './constants.ts'
import { DialBack, DialBackResponse, DialResponse, DialStatus, Message } from './pb/index.ts'
import { randomNumber } from './utils.ts'
import type { AutoNATv2Components, AutoNATv2ServiceInit } from './index.ts'
import type { Logger, Connection, Startable, AbortOptions, Stream } from '@libp2p/interface'
import type { AddressType } from '@libp2p/interface-internal'
import type { PeerSet } from '@libp2p/peer-collections'
import type { Filter, RepeatingTask } from '@libp2p/utils'
import type { Multiaddr } from '@multiformats/multiaddr'

// if more than 3 peers manage to dial us on what we believe to be our external
// IP then we are convinced that it is, in fact, our external IP
// https://github.com/libp2p/specs/blob/master/autonat/autonat-v1.md#autonat-protocol
const REQUIRED_SUCCESSFUL_DIALS = 4
const REQUIRED_FAILED_DIALS = 8

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

export interface AutoNATv2ClientInit extends AutoNATv2ServiceInit {
  dialRequestProtocol: string
  dialBackProtocol: string
  maxDialDataBytes?: bigint
  dialDataChunkSize?: number
}

export class AutoNATv2Client implements Startable {
  private readonly components: AutoNATv2Components
  private readonly dialRequestProtocol: string
  private readonly dialBackProtocol: string
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly maxMessageSize: number
  private readonly maxDialDataBytes: bigint
  private readonly dialDataChunkSize: number
  private started: boolean
  private readonly log: Logger
  private topologyId?: string
  private readonly dialResults: Map<string, DialResults>
  private readonly findPeers: RepeatingTask
  private readonly addressFilter: Filter
  private readonly connectionThreshold: number
  private readonly queue: PeerQueue
  private readonly nonces: Set<bigint>

  constructor (components: AutoNATv2Components, init: AutoNATv2ClientInit) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:auto-nat-v2:client')
    this.started = false
    this.dialRequestProtocol = init.dialRequestProtocol
    this.dialBackProtocol = init.dialBackProtocol
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.connectionThreshold = init.connectionThreshold ?? DEFAULT_CONNECTION_THRESHOLD
    this.maxMessageSize = init.maxMessageSize ?? MAX_MESSAGE_SIZE
    this.dialResults = trackedMap({
      name: 'libp2p_autonat_v2_dial_results',
      metrics: components.metrics
    })
    this.findPeers = repeatingTask(this.findRandomPeers.bind(this), 60_000)
    this.addressFilter = createScalableCuckooFilter(1024)
    this.queue = new PeerQueue({
      concurrency: 3,
      maxSize: 50
    })
    this.maxDialDataBytes = init.maxDialDataBytes ?? MAX_DIAL_DATA_BYTES
    this.dialDataChunkSize = init.dialDataChunkSize ?? DIAL_DATA_CHUNK_SIZE

    this.nonces = new Set()
  }

  readonly [Symbol.toStringTag] = '@libp2p/autonat-v2'

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

    this.topologyId = await this.components.registrar.register(this.dialRequestProtocol, {
      onConnect: (peerId, connection) => {
        this.verifyExternalAddresses(connection)
          .catch(err => {
            this.log.error('could not verify addresses - %e', err)
          })
      }
    })

    await this.components.registrar.handle(this.dialBackProtocol, (stream, connection) => {
      void this.handleDialBackStream(stream, connection)
        .catch(err => {
          this.log.error('error handling incoming autonat stream - %e', err)
        })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams
    })

    this.findPeers.start()
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.dialRequestProtocol)
    await this.components.registrar.unhandle(this.dialBackProtocol)

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
  async handleDialBackStream (stream: Stream, connection: Connection): Promise<void> {
    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)

    const messages = pbStream(stream, {
      maxDataLength: this.maxMessageSize
    })

    try {
      const message = await messages.read(DialBack, {
        signal
      })

      // TODO: need to verify that the incoming address is the one we asked the
      // peer to dial us on
      if (!this.nonces.has(message.nonce)) {
        throw new ProtocolError('No matching dial found for nonce value')
      }

      this.nonces.delete(message.nonce)

      await messages.write({
        status: DialBackResponse.DialBackStatus.OK
      }, DialBackResponse)

      await stream.close({
        signal
      })
    } catch (err: any) {
      this.log.error('error handling incoming dial back stream - %e', err)
      stream.abort(err)
    }
  }

  private getUnverifiedMultiaddrs (segment: string, supportsIPv6: boolean): DialResults[] {
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

        const options = getNetConfig(addr.multiaddr)

        if (options.type === 'ip6') {
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

    const output: DialResults[] = []

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
          type: addr.type,
          lastVerified: addr.lastVerified
        }

        this.dialResults.set(addrString, results)
      }

      output.push(results)
    }

    return output
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
      return getNetConfig(multiaddr).type === 'ip6'
    })

    // get multiaddrs this peer is eligible to verify
    const segment = this.getNetworkSegment(connection.remoteAddr)
    const results = this.getUnverifiedMultiaddrs(segment, supportsIPv6)

    if (results.length === 0) {
      return
    }

    if (!this.hasConnectionCapacity()) {
      // we are near the max connection limit - any dial attempts from remote
      // peers may be rejected which will get flagged as false dial errors and
      // lead us to un-verify an otherwise reachable address

      if (results[0]?.lastVerified != null) {
        this.log('automatically re-verifying %a because we are too close to the connection limit', results[0].multiaddr)
        this.confirmAddress(results[0])
      } else {
        this.log('skipping verifying %a because we are too close to the connection limit', results[0]?.multiaddr)
      }

      return
    }

    this.queue.add(async (options: AbortOptions) => {
      const signal = anySignal([options.signal, AbortSignal.timeout(this.timeout)])
      const nonce = BigInt(randomNumber(0, Number.MAX_SAFE_INTEGER))
      this.nonces.add(nonce)

      try {
        await this.askPeerToVerify(connection, segment, nonce, options)
      } finally {
        signal.clear()
        this.nonces.delete(nonce)
      }
    }, {
      peerId: connection.remotePeer
    })
      .catch(err => {
        this.log.error('error from %p verifying addresses - %e', connection.remotePeer, err)
      })
  }

  private async askPeerToVerify (connection: Connection, segment: string, nonce: bigint, options: AbortOptions): Promise<void> {
    const unverifiedAddresses = [...this.dialResults.values()]
      .filter(entry => entry.result == null)
      .map(entry => entry.multiaddr)

    if (unverifiedAddresses.length === 0) {
      // no unverified addresses
      this.queue.clear()
      return
    }

    this.log.trace('asking %a to verify multiaddrs %s', connection.remoteAddr, unverifiedAddresses)

    const stream = await connection.newStream(this.dialRequestProtocol, options)

    try {
      const messages = pbStream(stream).pb(Message)
      await messages.write({
        dialRequest: {
          addrs: unverifiedAddresses.map(ma => ma.bytes),
          nonce
        }
      }, options)

      for (let i = 0; i < unverifiedAddresses.length; i++) {
        let response = await messages.read(options)

        if (response.dialDataRequest != null) {
          if (response.dialDataRequest.numBytes > this.maxDialDataBytes) {
            this.log('too many dial data byte requested by %p - %s/%s', connection.remotePeer, response.dialDataRequest.numBytes, this.maxDialDataBytes)
            continue
          }

          this.log('sending %d bytes to %p as anti-amplification attack protection', response.dialDataRequest.numBytes, connection.remotePeer)

          const buf = new Uint8Array(this.dialDataChunkSize)
          const bufSize = BigInt(this.dialDataChunkSize)

          for (let i = 0n; i < response.dialDataRequest.numBytes; i += bufSize) {
            await messages.write({
              dialDataResponse: {
                data: buf
              }
            }, options)
          }

          response = await messages.read(options)
        }

        if (response.dialResponse == null) {
          this.log('invalid autonat response from %p - %j', connection.remotePeer, response)
          return
        }

        const status = response.dialResponse.status

        if (status !== DialResponse.ResponseStatus.OK) {
          return
        }

        const dialed = unverifiedAddresses[response.dialResponse.addrIdx]

        if (dialed == null) {
          this.log.trace('peer dialed unknown address')
          continue
        }

        const results = this.dialResults.get(dialed.toString())

        if (results == null) {
          this.log.trace('peer reported %a as %s but there is no result object', dialed, response.dialResponse.status)
          continue
        }

        if (results.networkSegments.includes(segment)) {
          this.log.trace('%a results already included network segment %s', dialed, segment)
          continue
        }

        if (results.result != null) {
          this.log.trace('already resolved result for %a, ignoring response from', dialed, connection.remotePeer)
          continue
        }

        if (results.verifyingPeers.has(connection.remotePeer)) {
          this.log.trace('peer %p has already verified %a, ignoring response', connection.remotePeer, dialed)
          continue
        }

        results.verifyingPeers.add(connection.remotePeer)
        results.networkSegments.push(segment)

        if (response.dialResponse.dialStatus === DialStatus.OK) {
          this.log.trace('%p dialed %a successfully', connection.remotePeer, results.multiaddr)

          results.success++

          // observed addresses require more confirmations
          if (results.type !== 'observed') {
            this.confirmAddress(results)
            continue
          }
        } else if (response.dialResponse.dialStatus === DialStatus.E_DIAL_ERROR) {
          this.log.trace('%p could not dial %a', connection.remotePeer, results.multiaddr)
          // the address was not dialable (e.g. not public)
          results.failure++
        } else if (response.dialResponse.dialStatus === DialStatus.E_DIAL_BACK_ERROR) {
          this.log.trace('%p saw error while dialing %a', connection.remotePeer, results.multiaddr)
          // the address was dialable but an error occurred during the dial back
          continue
        }

        this.log('%a success %d failure %d', results.multiaddr, results.success, results.failure)

        if (results.success === REQUIRED_SUCCESSFUL_DIALS) {
          this.confirmAddress(results)
        }

        if (results.failure === REQUIRED_FAILED_DIALS) {
          this.unconfirmAddress(results)
        }
      }
    } finally {
      try {
        await stream.close(options)
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
  }

  private unconfirmAddress (results: DialResults): void {
    // we are now unconvinced
    this.log('%s address %a is not externally dialable', results.type, results.multiaddr)
    this.components.addressManager.removeObservedAddr(results.multiaddr)
    this.dialResults.delete(results.multiaddr.toString())

    // abort & remove any outstanding verification jobs for this multiaddr
    results.result = false
  }

  private getNetworkSegment (ma: Multiaddr): string {
    // make sure we use different network segments
    const options = getNetConfig(ma)

    switch (options.type) {
      case 'ip4': {
        const octets = options.host.split('.')
        return octets[0].padStart(3, '0')
      }
      case 'ip6': {
        const octets = options.host.split(':')
        return octets[0].padStart(4, '0')
      }
      default: {
        throw new InvalidParametersError(`Remote address ${ma} was not an IPv4 or Ipv6 address`)
      }
    }
  }
}
