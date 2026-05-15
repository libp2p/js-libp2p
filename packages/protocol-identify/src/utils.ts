import { publicKeyFromProtobuf } from '@libp2p/crypto/keys'
import { InvalidMessageError } from '@libp2p/interface'
import { peerIdFromCID, peerIdFromPublicKey } from '@libp2p/peer-id'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import { pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { IDENTIFY_PROTOCOL_VERSION, MAX_IDENTIFY_MESSAGE_SIZE, MAX_IDENTIFY_MESSAGES, MAX_PUSH_CONCURRENCY } from './consts.ts'
import { Identify as IdentifyMessage } from './pb/message.ts'
import type { IdentifyComponents, IdentifyInit } from './index.ts'
import type { AbortOptions, Libp2pEvents, IdentifyResult, SignedPeerRecord, Logger, Connection, Peer, PeerData, PeerStore, Startable, Stream } from '@libp2p/interface'
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

function isEmptyMultiaddr (addr: Multiaddr): boolean {
  return addr.bytes.length === 0
}

/**
 * Takes the `addr` and converts it to a Multiaddr if possible, returning
 * `undefined` for null/empty/malformed input or zero-byte multiaddrs (e.g. `/`).
 */
export function getCleanMultiaddr (addr: Uint8Array | string | null | undefined): Multiaddr | undefined {
  if (addr != null && addr.length > 0) {
    try {
      const ma = multiaddr(addr)
      if (!isEmptyMultiaddr(ma)) {
        return ma
      }
    } catch {

    }
  }
}

export async function consumeIdentifyMessage (peerStore: PeerStore, events: TypedEventTarget<Libp2pEvents>, log: Logger, connection: Connection, message: IdentifyMessage): Promise<IdentifyResult> {
  log('received identify from %p', connection.remotePeer)

  if (message == null) {
    throw new InvalidMessageError('message was null or undefined')
  }

  const peer: PeerData = {}

  const listenAddrs = message.listenAddrs
    .map(getCleanMultiaddr)
    .filter((addr): addr is Multiaddr => addr != null)

  if (message.listenAddrs.length > 0) {
    peer.addresses = listenAddrs.map(multiaddr => ({
      isCertified: false,
      multiaddr
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

    const peerRecordMultiaddrs = peerRecord.multiaddrs.filter(addr => !isEmptyMultiaddr(addr))

    // override the stored addresses with the signed multiaddrs
    peer.addresses = peerRecordMultiaddrs.map(multiaddr => ({
      isCertified: true,
      multiaddr
    }))

    output = {
      seq: peerRecord.seqNumber,
      addresses: peerRecordMultiaddrs
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
    listenAddrs,
    observedAddr: message.observedAddr == null ? undefined : multiaddr(message.observedAddr),
    protocols: message.protocols,
    signedPeerRecord: output,
    connection
  }

  events.safeDispatchEvent('peer:identify', { detail: result })

  return result
}

/**
 * Merge multiple received Identify messages into one. Repeated `listenAddrs`
 * are concatenated as-is — peerstore handles deduplication downstream.
 * `protocols` are deduplicated via Set since they're string identifiers.
 */
export function mergeIdentifyMessages (messages: IdentifyMessage[]): IdentifyMessage {
  const merged: IdentifyMessage = { ...messages[0] }

  for (const msg of messages.slice(1)) {
    if (msg.protocolVersion != null) {
      merged.protocolVersion = msg.protocolVersion
    }
    if (msg.agentVersion != null) {
      merged.agentVersion = msg.agentVersion
    }
    if (msg.publicKey != null) {
      merged.publicKey = msg.publicKey
    }
    if (msg.observedAddr != null) {
      merged.observedAddr = msg.observedAddr
    }
    if (msg.signedPeerRecord != null) {
      merged.signedPeerRecord = msg.signedPeerRecord
    }
    merged.listenAddrs = [...merged.listenAddrs, ...msg.listenAddrs]
    merged.protocols = [...new Set([...merged.protocols, ...msg.protocols])]
  }

  return merged
}

/**
 * Read up to MAX_IDENTIFY_MESSAGES LP-framed Identify messages from the
 * stream, then close. Used by both identify and identify-push receive paths.
 *
 * Any error after at least one successful read is treated as "stop reading"
 * (we keep what we got — peerstore handles deduplication/merge downstream).
 * Close errors are swallowed and the stream is aborted instead — preserves
 * the read result while ensuring transport cleanup.
 *
 * Multi-message identify is per the proposed spec update at
 * https://github.com/libp2p/specs/pull/709.
 */
export async function readIdentifyMessages (stream: Stream, maxMessageSize: number, options: AbortOptions, log: Logger): Promise<IdentifyMessage[]> {
  const pb = pbStream(stream, {
    maxDataLength: maxMessageSize
  }).pb(IdentifyMessage)

  const messages: IdentifyMessage[] = []

  for (let i = 0; i < MAX_IDENTIFY_MESSAGES; i++) {
    try {
      messages.push(await pb.read(options))
    } catch (err: any) {
      if (messages.length === 0) {
        throw err
      }
      log.trace('stopped reading identify - %e', err)
      break
    }
  }

  if (messages.length >= MAX_IDENTIFY_MESSAGES) {
    log('reached MAX_IDENTIFY_MESSAGES, returning truncated identify')
  }

  try {
    await stream.close(options)
  } catch (err: any) {
    log.trace('error closing identify stream after read - %e', err)
    stream.abort(err)
  }

  return messages
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

  protected components: IdentifyComponents
  protected protocol: string
  protected started: boolean
  protected readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  protected readonly maxMessageSize: number
  protected readonly maxObservedAddresses: number
  protected readonly runOnLimitedConnection: boolean
  protected readonly log: Logger

  constructor (components: IdentifyComponents, init: AbstractIdentifyInit) {
    this.protocol = init.protocol
    this.started = false
    this.components = components
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
      agentVersion: components.nodeInfo.userAgent
    }

    this.handleProtocol = this.handleProtocol.bind(this)
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

    await this.components.registrar.handle(this.protocol, this.handleProtocol, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
    })

    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)

    this.started = false
  }

  protected abstract handleProtocol (stream: Stream, connection: Connection): Promise<void>
}
