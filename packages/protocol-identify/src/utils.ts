import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidMessageError } from '@libp2p/interface'
import { peerIdFromCID, peerIdFromPublicKey } from '@libp2p/peer-id'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import { multiaddr } from '@multiformats/multiaddr'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { IDENTIFY_PROTOCOL_VERSION, MAX_IDENTIFY_MESSAGE_SIZE, MAX_PUSH_CONCURRENCY } from './consts.js'
import type { IdentifyComponents, IdentifyInit } from './index.js'
import type { Identify as IdentifyMessage } from './pb/message.js'
import type { Libp2pEvents, IdentifyResult, SignedPeerRecord, Logger, Connection, Peer, PeerData, PeerStore, NodeInfo, Startable, PeerId, IncomingStreamData, PrivateKey } from '@libp2p/interface'
import type { AddressManager, Registrar } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'

export const defaultValues = {
  protocolPrefix: 'ipfs',
  timeout: 5000,
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  maxObservedAddresses: 10,
  maxMessageSize: MAX_IDENTIFY_MESSAGE_SIZE,
  runOnConnectionOpen: true,
  runOnSelfUpdate: true,
  runOnLimitedConnection: true,
  concurrency: MAX_PUSH_CONCURRENCY
}

/**
 * Takes the `addr` and converts it to a Multiaddr if possible
 */
export function getCleanMultiaddr (addr: Uint8Array | string | null | undefined): Multiaddr | undefined {
  if (addr != null && addr.length > 0) {
    try {
      return multiaddr(addr)
    } catch {

    }
  }
}

export function getAgentVersion (nodeInfo: NodeInfo, agentVersion?: string): string {
  if (agentVersion != null) {
    return agentVersion
  }

  return nodeInfo.userAgent
}

export async function consumeIdentifyMessage (peerStore: PeerStore, events: TypedEventTarget<Libp2pEvents>, log: Logger, connection: Connection, message: IdentifyMessage): Promise<IdentifyResult> {
  log('received identify from %p', connection.remotePeer)

  if (message == null) {
    throw new InvalidMessageError('message was null or undefined')
  }

  const peer: PeerData = {}

  if (message.listenAddrs.length > 0) {
    peer.addresses = message.listenAddrs.map(buf => ({
      isCertified: false,
      multiaddr: multiaddr(buf)
    }))
  }

  if (message.protocols.length > 0) {
    peer.protocols = message.protocols
  }

  if (message.publicKey != null) {
    const publicKey = publicKeyFromProtobuf(message.publicKey)
    const peerId = peerIdFromPublicKey(publicKey)

    if (!peerId.equals(connection.remotePeer)) {
      throw new InvalidMessageError('public key did not match remote PeerId')
    }

    peer.publicKey = publicKey
  }

  let output: SignedPeerRecord | undefined

  // if the peer record has been sent, prefer the addresses in the record as they are signed by the remote peer
  if (message.signedPeerRecord != null) {
    log.trace('received signedPeerRecord from %p', connection.remotePeer)

    let peerRecordEnvelope = message.signedPeerRecord
    const envelope = await RecordEnvelope.openAndCertify(peerRecordEnvelope, PeerRecord.DOMAIN)
    let peerRecord = PeerRecord.createFromProtobuf(envelope.payload)
    const envelopePeer = peerIdFromCID(envelope.publicKey.toCID())

    // Verify peerId
    if (!peerRecord.peerId.equals(envelopePeer)) {
      throw new InvalidMessageError('signing key does not match PeerId in the PeerRecord')
    }

    // Make sure remote peer is the one sending the record
    if (!connection.remotePeer.equals(peerRecord.peerId)) {
      throw new InvalidMessageError('signing key does not match remote PeerId')
    }

    let existingPeer: Peer | undefined

    try {
      existingPeer = await peerStore.get(peerRecord.peerId)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }
    }

    if (existingPeer != null) {
      // don't lose any existing metadata
      peer.metadata = existingPeer.metadata

      // if we have previously received a signed record for this peer, compare it to the incoming one
      if (existingPeer.peerRecordEnvelope != null) {
        const storedEnvelope = RecordEnvelope.createFromProtobuf(existingPeer.peerRecordEnvelope)
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
    log('%p did not send a signed peer record', connection.remotePeer)
  }

  log.trace('patching %p with', connection.remotePeer, peer)
  await peerStore.patch(connection.remotePeer, peer)

  if (message.agentVersion != null || message.protocolVersion != null) {
    const metadata: Record<string, Uint8Array> = {}

    if (message.agentVersion != null) {
      metadata.AgentVersion = uint8ArrayFromString(message.agentVersion)
    }

    if (message.protocolVersion != null) {
      metadata.ProtocolVersion = uint8ArrayFromString(message.protocolVersion)
    }

    log.trace('merging %p metadata', connection.remotePeer, metadata)
    await peerStore.merge(connection.remotePeer, {
      metadata
    })
  }

  const result: IdentifyResult = {
    peerId: connection.remotePeer,
    protocolVersion: message.protocolVersion,
    agentVersion: message.agentVersion,
    publicKey: message.publicKey,
    listenAddrs: message.listenAddrs.map(buf => multiaddr(buf)),
    observedAddr: message.observedAddr == null ? undefined : multiaddr(message.observedAddr),
    protocols: message.protocols,
    signedPeerRecord: output,
    connection
  }

  events.safeDispatchEvent('peer:identify', { detail: result })

  return result
}

export interface AbstractIdentifyInit extends IdentifyInit {
  protocol: string
  log: Logger
}

export abstract class AbstractIdentify implements Startable {
  public readonly host: {
    protocolVersion: string
    agentVersion: string
  }

  protected protocol: string
  protected started: boolean
  protected readonly timeout: number
  protected readonly peerId: PeerId
  protected readonly privateKey: PrivateKey
  protected readonly peerStore: PeerStore
  protected readonly registrar: Registrar
  protected readonly addressManager: AddressManager
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  protected readonly maxMessageSize: number
  protected readonly maxObservedAddresses: number
  protected readonly events: TypedEventTarget<Libp2pEvents>
  protected readonly runOnLimitedConnection: boolean
  protected readonly log: Logger

  constructor (components: IdentifyComponents, init: AbstractIdentifyInit) {
    this.protocol = init.protocol
    this.started = false
    this.peerId = components.peerId
    this.privateKey = components.privateKey
    this.peerStore = components.peerStore
    this.registrar = components.registrar
    this.addressManager = components.addressManager
    this.events = components.events
    this.log = init.log

    this.timeout = init.timeout ?? defaultValues.timeout
    this.maxInboundStreams = init.maxInboundStreams ?? defaultValues.maxInboundStreams
    this.maxOutboundStreams = init.maxOutboundStreams ?? defaultValues.maxOutboundStreams
    this.maxMessageSize = init.maxMessageSize ?? defaultValues.maxMessageSize
    this.maxObservedAddresses = init.maxObservedAddresses ?? defaultValues.maxObservedAddresses
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? defaultValues.runOnLimitedConnection

    // Store self host metadata
    this.host = {
      protocolVersion: `${init.protocolPrefix ?? defaultValues.protocolPrefix}/${IDENTIFY_PROTOCOL_VERSION}`,
      agentVersion: getAgentVersion(components.nodeInfo, init.agentVersion)
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

    await this.registrar.handle(this.protocol, (data) => {
      void this.handleProtocol(data).catch(err => {
        this.log.error(err)
      })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
    })

    this.started = true
  }

  async stop (): Promise<void> {
    await this.registrar.unhandle(this.protocol)

    this.started = false
  }

  protected abstract handleProtocol (data: IncomingStreamData): Promise<void>
}
