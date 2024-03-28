/* eslint-disable complexity */
import { CodeError } from '@libp2p/interface/errors'
import { setMaxListeners, type TypedEventTarget } from '@libp2p/interface/src/events'
import { type Multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { PeerRecord } from '../../peer-record/src/peer-record/peer-record'
import type {
  AmbientPeersComponents,
  AmbientPeersInit,
  AmbientPeers as AmbientPeersInterface
} from './index.js'
import type { AbortOptions, Logger, Libp2pEvents } from '@libp2p/interface'
import type { Connection, Stream } from '@libp2p/interface/src/connection'
import type { PeerId } from '@libp2p/interface/src/peer-id'
import type { PeerStore } from '@libp2p/interface/src/peer-store'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData } from '@libp2p/interface-internal/registrar'

const defaultValues = {
  protocolName: 'ambient-peers',
  protocolPrefix: 'libp2p',
  timeout: 30000,
  // See https://github.com/libp2p/specs/blob/d4b5fb0152a6bb86cfd9ea/ping/ping.md?plain=1#L38-L43
  maxInboundStreams: 2,
  maxOutboundStreams: 1,
  runOnConnectionOpen: true,
  runOnTransientConnection: true
}

export class AmbientPeers implements Startable, AmbientPeersInterface {
  public readonly protocolName: string

  private readonly peerId: PeerId
  private readonly peerStore: PeerStore
  private readonly registrar: Registrar
  private readonly connectionManager: ConnectionManager
  private readonly addressManager: AddressManager
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly log: Logger

  private started: boolean

  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnTransientConnection: boolean
  private readonly runOnConnectionOpen: boolean

  constructor (components: AmbientPeersComponents, init: AmbientPeersInit = {}) {
    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.registrar = components.registrar
    this.addressManager = components.addressManager
    this.connectionManager = components.connectionManager
    this.events = components.events

    this.log = components.logger.forComponent('libp2p:ambient-peers')

    this.started = false
    this.protocolName = `/${init.protocolPrefix ?? defaultValues.protocolPrefix}/${
      defaultValues.protocolName
    }`

    this.maxInboundStreams = init.maxInboundStreams ?? defaultValues.maxInboundStreams
    this.maxOutboundStreams = init.maxOutboundStreams ?? defaultValues.maxOutboundStreams
    this.timeout = init.timeout ?? defaultValues.timeout
    this.runOnTransientConnection = init.runOnTransientConnection ?? defaultValues.runOnTransientConnection
    this.runOnConnectionOpen = init.runOnConnectionOpen ?? defaultValues.runOnConnectionOpen

    this.handleAmbientPeerRequest = this.handleAmbientPeerRequest.bind(this)
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await this.registrar.handle(this.protocolName, this.handleAmbientPeerRequest, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      // To enable relayed connections to use the protocol
      runOnTransientConnection: this.runOnTransientConnection
    })

    if (this.runOnConnectionOpen) {
      // TODO: should we invoke ambient peer discovery when connections open?
      // this.events.addEventListener('connection:open', (evt) => {
      //   const connection = evt.detail
      //   this.getPeers(connection).catch((err) => {
      //     this.log.error('error during getPeers trigged by connection:open', err)
      //   })
      // })
    }
    this.started = true
  }

  async stop (): Promise<void> {
    await this.registrar.unhandle(this.protocolName)
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * A handler to register with Libp2p to process ambient peer requests
   * Invoked when an ambient peer request is received.
   */
  async handleAmbientPeerRequest (data: IncomingStreamData): Promise<void> {
    const { connection, stream } = data
    this.log('incoming ambient peer request from %p', connection.remotePeer)

    // Choose a subset of at most 5 known peer records
    const allPeers = await this.peerStore.all()
    const selectedPeers = allPeers.slice(0, 5) // improve the selection process to select peers of the same protocol as the incoming peers connection
    // const incomingPeerProtos = connection.remoteAddr.protos() // get the protocol of the requestor so that the selected peers sent are of the same protocol
    // const selectedPeers = allPeers.filter(peer => peer.protocols.includes('webrtc')) // filter peers with webrtc

    const peerRecords: PeerRecord[] = selectedPeers.map((peer) => ({
      peerId: peer.id.toBytes(),
      addresses: peer.addresses.map((addr) => ({ multiaddr: addr.multiaddr.bytes })),
      // TODO: where should the sequence number for the sent peers come from?
      seq: BigInt(Date.now())
    }))

    const signal = AbortSignal.timeout(this.timeout)

    try {
      const pb = pbStream(stream).pb(PeerRecord)

      // TODO: is this the right approach to write multiple protobuf messages to the stream?
      await pb.writeV(peerRecords, {
        signal
      })

      await stream.close()
    } catch (err: any) {
      this.log.error('could not push ambient peer records to peer', err)
      stream.abort(err)
    }
  }

  /**
   * Invoke an ambient peer request on a specific connection
   */
  async getPeers (connection: Connection, options: AbortOptions = {}): Promise<Multiaddr[]> {
    let stream: Stream | undefined

    if (options.signal == null) {
      const signal = AbortSignal.timeout(this.timeout)
      setMaxListeners(Infinity, signal) // TODO: what does this do exactly?

      options = { ...options, signal }
    }

    try {
      stream = await connection.newStream(this.protocolName, {
        ...options,
        runOnTransientConnection: this.runOnTransientConnection
      })

      // TODO: is this the right approach to read **multiple** protobuf messages from the stream?
      const pb = pbStream(stream).pb(PeerRecord)

      const message = await pb.read(options)

      await stream.close(options)
    } catch (err: any) {
      this.log.error('error while reading peer record message', err)
      stream?.abort(err)
      throw err
    }
  }
}
