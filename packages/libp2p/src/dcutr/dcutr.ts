import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { type Multiaddr, multiaddr } from '@multiformats/multiaddr'
import { Circuit, IP, DNS, QUIC, QUICV1, TCP } from '@multiformats/multiaddr-matcher'
import delay from 'delay'
import { pbStream } from 'it-protobuf-stream'
import isPrivate from 'private-ip'
import { codes } from '../errors.js'
import { HolePunch } from './pb/message.js'
import {
  multicodec
} from './index.js'
import type { DCUtRServiceComponents, DCUtRServiceInit } from './index.js'
import type { Connection, Stream } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Startable } from '@libp2p/interface/startable'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { TransportManager } from '@libp2p/interface-internal/src/transport-manager/index.js'

const log = logger('libp2p:dcutr')
const logA = logger('libp2p:dcutr:A')
const logB = logger('libp2p:dcutr:B')

// https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#rpc-messages
const MAX_DCUTR_MESSAGE_SIZE = 1024 * 4
// ensure the dial has a high priority to jump to the head of the dial queue
const DCUTR_DIAL_PRIORITY = 100

const defaultValues = {
  // https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/holepunch/holepuncher.go#L27
  timeout: 5000,
  // https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/holepunch/holepuncher.go#L28
  retries: 3,
  maxInboundStreams: 1,
  maxOutboundStreams: 1
}

export class DefaultDCUtRService implements Startable {
  private started: boolean
  private readonly timeout: number
  private readonly retries: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly peerStore: PeerStore
  private readonly registrar: Registrar
  private readonly connectionManager: ConnectionManager
  private readonly addressManager: AddressManager
  private readonly transportManager: TransportManager
  private topologyId?: string

  constructor (components: DCUtRServiceComponents, init: DCUtRServiceInit) {
    this.started = false
    this.peerStore = components.peerStore
    this.registrar = components.registrar
    this.addressManager = components.addressManager
    this.connectionManager = components.connectionManager
    this.transportManager = components.transportManager

    this.timeout = init.timeout ?? defaultValues.timeout
    this.retries = init.retries ?? defaultValues.retries
    this.maxInboundStreams = init.maxInboundStreams ?? defaultValues.maxInboundStreams
    this.maxOutboundStreams = init.maxOutboundStreams ?? defaultValues.maxOutboundStreams
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }
    log.trace('starting DCUtR service', process.env.NODE_ENV)

    // register for notifications of when peers that support DCUtR connect
    // nb. requires the identify service to be enabled
    this.topologyId = await this.registrar.register(multicodec, {
      onConnect: this.onConnectAttempt.bind(this),
      onDisconnect: (peerId: PeerId) => {
        log.trace('peer %p disconnected %a', peerId, multicodec)
      }
    })

    await this.registrar.handle(multicodec, (data) => {
      logA.trace('incoming DCUtR attempt. connection.direction = ', data.connection.direction)
      void this.handleIncomingUpgrade(data.stream, data.connection).catch(err => {
        log.error('error during incoming DCUtR attempt', err)
        data.stream.abort(err)
      })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnTransientConnection: true
    })

    this.started = true
  }

  async stop (): Promise<void> {
    await this.registrar.unhandle(multicodec)

    if (this.topologyId != null) {
      this.registrar.unregister(this.topologyId)
    }

    this.started = false
  }

  /**
   * This is the callback function for the onConnect handler of {@link multicodec} connections.
   * We make sure that the connection is an inbound relayed connection and then initiate the upgrade.
   *
   * The protocol starts with the completion of a relay connection from A to B.
   */
  async onConnectAttempt (peerId: PeerId, connection: Connection): Promise<void> {
    log.trace('onConnectAttempt %s %p', connection.direction, peerId)
    if (!connection.transient) {
      // the connection is already direct, no upgrade is required
      log.trace('connection to %p is already direct, not attempting DCUtR', peerId)
      return
    }

    // the inbound peer starts the connection upgrade
    if (connection.direction !== 'inbound') {
      log('connection request to %p is from local, not attempting DCUtR', peerId)
      return
    }

    // if we already have a separate direct connection, use that instead
    const existingDirectConnection = this.connectionManager.getConnections(peerId)
      .find(conn => !conn.transient)

    if (existingDirectConnection != null) {
      log.trace('already have a direct connection to %p, not attempting DCUtR', peerId)
      return
    }

    // Upon observing the new connection, the inbound peer (here B) checks the
    // addresses advertised by A via identify.
    //
    // If that set includes public addresses, then A may be reachable by a direct
    // connection, in which case B attempts a unilateral connection upgrade by
    // initiating a direct connection to A.
    if (await this.attemptUnilateralConnectionUpgrade(connection)) {
      log.trace('unilateral connection upgrade succeeded')
      return
    }

    logB('attempting DCUtR upgrade of relayed connection from %p', peerId)
    await this.initiateDCUtRUpgrade(connection)
      .catch(err => {
        logB.error('error during outgoing DCUtR attempt', err)
      })
  }

  /**
   * Perform the inbound connection upgrade as B.
   *
   * This means:
   * * Code inside this function is performed as node B
   * * A has attempted to connect to us (see {@link onConnectAttempt})
   * * A's connection attempt is transient (i.e. it is a relayed connection)
   *
   * @see https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol
   */
  async initiateDCUtRUpgrade (relayedConnection: Connection): Promise<void> {
    log.trace('initiateDCUtRUpgrade connection ID =', relayedConnection.id)
    /**
     * If the unilateral connection upgrade attempt fails or if A is itself a NATed peer that doesn't advertise public
     * address, then B initiates the direct connection upgrade protocol as follows:
     */

    let stream: Stream | undefined

    for (let i = 0; i < this.retries; i++) {
      const options = {
        signal: AbortSignal.timeout(this.timeout)
      }

      try {
        // 1. B opens a stream to A using the /libp2p/dcutr protocol.
        logB.trace('opening a stream to A')
        stream = await relayedConnection.newStream([multicodec], {
          signal: options.signal,
          runOnTransientConnection: true
        })

        const pb = pbStream(stream, {
          maxDataLength: MAX_DCUTR_MESSAGE_SIZE
        }).pb(HolePunch)

        // 2. B sends to A a Connect message containing its observed (and
        // possibly predicted) addresses from identify and starts a timer
        // to measure RTT of the relay connection.
        logB.trace('sending CONNECT to A')
        const connectTimer = Date.now()
        await pb.write({
          type: HolePunch.Type.CONNECT,
          observedAddresses: this.addressManager.getAddresses().map(ma => ma.bytes)
        }, options)

        logB.trace('waiting for CONNECT from A')
        // 4. Upon receiving the Connect, B sends a Sync message
        const connect = await pb.read(options)
        logB.trace('received CONNECT from A')

        if (connect.type !== HolePunch.Type.CONNECT) {
          logB.error('A sent the wrong message type')
          throw new CodeError('DCUtR message type was incorrect', codes.ERR_INVALID_MESSAGE)
        }

        const multiaddrs = this.getDialableMultiaddrs(connect.observedAddresses)

        if (multiaddrs.length === 0) {
          logB.error('A did not have any dialable multiaddrs')
          throw new CodeError('DCUtR connect message had no multiaddrs', codes.ERR_INVALID_MESSAGE)
        }

        const rtt = Date.now() - connectTimer

        logB.trace('sending SYNC to A, rtt %dms', rtt)
        await pb.write({
          type: HolePunch.Type.SYNC,
          observedAddresses: []
        }, options)

        await this.handleSimultaneousConnect(relayedConnection, multiaddrs, rtt, options.signal)

        // Once a single connection has been established, A SHOULD cancel all outstanding connection attempts.
        await relayedConnection.close(options)
        logB.trace('closed relayed connection')
        // stop the for loop.
        break;
      } catch (err: any) {
        logB.error('error during DCUtR attempt', err)
        stream?.abort(err)
        throw err
      } finally {
        if (stream != null) {
          await stream.close(options)
        }
      }
    }
  }

  /**
   * This function encapsulates the Simultaneous Connect step (#5) of the [DCUtR protocol](https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol)
   * from the perspective of node B.
   */
  async handleSimultaneousConnect (relayedConnection: Connection, multiaddrs: Multiaddr[], rtt: number, signal: AbortSignal): Promise<void> {
    logB('waiting for half RTT')
    // ..and starts a timer for half the RTT measured from the time between
    // sending the initial Connect and receiving the response
    // TODO: Find a way to simulate network latency for tests, because rtt is always <= 4ms
    await delay(rtt / 2)

    const tcpMultiaddrs = multiaddrs.filter(TCP.matches)
    const quicMultiaddrs = multiaddrs.filter(ma => QUIC.matches(ma) || QUICV1.matches(ma))

    logB.trace('dialing', multiaddrs)
    const connectAttempts = []
    const simulConnectAbortController = new AbortController()
    signal.addEventListener('abort', () => {
      // abort connection attempts if the root signal times out or is aborted.
      simulConnectAbortController.abort()
    })
    if (tcpMultiaddrs.length > 0) {
      connectAttempts.push(this.simultaneousConnectTCP(tcpMultiaddrs, simulConnectAbortController.signal))
    }
    if (quicMultiaddrs.length > 0) {
      connectAttempts.push(this.simultaneousConnectQuic(quicMultiaddrs, simulConnectAbortController.signal))
    }
    await Promise.any(connectAttempts)
    simulConnectAbortController.abort() // abort any remaining connect attempts

    logB('DCUtR to %p succeeded, A SHOULD close relayed connection', relayedConnection.remotePeer)
  }

  /**
   * TCP Simultaneous Connect
   * Upon expiry of the timer (await delay in {@link handleSimultaneousConnect}), B dials the address to A.
   */
  async simultaneousConnectTCP (multiaddrs: Multiaddr[], signal: AbortSignal): Promise<void> {
    const newDirectConnection = await this.connectionManager.openConnection(multiaddrs, {
      signal,
      priority: DCUTR_DIAL_PRIORITY
    })
    logB('dialing succeeded. connection ID =', newDirectConnection.id)
  }

  /**
   * QUIC Simultaneous Connect
   * Upon expiry of the timer (await delay in {@link handleSimultaneousConnect}), B starts to send UDP packets filled
   * with random bytes to A's address. Packets should be sent repeatedly in random intervals between 10 and 200 ms.
   */
  async simultaneousConnectQuic (multiaddrs: Multiaddr[], signal: AbortSignal): Promise<void> {
    throw new Error('Simultaneous Connect over QUIC is not implemented yet. See https://github.com/libp2p/js-libp2p/issues/1459')
  }

  /**
   * This is performed when A has dialed B via a relay but A also has a public
   * address that B can dial directly
   *
   * Code inside this function is performed as node B
   */
  async attemptUnilateralConnectionUpgrade (relayedConnection: Connection): Promise<boolean> {
    // Upon observing the new connection, the inbound peer (here B) checks the
    // addresses advertised by A via identify.
    const peerInfo = await this.peerStore.get(relayedConnection.remotePeer)

    // If that set includes public addresses, then A may be reachable by a direct
    // connection, in which case B attempts a unilateral connection upgrade by
    // initiating a direct connection to A.
    const publicAddresses = peerInfo.addresses.filter((address) => {
      return this.isPublicAndDialable(address.multiaddr)
    })
      .map(address => address.multiaddr)

    if (publicAddresses.length > 0) {
      logB.trace('peer %p has public addresses, attempting unilateral connection upgrade', relayedConnection.remotePeer)
      const signal = AbortSignal.timeout(this.timeout)

      try {
        logB('attempting unilateral connection upgrade to', publicAddresses)

        // dial the multiaddr(s), otherwise `connectionManager.openConnection`
        // will return the existing relayed connection
        await this.connectionManager.openConnection(publicAddresses, {
          signal
        })

        logB.trace('unilateral connection upgrade to %p succeeded, closing relayed connection', relayedConnection.remotePeer)
        try {
          await relayedConnection.close()
        } catch (err) {
          logB.error('error while closing relayed connection', err)
        }

        return true
      } catch (err) {
        logB.error('Could not unilaterally upgrade connection to advertised public address(es)', publicAddresses, err)
      }
    } else {
      logB.trace('peer %p has no public addresses, not attempting unilateral connection upgrade', relayedConnection.remotePeer)
    }

    // no public addresses or failed to dial public addresses
    return false
  }

  /**
   * Perform the connection upgrade as A
   *
   * @see https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol
   */
  async handleIncomingUpgrade (stream: Stream, relayedConnection: Connection): Promise<void> {
    logA.trace('handleIncomingUpgrade connection ID =', relayedConnection.id)
    const options = {
      signal: AbortSignal.timeout(this.timeout)
    }

    try {
      logA.trace('acknowledging stream from B')
      const pb = pbStream(stream, {
        maxDataLength: MAX_DCUTR_MESSAGE_SIZE
      }).pb(HolePunch)

      logA.trace('waiting for CONNECT from B')
      // 3. Upon receiving the Connect, A responds back with a Connect message
      // containing its observed (and possibly predicted) addresses.
      const connect = await pb.read(options)
      logA.trace('received CONNECT from B')

      if (connect.type !== HolePunch.Type.CONNECT) {
        logA.error('B sent wrong message type')
        throw new CodeError('DCUtR message type was incorrect', codes.ERR_INVALID_MESSAGE)
      }

      if (connect.observedAddresses.length === 0) {
        logA.error('B sent no multiaddrs')
        throw new CodeError('DCUtR connect message had no multiaddrs', codes.ERR_INVALID_MESSAGE)
      }

      const multiaddrs = this.getDialableMultiaddrs(connect.observedAddresses)

      if (multiaddrs.length === 0) {
        logA.error('B had no dialable multiaddrs')
        throw new CodeError('DCUtR connect message had no dialable multiaddrs', codes.ERR_INVALID_MESSAGE)
      }

      logA.trace('sending CONNECT to B')
      await pb.write({
        type: HolePunch.Type.CONNECT,
        observedAddresses: this.addressManager.getAddresses().map(ma => ma.bytes)
      })

      logA.trace('waiting for message SYNC from B')
      const sync = await pb.read(options)

      if (sync.type !== HolePunch.Type.SYNC) {
        logA.error('B sent the wrong message type')
        throw new CodeError('DCUtR message type was incorrect', codes.ERR_INVALID_MESSAGE)
      }
      logA.trace('received SYNC from B')

      // TODO: when we have a QUIC transport, the dial step is different - for
      // now we only have tcp support
      // https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol

      // Upon receiving the Sync, A immediately dials the address to B
      logA.trace('dialing', multiaddrs)
      const newDirectConnection = await this.connectionManager.openConnection(multiaddrs, {
        signal: options.signal,
        priority: DCUTR_DIAL_PRIORITY
      })
      logA.trace('dialing succeeded. connection ID =', newDirectConnection.id)

      logA('incoming DCUtR from %p succeeded, closing relayed connection', relayedConnection.remotePeer)
      await relayedConnection.close(options)
      logA.trace('closed relayed connection')
    } catch (err: any) {
      logA.error('error during DCUtR attempt', err)
      stream.abort(err)
    } finally {
      await stream.close(options)
    }
  }

  /**
   * Takes the `addr` and converts it to a Multiaddr if possible
   */
  getDialableMultiaddrs (addrs: Array<Uint8Array | string | null | undefined>): Multiaddr[] {
    const output = []

    for (const addr of addrs) {
      if (addr == null || addr.length === 0) {
        continue
      }

      try {
        const ma = multiaddr(addr)

        // TODO: find a way to test around this without hardcoding process.env.NODE_ENV checks.
        if (process.env.NODE_ENV !== 'test' && !this.isPublicAndDialable(ma) ) {
          continue
        }

        output.push(ma)
      } catch {}
    }

    return output
  }

  /**
   * Returns true if the passed multiaddr is public, not relayed and we have a
   * transport that can dial it
   */
  isPublicAndDialable (ma: Multiaddr): boolean {
    // ignore circuit relay
    if (Circuit.matches(ma)) {
      log.trace('ignoring circuit relay address', ma)
      return false
    }

    // dns addresses are probably public?
    if (DNS.matches(ma)) {
      log.trace('ignoring dns address', ma)
      return true
    }

    // ensure we have only IPv4/IPv6 addresses
    if (!IP.matches(ma)) {
      log.trace('ignoring non-ip address', ma)
      return false
    }

    const transport = this.transportManager.transportForMultiaddr(ma)

    if (transport == null) {
      log.trace('ignoring address with no transport', ma)
      return false
    }

    const options = ma.toOptions()
    // TODO: find a way to test around this without hardcoding process.env.NODE_ENV checks.
    if (process.env.NODE_ENV !== 'test') {
      return true
    }

    if (isPrivate(options.host) === true) {
      log.trace('ignoring private address', ma)
      return false
    }

    return true
  }
}
