import { setMaxListeners } from 'events'
import { CodeError, codes } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import { type Multiaddr, multiaddr, protocols } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { isNode, isBrowser, isWebWorker, isElectronMain, isElectronRenderer, isReactNative } from 'wherearewe'
import {
  AGENT_VERSION,
  IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME,
  MULTICODEC_IDENTIFY_PROTOCOL_VERSION,
  MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION
} from './consts.js'
import { Identify } from './pb/message.js'
import type { IdentifyService, IdentifyServiceComponents, IdentifyServiceInit } from './index.js'
import type { Libp2pEvents, IdentifyResult, SignedPeerRecord, AbortOptions } from '@libp2p/interface'
import type { Connection, Stream } from '@libp2p/interface/connection'
import type { EventEmitter } from '@libp2p/interface/events'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Peer, PeerStore } from '@libp2p/interface/peer-store'
import type { Startable } from '@libp2p/interface/startable'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'

const log = logger('libp2p:identify')

// https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/identify/id.go#L52
const MAX_IDENTIFY_MESSAGE_SIZE = 1024 * 8

const defaultValues = {
  protocolPrefix: 'ipfs',
  agentVersion: AGENT_VERSION,
  // https://github.com/libp2p/go-libp2p/blob/8d2e54e1637041d5cf4fac1e531287560bd1f4ac/p2p/protocol/identify/id.go#L48
  timeout: 60000,
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  maxPushIncomingStreams: 1,
  maxPushOutgoingStreams: 1,
  maxObservedAddresses: 10,
  maxIdentifyMessageSize: 8192,
  runOnConnectionOpen: true,
  runOnTransientConnection: true
}

export class DefaultIdentifyService implements Startable, IdentifyService {
  private readonly identifyProtocolStr: string
  private readonly identifyPushProtocolStr: string
  public readonly host: {
    protocolVersion: string
    agentVersion: string
  }

  private started: boolean
  private readonly timeout: number
  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly registrar: Registrar
  private readonly connectionManager: ConnectionManager
  private readonly addressManager: AddressManager
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly maxPushIncomingStreams: number
  private readonly maxPushOutgoingStreams: number
  private readonly maxIdentifyMessageSize: number
  private readonly maxObservedAddresses: number
  private readonly events: EventEmitter<Libp2pEvents>
  private readonly runOnTransientConnection: boolean

  constructor (components: IdentifyServiceComponents, init: IdentifyServiceInit) {
    this.started = false
    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.registrar = components.registrar
    this.addressManager = components.addressManager
    this.connectionManager = components.connectionManager
    this.events = components.events

    this.identifyProtocolStr = `/${init.protocolPrefix ?? defaultValues.protocolPrefix}/${MULTICODEC_IDENTIFY_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PROTOCOL_VERSION}`
    this.identifyPushProtocolStr = `/${init.protocolPrefix ?? defaultValues.protocolPrefix}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_NAME}/${MULTICODEC_IDENTIFY_PUSH_PROTOCOL_VERSION}`
    this.timeout = init.timeout ?? defaultValues.timeout
    this.maxInboundStreams = init.maxInboundStreams ?? defaultValues.maxInboundStreams
    this.maxOutboundStreams = init.maxOutboundStreams ?? defaultValues.maxOutboundStreams
    this.maxPushIncomingStreams = init.maxPushIncomingStreams ?? defaultValues.maxPushIncomingStreams
    this.maxPushOutgoingStreams = init.maxPushOutgoingStreams ?? defaultValues.maxPushOutgoingStreams
    this.maxIdentifyMessageSize = init.maxIdentifyMessageSize ?? defaultValues.maxIdentifyMessageSize
    this.maxObservedAddresses = init.maxObservedAddresses ?? defaultValues.maxObservedAddresses
    this.runOnTransientConnection = init.runOnTransientConnection ?? defaultValues.runOnTransientConnection

    // Store self host metadata
    this.host = {
      protocolVersion: `${init.protocolPrefix ?? defaultValues.protocolPrefix}/${IDENTIFY_PROTOCOL_VERSION}`,
      agentVersion: init.agentVersion ?? defaultValues.agentVersion
    }

    if (init.runOnConnectionOpen ?? defaultValues.runOnConnectionOpen) {
      // When a new connection happens, trigger identify
      components.events.addEventListener('connection:open', (evt) => {
        const connection = evt.detail
        this.identify(connection).catch(err => { log.error('error during identify trigged by connection:open', err) })
      })
    }

    // When self peer record changes, trigger identify-push
    components.events.addEventListener('self:peer:update', (evt) => {
      void this.push().catch(err => { log.error(err) })
    })

    // Append user agent version to default AGENT_VERSION depending on the environment
    if (this.host.agentVersion === AGENT_VERSION) {
      if (isNode || isElectronMain) {
        this.host.agentVersion += ` UserAgent=${globalThis.process.version}`
      } else if (isBrowser || isWebWorker || isElectronRenderer || isReactNative) {
        this.host.agentVersion += ` UserAgent=${globalThis.navigator.userAgent}`
      }
    }
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await this.peerStore.merge(this.peerId, {
      metadata: {
        AgentVersion: uint8ArrayFromString(this.host.agentVersion),
        ProtocolVersion: uint8ArrayFromString(this.host.protocolVersion)
      }
    })

    await this.registrar.handle(this.identifyProtocolStr, (data) => {
      void this._handleIdentify(data).catch(err => {
        log.error(err)
      })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnTransientConnection: this.runOnTransientConnection
    })
    await this.registrar.handle(this.identifyPushProtocolStr, (data) => {
      void this._handlePush(data).catch(err => {
        log.error(err)
      })
    }, {
      maxInboundStreams: this.maxPushIncomingStreams,
      maxOutboundStreams: this.maxPushOutgoingStreams,
      runOnTransientConnection: this.runOnTransientConnection
    })

    this.started = true
  }

  async stop (): Promise<void> {
    await this.registrar.unhandle(this.identifyProtocolStr)
    await this.registrar.unhandle(this.identifyPushProtocolStr)

    this.started = false
  }

  /**
   * Send an Identify Push update to the list of connections
   */
  async pushToConnections (connections: Connection[]): Promise<void> {
    const listenAddresses = this.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
    const peerRecord = new PeerRecord({
      peerId: this.peerId,
      multiaddrs: listenAddresses
    })
    const signedPeerRecord = await RecordEnvelope.seal(peerRecord, this.peerId)
    const supportedProtocols = this.registrar.getProtocols()
    const peer = await this.peerStore.get(this.peerId)
    const agentVersion = uint8ArrayToString(peer.metadata.get('AgentVersion') ?? uint8ArrayFromString(this.host.agentVersion))
    const protocolVersion = uint8ArrayToString(peer.metadata.get('ProtocolVersion') ?? uint8ArrayFromString(this.host.protocolVersion))

    const pushes = connections.map(async connection => {
      let stream: Stream | undefined

      const signal = AbortSignal.timeout(this.timeout)

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, signal)
      } catch {}

      try {
        stream = await connection.newStream([this.identifyPushProtocolStr], {
          signal,
          runOnTransientConnection: this.runOnTransientConnection
        })

        const pb = pbStream(stream, {
          maxDataLength: this.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
        }).pb(Identify)

        await pb.write({
          listenAddrs: listenAddresses.map(ma => ma.bytes),
          signedPeerRecord: signedPeerRecord.marshal(),
          protocols: supportedProtocols,
          agentVersion,
          protocolVersion
        }, {
          signal
        })

        await stream.close({
          signal
        })
      } catch (err: any) {
        // Just log errors
        log.error('could not push identify update to peer', err)
        stream?.abort(err)
      }
    })

    await Promise.all(pushes)
  }

  /**
   * Calls `push` on all peer connections
   */
  async push (): Promise<void> {
    // Do not try to push if we are not running
    if (!this.isStarted()) {
      return
    }

    const connections: Connection[] = []

    await Promise.all(
      this.connectionManager.getConnections().map(async conn => {
        try {
          const peer = await this.peerStore.get(conn.remotePeer)

          if (!peer.protocols.includes(this.identifyPushProtocolStr)) {
            return
          }

          connections.push(conn)
        } catch (err: any) {
          if (err.code !== codes.ERR_NOT_FOUND) {
            throw err
          }
        }
      })
    )

    await this.pushToConnections(connections)
  }

  async _identify (connection: Connection, options: AbortOptions = {}): Promise<Identify> {
    let stream: Stream | undefined

    options.signal = options.signal ?? AbortSignal.timeout(this.timeout)

    try {
      stream = await connection.newStream([this.identifyProtocolStr], {
        ...options,
        runOnTransientConnection: this.runOnTransientConnection
      })

      const pb = pbStream(stream, {
        maxDataLength: this.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
      }).pb(Identify)

      const message = await pb.read(options)

      await stream.close(options)

      return message
    } catch (err: any) {
      log.error('error while reading identify message', err)
      stream?.abort(err)
      throw err
    }
  }

  async identify (connection: Connection, options: AbortOptions = {}): Promise<IdentifyResult> {
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

    if (this.peerId.equals(id)) {
      throw new CodeError('identified peer is our own peer id?', codes.ERR_INVALID_PEER)
    }

    // Get the observedAddr if there is one
    const cleanObservedAddr = getCleanMultiaddr(observedAddr)

    log('identify completed for peer %p and protocols %o', id, protocols)
    log('our observed address is %a', cleanObservedAddr)

    if (cleanObservedAddr != null &&
        this.addressManager.getObservedAddrs().length < (this.maxObservedAddresses ?? Infinity)) {
      log('storing our observed address %a', cleanObservedAddr)
      this.addressManager.addObservedAddr(cleanObservedAddr)
    }

    const signedPeerRecord = await this.#consumeIdentifyMessage(connection.remotePeer, message)

    const result: IdentifyResult = {
      peerId: id,
      protocolVersion: message.protocolVersion,
      agentVersion: message.agentVersion,
      publicKey: message.publicKey,
      listenAddrs: message.listenAddrs.map(buf => multiaddr(buf)),
      observedAddr: message.observedAddr == null ? undefined : multiaddr(message.observedAddr),
      protocols: message.protocols,
      signedPeerRecord
    }

    this.events.safeDispatchEvent('peer:identify', { detail: result })

    return result
  }

  /**
   * Sends the `Identify` response with the Signed Peer Record
   * to the requesting peer over the given `connection`
   */
  async _handleIdentify (data: IncomingStreamData): Promise<void> {
    const { connection, stream } = data

    const signal = AbortSignal.timeout(this.timeout)

    try {
      // fails on node < 15.4
      setMaxListeners?.(Infinity, signal)
    } catch {}

    try {
      const publicKey = this.peerId.publicKey ?? new Uint8Array(0)
      const peerData = await this.peerStore.get(this.peerId)
      const multiaddrs = this.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
      let signedPeerRecord = peerData.peerRecordEnvelope

      if (multiaddrs.length > 0 && signedPeerRecord == null) {
        const peerRecord = new PeerRecord({
          peerId: this.peerId,
          multiaddrs
        })

        const envelope = await RecordEnvelope.seal(peerRecord, this.peerId)
        signedPeerRecord = envelope.marshal().subarray()
      }

      const pb = pbStream(stream).pb(Identify)

      await pb.write({
        protocolVersion: this.host.protocolVersion,
        agentVersion: this.host.agentVersion,
        publicKey,
        listenAddrs: multiaddrs.map(addr => addr.bytes),
        signedPeerRecord,
        observedAddr: connection.remoteAddr.bytes,
        protocols: peerData.protocols
      }, {
        signal
      })

      await stream.close({
        signal
      })
    } catch (err: any) {
      log.error('could not respond to identify request', err)
      stream.abort(err)
    }
  }

  /**
   * Reads the Identify Push message from the given `connection`
   */
  async _handlePush (data: IncomingStreamData): Promise<void> {
    const { connection, stream } = data

    try {
      if (this.peerId.equals(connection.remotePeer)) {
        throw new Error('received push from ourselves?')
      }

      const options = {
        signal: AbortSignal.timeout(this.timeout)
      }

      const pb = pbStream(stream, {
        maxDataLength: this.maxIdentifyMessageSize ?? MAX_IDENTIFY_MESSAGE_SIZE
      }).pb(Identify)

      const message = await pb.read(options)
      await stream.close(options)

      await this.#consumeIdentifyMessage(connection.remotePeer, message)
    } catch (err: any) {
      log.error('received invalid message', err)
      stream.abort(err)
      return
    }

    log('handled push from %p', connection.remotePeer)
  }

  async #consumeIdentifyMessage (remotePeer: PeerId, message: Identify): Promise<SignedPeerRecord | undefined> {
    log('received identify from %p', remotePeer)

    if (message == null) {
      throw new Error('Message was null or undefined')
    }

    const peer = {
      addresses: message.listenAddrs.map(buf => ({
        isCertified: false,
        multiaddr: multiaddr(buf)
      })),
      protocols: message.protocols,
      metadata: new Map(),
      peerRecordEnvelope: message.signedPeerRecord
    }

    let output: SignedPeerRecord | undefined

    // if the peer record has been sent, prefer the addresses in the record as they are signed by the remote peer
    if (message.signedPeerRecord != null) {
      log('received signedPeerRecord in push from %p', remotePeer)

      let peerRecordEnvelope = message.signedPeerRecord
      const envelope = await RecordEnvelope.openAndCertify(peerRecordEnvelope, PeerRecord.DOMAIN)
      let peerRecord = PeerRecord.createFromProtobuf(envelope.payload)

      // Verify peerId
      if (!peerRecord.peerId.equals(envelope.peerId)) {
        throw new Error('signing key does not match PeerId in the PeerRecord')
      }

      // Make sure remote peer is the one sending the record
      if (!remotePeer.equals(peerRecord.peerId)) {
        throw new Error('signing key does not match remote PeerId')
      }

      let existingPeer: Peer | undefined

      try {
        existingPeer = await this.peerStore.get(peerRecord.peerId)
      } catch (err: any) {
        if (err.code !== 'ERR_NOT_FOUND') {
          throw err
        }
      }

      if (existingPeer != null) {
        // don't lose any existing metadata
        peer.metadata = existingPeer.metadata

        // if we have previously received a signed record for this peer, compare it to the incoming one
        if (existingPeer.peerRecordEnvelope != null) {
          const storedEnvelope = await RecordEnvelope.createFromProtobuf(existingPeer.peerRecordEnvelope)
          const storedRecord = PeerRecord.createFromProtobuf(storedEnvelope.payload)

          // ensure seq is greater than, or equal to, the last received
          if (storedRecord.seqNumber >= peerRecord.seqNumber) {
            log('sequence number was lower or equal to existing sequence number - stored: %d received: %d', storedRecord.seqNumber, peerRecord.seqNumber)
            peerRecord = storedRecord
            peerRecordEnvelope = existingPeer.peerRecordEnvelope
          }
        }
      }

      // store the signed record for next time
      peer.peerRecordEnvelope = peerRecordEnvelope

      // override the stored addresses with the signed multiaddrs
      peer.addresses = peerRecord.multiaddrs.map(multiaddr => ({
        isCertified: true,
        multiaddr
      }))

      output = {
        seq: peerRecord.seqNumber,
        addresses: peerRecord.multiaddrs
      }
    } else {
      log('%p did not send a signed peer record', remotePeer)
    }

    if (message.agentVersion != null) {
      peer.metadata.set('AgentVersion', uint8ArrayFromString(message.agentVersion))
    }

    if (message.protocolVersion != null) {
      peer.metadata.set('ProtocolVersion', uint8ArrayFromString(message.protocolVersion))
    }

    await this.peerStore.patch(remotePeer, peer)

    return output
  }
}

/**
 * Takes the `addr` and converts it to a Multiaddr if possible
 */
function getCleanMultiaddr (addr: Uint8Array | string | null | undefined): Multiaddr | undefined {
  if (addr != null && addr.length > 0) {
    try {
      return multiaddr(addr)
    } catch {

    }
  }
}
