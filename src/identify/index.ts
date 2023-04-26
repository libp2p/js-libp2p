import { logger } from '@libp2p/logger'
import { CodeError } from '@libp2p/interfaces/errors'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import first from 'it-first'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Multiaddr, multiaddr, protocols } from '@multiformats/multiaddr'
import { Identify } from './pb/message.js'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH,
  IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION
} from './consts.js'
import { codes } from '../errors.js'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { Startable } from '@libp2p/interfaces/startable'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { TimeoutController } from 'timeout-abort-controller'
import type { AbortOptions } from '@libp2p/interfaces'
import { abortableDuplex } from 'abortable-iterator'
import { setMaxListeners } from 'events'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Peer, PeerStore } from '@libp2p/interface-peer-store'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { pbStream } from 'it-pb-stream'

const log = logger('libp2p:identify')

// https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/identify/id.go#L52
const MAX_IDENTIFY_MESSAGE_SIZE = 1024 * 8

export interface HostProperties {
  agentVersion: string
}

export interface IdentifyServiceInit {
  /**
   * The prefix to use for the protocol (default: 'ipfs')
   */
  protocolPrefix: string

  /**
   * What details we should send as part of an identify message
   */
  host: HostProperties

  /**
   * How long we should wait for a remote peer to send their identify response
   */
  timeout: number

  /**
   * Identify responses larger than this in bytes will be rejected (default: 8192)
   */
  maxIdentifyMessageSize?: number

  maxInboundStreams: number
  maxOutboundStreams: number

  maxPushIncomingStreams: number
  maxPushOutgoingStreams: number
  maxObservedAddresses?: number
}

export interface IdentifyServiceComponents {
  peerId: PeerId
  peerStore: PeerStore
  connectionManager: ConnectionManager
  registrar: Registrar
  addressManager: AddressManager
  events: EventEmitter<Libp2pEvents>
}

export class IdentifyService implements Startable {
  private readonly components: IdentifyServiceComponents
  private readonly identifyProtocolStr: string
  private readonly identifyPushProtocolStr: string
  public readonly host: {
    protocolVersion: string
    agentVersion: string
  }

  private readonly init: IdentifyServiceInit
  private started: boolean

  constructor (components: IdentifyServiceComponents, init: IdentifyServiceInit) {
    this.components = components
    this.started = false
    this.init = init

    this.identifyProtocolStr = `/${init.protocolPrefix}/${MULTICODEC_IDENTIFY_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PROTOCOL_VERSION}`
    this.identifyPushProtocolStr = `/${init.protocolPrefix}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION}`

    // Store self host metadata
    this.host = {
      protocolVersion: `${init.protocolPrefix}/${IDENTIFY_PROTOCOL_VERSION}`,
      ...init.host
    }

    // When a new connection happens, trigger identify
    this.components.events.addEventListener('connection:open', (evt) => {
      const connection = evt.detail
      this.identify(connection).catch(err => { log.error('error during identify trigged by connection:open', err) })
    })

    // When self peer record changes, trigger identify-push
    this.components.events.addEventListener('self:peer:update', (evt) => {
      void this.pushToPeerStore().catch(err => { log.error(err) })
    })
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await this.components.peerStore.merge(this.components.peerId, {
      metadata: {
        AgentVersion: uint8ArrayFromString(this.host.agentVersion),
        ProtocolVersion: uint8ArrayFromString(this.host.protocolVersion)
      }
    })

    await this.components.registrar.handle(this.identifyProtocolStr, (data) => {
      void this._handleIdentify(data).catch(err => {
        log.error(err)
      })
    }, {
      maxInboundStreams: this.init.maxInboundStreams,
      maxOutboundStreams: this.init.maxOutboundStreams
    })
    await this.components.registrar.handle(this.identifyPushProtocolStr, (data) => {
      void this._handlePush(data).catch(err => {
        log.error(err)
      })
    }, {
      maxInboundStreams: this.init.maxPushIncomingStreams,
      maxOutboundStreams: this.init.maxPushOutgoingStreams
    })

    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.identifyProtocolStr)
    await this.components.registrar.unhandle(this.identifyPushProtocolStr)

    this.started = false
  }

  /**
   * Send an Identify Push update to the list of connections
   */
  async push (connections: Connection[]): Promise<void> {
    const listenAddresses = this.components.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
    const peerRecord = new PeerRecord({
      peerId: this.components.peerId,
      multiaddrs: listenAddresses
    })
    const signedPeerRecord = await RecordEnvelope.seal(peerRecord, this.components.peerId)
    const supportedProtocols = this.components.registrar.getProtocols()
    const peer = await this.components.peerStore.get(this.components.peerId)
    const agentVersion = uint8ArrayToString(peer.metadata.get('AgentVersion') ?? uint8ArrayFromString(this.host.agentVersion))
    const protocolVersion = uint8ArrayToString(peer.metadata.get('ProtocolVersion') ?? uint8ArrayFromString(this.host.protocolVersion))

    const pushes = connections.map(async connection => {
      let stream: Stream | undefined
      const timeoutController = new TimeoutController(this.init.timeout)

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, timeoutController.signal)
      } catch {}

      try {
        stream = await connection.newStream([this.identifyPushProtocolStr], {
          signal: timeoutController.signal
        })

        // make stream abortable
        const source = abortableDuplex(stream, timeoutController.signal)

        await source.sink(pipe(
          [Identify.encode({
            listenAddrs: listenAddresses.map(ma => ma.bytes),
            signedPeerRecord: signedPeerRecord.marshal(),
            protocols: supportedProtocols,
            agentVersion,
            protocolVersion
          })],
          (source) => lp.encode(source)
        ))
      } catch (err: any) {
        // Just log errors
        log.error('could not push identify update to peer', err)
      } finally {
        if (stream != null) {
          stream.close()
        }

        timeoutController.clear()
      }
    })

    await Promise.all(pushes)
  }

  /**
   * Calls `push` on all peer connections
   */
  async pushToPeerStore (): Promise<void> {
    // Do not try to push if we are not running
    if (!this.isStarted()) {
      return
    }

    const connections: Connection[] = []

    for (const conn of this.components.connectionManager.getConnections()) {
      const peerId = conn.remotePeer
      const peer = await this.components.peerStore.get(peerId)

      if (!peer.protocols.includes(this.identifyPushProtocolStr)) {
        continue
      }

      connections.push(conn)
    }

    await this.push(connections)
  }

  async _identify (connection: Connection, options: AbortOptions = {}): Promise<Identify> {
    let timeoutController
    let signal = options.signal
    let stream: Stream | undefined

    // create a timeout if no abort signal passed
    if (signal == null) {
      timeoutController = new TimeoutController(this.init.timeout)
      signal = timeoutController.signal

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, timeoutController.signal)
      } catch {}
    }

    try {
      stream = await connection.newStream([this.identifyProtocolStr], {
        signal
      })

      // make stream abortable
      const source = abortableDuplex(stream, signal)

      const data = await pipe(
        [],
        source,
        (source) => lp.decode(source, {
          maxDataLength: this.init.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
        }),
        async (source) => await first(source)
      )

      if (data == null) {
        throw new CodeError('No data could be retrieved', codes.ERR_CONNECTION_ENDED)
      }

      try {
        return Identify.decode(data)
      } catch (err: any) {
        throw new CodeError(String(err), codes.ERR_INVALID_MESSAGE)
      }
    } finally {
      if (timeoutController != null) {
        timeoutController.clear()
      }

      if (stream != null) {
        stream.close()
      }
    }
  }

  /**
   * Requests the `Identify` message from peer associated with the given `connection`.
   * If the identified peer does not match the `PeerId` associated with the connection,
   * an error will be thrown.
   */
  async identify (connection: Connection, options: AbortOptions = {}): Promise<void> {
    const message = await this._identify(connection, options)
    const {
      publicKey,
      protocols,
      observedAddr
    } = message

    if (publicKey == null) {
      throw new CodeError('public key was missing from identify message', codes.ERR_MISSING_PUBLIC_KEY)
    }

    const id = await peerIdFromKeys(publicKey)

    if (!connection.remotePeer.equals(id)) {
      throw new CodeError('identified peer does not match the expected peer', codes.ERR_INVALID_PEER)
    }

    if (this.components.peerId.equals(id)) {
      throw new CodeError('identified peer is our own peer id?', codes.ERR_INVALID_PEER)
    }

    // Get the observedAddr if there is one
    const cleanObservedAddr = IdentifyService.getCleanMultiaddr(observedAddr)

    log('identify completed for peer %p and protocols %o', id, protocols)
    log('our observed address is %s', cleanObservedAddr)

    if (cleanObservedAddr != null &&
        this.components.addressManager.getObservedAddrs().length < (this.init.maxObservedAddresses ?? Infinity)) {
      log('storing our observed address %s', cleanObservedAddr?.toString())
      this.components.addressManager.addObservedAddr(cleanObservedAddr)
    }

    await this.#consumeIdentifyMessage(connection.remotePeer, message)
  }

  /**
   * Sends the `Identify` response with the Signed Peer Record
   * to the requesting peer over the given `connection`
   */
  async _handleIdentify (data: IncomingStreamData): Promise<void> {
    const { connection, stream } = data
    const timeoutController = new TimeoutController(this.init.timeout)

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, timeoutController.signal)
    } catch {}

    try {
      const publicKey = this.components.peerId.publicKey ?? new Uint8Array(0)
      const peerData = await this.components.peerStore.get(this.components.peerId)
      const multiaddrs = this.components.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
      let signedPeerRecord = peerData.peerRecordEnvelope

      if (multiaddrs.length > 0 && signedPeerRecord == null) {
        const peerRecord = new PeerRecord({
          peerId: this.components.peerId,
          multiaddrs
        })

        const envelope = await RecordEnvelope.seal(peerRecord, this.components.peerId)
        signedPeerRecord = envelope.marshal().subarray()
      }

      const message = Identify.encode({
        protocolVersion: this.host.protocolVersion,
        agentVersion: this.host.agentVersion,
        publicKey,
        listenAddrs: multiaddrs.map(addr => addr.bytes),
        signedPeerRecord,
        observedAddr: connection.remoteAddr.bytes,
        protocols: peerData.protocols
      })

      // make stream abortable
      const source = abortableDuplex(stream, timeoutController.signal)

      const msgWithLenPrefix = pipe([message], (source) => lp.encode(source))
      await source.sink(msgWithLenPrefix)
    } catch (err: any) {
      log.error('could not respond to identify request', err)
    } finally {
      stream.close()
      timeoutController.clear()
    }
  }

  /**
   * Reads the Identify Push message from the given `connection`
   */
  async _handlePush (data: IncomingStreamData): Promise<void> {
    const { connection, stream } = data

    try {
      if (this.components.peerId.equals(connection.remotePeer)) {
        throw new Error('received push from ourselves?')
      }

      // make stream abortable
      const source = abortableDuplex(stream, AbortSignal.timeout(this.init.timeout))
      const pb = pbStream(source, {
        maxDataLength: this.init.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
      })
      const message = await pb.readPB(Identify)

      await this.#consumeIdentifyMessage(connection.remotePeer, message)
    } catch (err: any) {
      log.error('received invalid message', err)
      return
    } finally {
      stream.close()
    }

    log('handled push from %p', connection.remotePeer)
  }

  async #consumeIdentifyMessage (remotePeer: PeerId, message: Identify): Promise<void> {
    if (message == null) {
      throw new Error('Message was null or undefined')
    }

    log('received identify from %p', remotePeer)

    if (message.signedPeerRecord == null) {
      return
    }

    const envelope = await RecordEnvelope.openAndCertify(message.signedPeerRecord, PeerRecord.DOMAIN)
    const peerRecord = PeerRecord.createFromProtobuf(envelope.payload)

    // Verify peerId
    if (!peerRecord.peerId.equals(envelope.peerId)) {
      throw new Error('signing key does not match PeerId in the PeerRecord')
    }

    // Make sure remote peer is the one sending the record
    if (!remotePeer.equals(peerRecord.peerId)) {
      throw new Error('signing key does not match remote PeerId')
    }

    let peer: Peer | undefined

    try {
      peer = await this.components.peerStore.get(peerRecord.peerId)
    } catch (err: any) {
      if (err.code !== 'ERR_NOT_FOUND') {
        throw err
      }
    }

    log('received signedPeerRecord in push from %p', remotePeer)
    let metadata = new Map()

    if (peer?.peerRecordEnvelope != null) {
      const storedEnvelope = await RecordEnvelope.createFromProtobuf(peer.peerRecordEnvelope)
      const storedRecord = PeerRecord.createFromProtobuf(storedEnvelope.payload)

      // ensure seq is greater than, or equal to, the last received
      if (storedRecord.seqNumber >= peerRecord.seqNumber) {
        log('sequence number was lower or equal to existing sequence number - stored: %d received: %d', storedRecord.seqNumber, peerRecord.seqNumber)
      }

      metadata = peer.metadata
    }

    if (message.agentVersion != null) {
      metadata.set('AgentVersion', uint8ArrayFromString(message.agentVersion))
    }

    if (message.protocolVersion != null) {
      metadata.set('ProtocolVersion', uint8ArrayFromString(message.protocolVersion))
    }

    await this.components.peerStore.patch(peerRecord.peerId, {
      peerRecordEnvelope: message.signedPeerRecord,
      protocols: message.protocols,
      addresses: peerRecord.multiaddrs.map(multiaddr => ({
        isCertified: true,
        multiaddr
      })),
      metadata
    })

    log('consumed signedPeerRecord sent in push from %p', remotePeer)
  }

  /**
   * Takes the `addr` and converts it to a Multiaddr if possible
   */
  static getCleanMultiaddr (addr: Uint8Array | string | null | undefined): Multiaddr | undefined {
    if (addr != null && addr.length > 0) {
      try {
        return multiaddr(addr)
      } catch {

      }
    }
  }
}

/**
 * The protocols the IdentifyService supports
 */
export const multicodecs = {
  IDENTIFY: MULTICODEC_IDENTIFY,
  IDENTIFY_PUSH: MULTICODEC_IDENTIFY_PUSH
}

export const Message = { Identify }
