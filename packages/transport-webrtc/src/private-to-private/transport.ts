import { CodeError } from '@libp2p/interface/errors'
import { type CreateListenerOptions, type DialOptions, symbol, type Transport, type Listener, type Upgrader } from '@libp2p/interface/transport'
import { logger } from '@libp2p/logger'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { codes } from '../error.js'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import { DataChannelMuxerFactory } from '../muxer.js'
import { cleanup, RTCPeerConnection } from '../webrtc/index.js'
import { initiateConnection } from './initiate-connection.js'
import { WebRTCPeerListener } from './listener.js'
import { handleIncomingStream } from './signaling-stream-handler.js'
import type { DataChannelOptions } from '../index.js'
import type { Connection } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { CounterGroup, Metrics } from '@libp2p/interface/src/metrics/index.js'
import type { Startable } from '@libp2p/interface/startable'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'
import type { ConnectionManager } from '@libp2p/interface-internal/src/connection-manager/index.js'
import type { TransportManager } from '@libp2p/interface-internal/transport-manager'

const log = logger('libp2p:webrtc:peer')

const WEBRTC_TRANSPORT = '/webrtc'
const CIRCUIT_RELAY_TRANSPORT = '/p2p-circuit'
export const SIGNALING_PROTO_ID = '/webrtc-signaling/0.0.1'
const INBOUND_CONNECTION_TIMEOUT = 30 * 1000

export interface WebRTCTransportInit {
  rtcConfiguration?: RTCConfiguration
  dataChannel?: DataChannelOptions

  /**
   * Inbound connections must complete the upgrade within this many ms
   * (default: 30s)
   */
  inboundConnectionTimeout?: number
}

export interface WebRTCTransportComponents {
  peerId: PeerId
  registrar: Registrar
  upgrader: Upgrader
  transportManager: TransportManager
  connectionManager: ConnectionManager
  metrics?: Metrics
}

export interface WebRTCTransportMetrics {
  dialerEvents: CounterGroup
  listenerEvents: CounterGroup
}

export class WebRTCTransport implements Transport, Startable {
  private _started = false
  private readonly metrics?: WebRTCTransportMetrics
  private readonly shutdownController: AbortController

  constructor (
    private readonly components: WebRTCTransportComponents,
    private readonly init: WebRTCTransportInit = {}
  ) {
    this.shutdownController = new AbortController()

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_webrtc_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebRTC dialer events by type'
        }),
        listenerEvents: components.metrics.registerCounterGroup('libp2p_webrtc_listener_events_total', {
          label: 'event',
          help: 'Total count of WebRTC listener events by type'
        })
      }
    }
  }

  isStarted (): boolean {
    return this._started
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(SIGNALING_PROTO_ID, (data: IncomingStreamData) => {
      this._onProtocol(data).catch(err => { log.error('failed to handle incoming connect from %p', data.connection.remotePeer, err) })
    }, {
      runOnTransientConnection: true
    })
    this._started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(SIGNALING_PROTO_ID)
    cleanup()
    this._started = false
  }

  createListener (options: CreateListenerOptions): Listener {
    return new WebRTCPeerListener(this.components, {
      shutdownController: this.shutdownController
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/webrtc'

  readonly [symbol] = true

  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(WebRTC.exactMatch)
  }

  /*
   * dial connects to a remote via the circuit relay or any other protocol
   * and proceeds to upgrade to a webrtc connection.
   * multiaddr of the form: <multiaddr>/webrtc/p2p/<destination-peer>
   * For a circuit relay, this will be of the form
   * <relay address>/p2p/<relay-peer>/p2p-circuit/webrtc/p2p/<destination-peer>
  */
  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    log.trace('dialing address: %a', ma)

    const peerConnection = new RTCPeerConnection(this.init.rtcConfiguration)
    const muxerFactory = new DataChannelMuxerFactory({
      peerConnection,
      dataChannelOptions: this.init.dataChannel
    })

    const { remoteAddress } = await initiateConnection({
      peerConnection,
      multiaddr: ma,
      dataChannelOptions: this.init.dataChannel,
      signal: options.signal,
      connectionManager: this.components.connectionManager,
      transportManager: this.components.transportManager
    })

    const webRTCConn = new WebRTCMultiaddrConnection({
      peerConnection,
      timeline: { open: Date.now() },
      remoteAddr: remoteAddress,
      metrics: this.metrics?.dialerEvents
    })

    const connection = await options.upgrader.upgradeOutbound(webRTCConn, {
      skipProtection: true,
      skipEncryption: true,
      muxerFactory
    })

    // close the connection on shut down
    this._closeOnShutdown(peerConnection, webRTCConn)

    return connection
  }

  async _onProtocol ({ connection, stream }: IncomingStreamData): Promise<void> {
    const signal = AbortSignal.timeout(this.init.inboundConnectionTimeout ?? INBOUND_CONNECTION_TIMEOUT)
    const peerConnection = new RTCPeerConnection(this.init.rtcConfiguration)
    const muxerFactory = new DataChannelMuxerFactory({
      peerConnection,
      dataChannelOptions: this.init.dataChannel
    })

    try {
      const { remoteAddress } = await handleIncomingStream({
        peerConnection,
        connection,
        stream,
        signal
      })

      const webRTCConn = new WebRTCMultiaddrConnection({
        peerConnection,
        timeline: { open: (new Date()).getTime() },
        remoteAddr: remoteAddress,
        metrics: this.metrics?.listenerEvents
      })

      // close the connection on shut down
      this._closeOnShutdown(peerConnection, webRTCConn)

      await this.components.upgrader.upgradeInbound(webRTCConn, {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory
      })

      // close the stream if SDP messages have been exchanged successfully
      await stream.close({
        signal
      })
    } catch (err: any) {
      stream.abort(err)
      throw err
    }
  }

  private _closeOnShutdown (pc: RTCPeerConnection, webRTCConn: WebRTCMultiaddrConnection): void {
    // close the connection on shut down
    const shutDownListener = (): void => {
      webRTCConn.close()
        .catch(err => {
          log.error('could not close WebRTCMultiaddrConnection', err)
        })
    }

    this.shutdownController.signal.addEventListener('abort', shutDownListener)

    pc.addEventListener('close', () => {
      this.shutdownController.signal.removeEventListener('abort', shutDownListener)
    })
  }
}

export function splitAddr (ma: Multiaddr): { baseAddr: Multiaddr, peerId: PeerId } {
  const addrs = ma.toString().split(WEBRTC_TRANSPORT + '/')
  if (addrs.length !== 2) {
    throw new CodeError('webrtc protocol was not present in multiaddr', codes.ERR_INVALID_MULTIADDR)
  }

  if (!addrs[0].includes(CIRCUIT_RELAY_TRANSPORT)) {
    throw new CodeError('p2p-circuit protocol was not present in multiaddr', codes.ERR_INVALID_MULTIADDR)
  }

  // look for remote peerId
  let remoteAddr = multiaddr(addrs[0])
  const destination = multiaddr('/' + addrs[1])

  const destinationIdString = destination.getPeerId()
  if (destinationIdString == null) {
    throw new CodeError('destination peer id was missing', codes.ERR_INVALID_MULTIADDR)
  }

  const lastProtoInRemote = remoteAddr.protos().pop()
  if (lastProtoInRemote === undefined) {
    throw new CodeError('invalid multiaddr', codes.ERR_INVALID_MULTIADDR)
  }
  if (lastProtoInRemote.name !== 'p2p') {
    remoteAddr = remoteAddr.encapsulate(`/p2p/${destinationIdString}`)
  }

  return { baseAddr: remoteAddr, peerId: peerIdFromString(destinationIdString) }
}
