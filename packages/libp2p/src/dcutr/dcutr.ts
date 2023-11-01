import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { type Multiaddr, multiaddr } from '@multiformats/multiaddr'
import delay from 'delay'
import { pbStream } from 'it-protobuf-stream'
import { codes } from '../errors.js'
import { HolePunch } from './pb/message.js'
import { isPublicAndDialable } from './utils.js'
import { multicodec } from './index.js'
import type { DCUtRServiceComponents, DCUtRServiceInit } from './index.js'
import type { Connection, Stream } from '@libp2p/interface/connection'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Startable } from '@libp2p/interface/startable'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { TransportManager } from '@libp2p/interface-internal/src/transport-manager/index.js'

const log = logger('libp2p:dcutr')

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

    // register for notifications of when peers that support DCUtR connect
    // nb. requires the identify service to be enabled
    this.topologyId = await this.registrar.register(multicodec, {
      notifyOnTransient: true,
      onConnect: (peerId, connection) => {
        if (!connection.transient) {
          // the connection is already direct, no upgrade is required
          return
        }

        // the inbound peer starts the connection upgrade
        if (connection.direction !== 'inbound') {
          return
        }

        this.upgradeInbound(connection)
          .catch(err => {
            log.error('error during outgoing DCUtR attempt', err)
          })
      }
    })

    await this.registrar.handle(multicodec, (data) => {
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
   * Perform the inbound connection upgrade as B
   *
   * @see https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol
   */
  async upgradeInbound (relayedConnection: Connection): Promise<void> {
    // Upon observing the new connection, the inbound peer (here B) checks the
    // addresses advertised by A via identify.
    //
    // If that set includes public addresses, then A may be reachable by a direct
    // connection, in which case B attempts a unilateral connection upgrade by
    // initiating a direct connection to A.
    if (await this.attemptUnilateralConnectionUpgrade(relayedConnection)) {
      return
    }

    let stream: Stream | undefined

    for (let i = 0; i < this.retries; i++) {
      const options = {
        signal: AbortSignal.timeout(this.timeout)
      }

      try {
        // 1. B opens a stream to A using the /libp2p/dcutr protocol.
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
        log('B sending connect to %p', relayedConnection.remotePeer)
        const connectTimer = Date.now()
        await pb.write({
          type: HolePunch.Type.CONNECT,
          observedAddresses: this.addressManager.getAddresses().map(ma => ma.bytes)
        }, options)

        log('B receiving connect from %p', relayedConnection.remotePeer)
        // 4. Upon receiving the Connect, B sends a Sync message
        const connect = await pb.read(options)

        if (connect.type !== HolePunch.Type.CONNECT) {
          log('A sent wrong message type')
          throw new CodeError('DCUtR message type was incorrect', codes.ERR_INVALID_MESSAGE)
        }

        const multiaddrs = this.getDialableMultiaddrs(connect.observedAddresses)

        if (multiaddrs.length === 0) {
          log('A did not have any dialable multiaddrs')
          throw new CodeError('DCUtR connect message had no multiaddrs', codes.ERR_INVALID_MESSAGE)
        }

        const rtt = Date.now() - connectTimer

        log('A sending sync, rtt %dms', rtt)
        await pb.write({
          type: HolePunch.Type.SYNC,
          observedAddresses: []
        }, options)

        log('A waiting for half RTT')
        // ..and starts a timer for half the RTT measured from the time between
        // sending the initial Connect and receiving the response
        await delay(rtt / 2)

        // TODO: when we have a QUIC transport, the dial step is different - for
        // now we only have tcp support
        // https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol

        log('B dialing', multiaddrs)
        // Upon expiry of the timer, B dials the address to A.
        const conn = await this.connectionManager.openConnection(multiaddrs, {
          signal: options.signal,
          priority: DCUTR_DIAL_PRIORITY
        })

        log('DCUtR to %p succeeded to address %a, closing relayed connection', relayedConnection.remotePeer, conn.remoteAddr)
        await relayedConnection.close(options)

        break
      } catch (err: any) {
        log.error('error while attempting DCUtR on attempt %d of %d', i + 1, this.retries, err)
        stream?.abort(err)

        if (i === this.retries) {
          throw err
        }
      } finally {
        if (stream != null) {
          await stream.close(options)
        }
      }
    }
  }

  /**
   * This is performed when A has dialed B via a relay but A also has a public
   * address that B can dial directly
   */
  async attemptUnilateralConnectionUpgrade (relayedConnection: Connection): Promise<boolean> {
    // Upon observing the new connection, the inbound peer (here B) checks the
    // addresses advertised by A via identify.
    const peerInfo = await this.peerStore.get(relayedConnection.remotePeer)

    // If that set includes public addresses, then A may be reachable by a direct
    // connection, in which case B attempts a unilateral connection upgrade by
    // initiating a direct connection to A.
    const publicAddresses = peerInfo.addresses
      .map(address => {
        const ma = address.multiaddr

        // ensure all multiaddrs have the peer id
        if (ma.getPeerId() == null) {
          return ma.encapsulate(`/p2p/${relayedConnection.remotePeer}`)
        }

        return ma
      })
      .filter(ma => {
        return isPublicAndDialable(ma, this.transportManager)
      })

    if (publicAddresses.length > 0) {
      const signal = AbortSignal.timeout(this.timeout)

      try {
        log('attempting unilateral connection upgrade to %a', publicAddresses)

        // force-dial the multiaddr(s), otherwise `connectionManager.openConnection`
        // will return the existing relayed connection
        const connection = await this.connectionManager.openConnection(publicAddresses, {
          signal,
          force: true
        })

        if (connection.transient) {
          throw new Error('Could not open a new, non-transient, connection')
        }

        log('unilateral connection upgrade to %p succeeded via %a, closing relayed connection', relayedConnection.remotePeer, connection.remoteAddr)

        await relayedConnection.close({
          signal
        })

        return true
      } catch (err) {
        log.error('unilateral connection upgrade to %p on addresses %a failed', relayedConnection.remotePeer, publicAddresses, err)
      }
    } else {
      log('peer %p has no public addresses, not attempting unilateral connection upgrade', relayedConnection.remotePeer)
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
    const options = {
      signal: AbortSignal.timeout(this.timeout)
    }

    try {
      const pb = pbStream(stream, {
        maxDataLength: MAX_DCUTR_MESSAGE_SIZE
      }).pb(HolePunch)

      log('A receiving connect')
      // 3. Upon receiving the Connect, A responds back with a Connect message
      // containing its observed (and possibly predicted) addresses.
      const connect = await pb.read(options)

      if (connect.type !== HolePunch.Type.CONNECT) {
        log('B sent wrong message type')
        throw new CodeError('DCUtR message type was incorrect', codes.ERR_INVALID_MESSAGE)
      }

      if (connect.observedAddresses.length === 0) {
        log('B sent no multiaddrs')
        throw new CodeError('DCUtR connect message had no multiaddrs', codes.ERR_INVALID_MESSAGE)
      }

      const multiaddrs = this.getDialableMultiaddrs(connect.observedAddresses)

      if (multiaddrs.length === 0) {
        log('B had no dialable multiaddrs')
        throw new CodeError('DCUtR connect message had no dialable multiaddrs', codes.ERR_INVALID_MESSAGE)
      }

      log('A sending connect')
      await pb.write({
        type: HolePunch.Type.CONNECT,
        observedAddresses: this.addressManager.getAddresses().map(ma => ma.bytes)
      })

      log('A receiving sync')
      const sync = await pb.read(options)

      if (sync.type !== HolePunch.Type.SYNC) {
        throw new CodeError('DCUtR message type was incorrect', codes.ERR_INVALID_MESSAGE)
      }

      // TODO: when we have a QUIC transport, the dial step is different - for
      // now we only have tcp support
      // https://github.com/libp2p/specs/blob/master/relay/DCUtR.md#the-protocol

      // Upon receiving the Sync, A immediately dials the address to B
      log('A dialing', multiaddrs)
      const connection = await this.connectionManager.openConnection(multiaddrs, {
        signal: options.signal,
        priority: DCUTR_DIAL_PRIORITY,
        force: true
      })

      log('DCUtR to %p succeeded via %a, closing relayed connection', relayedConnection.remotePeer, connection.remoteAddr)
      await relayedConnection.close(options)
    } catch (err: any) {
      log.error('incoming DCUtR from %p failed', relayedConnection.remotePeer, err)
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

        if (!isPublicAndDialable(ma, this.transportManager)) {
          continue
        }

        output.push(ma)
      } catch {}
    }

    return output
  }
}
