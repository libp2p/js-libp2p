import { InvalidParametersError, serviceCapabilities, serviceDependencies, setMaxListeners, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import { DataChannelMuxerFactory } from '../muxer.js'
import { getRtcConfiguration } from '../util.js'
import { RTCPeerConnection } from '../webrtc/index.js'
import { initiateConnection } from './initiate-connection.js'
import { WebRTCPeerListener } from './listener.js'
import { handleIncomingStream } from './signaling-stream-handler.js'
import type { DataChannelOptions } from '../index.js'
import type { OutboundConnectionUpgradeEvents, CreateListenerOptions, DialTransportOptions, Transport, Listener, Upgrader, ComponentLogger, Logger, Connection, PeerId, CounterGroup, Metrics, Startable, OpenConnectionProgressEvents } from '@libp2p/interface'
import type { IncomingStreamData, Registrar, ConnectionManager, TransportManager } from '@libp2p/interface-internal'
import type { ProgressEvent } from 'progress-events'

const WEBRTC_TRANSPORT = '/webrtc'
const CIRCUIT_RELAY_TRANSPORT = '/p2p-circuit'
export const SIGNALING_PROTO_ID = '/webrtc-signaling/0.0.1'
const INBOUND_CONNECTION_TIMEOUT = 30 * 1000

export interface WebRTCTransportInit {
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  dataChannel?: DataChannelOptions

  /**
   * Inbound connections must complete the upgrade within this many ms
   *
   * @default 30000
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
  logger: ComponentLogger
}

export interface WebRTCTransportMetrics {
  dialerEvents: CounterGroup
  listenerEvents: CounterGroup
}

export type WebRTCDialEvents =
  OutboundConnectionUpgradeEvents |
  OpenConnectionProgressEvents |
  ProgressEvent<'webrtc:dial-relay'> |
  ProgressEvent<'webrtc:reuse-relay-connection'> |
  ProgressEvent<'webrtc:open-signaling-stream'> |
  ProgressEvent<'webrtc:send-sdp-offer'> |
  ProgressEvent<'webrtc:read-sdp-answer'> |
  ProgressEvent<'webrtc:read-ice-candidates'> |
  ProgressEvent<'webrtc:add-ice-candidate', string> |
  ProgressEvent<'webrtc:end-of-ice-candidates'> |
  ProgressEvent<'webrtc:close-signaling-stream'>

export class WebRTCTransport implements Transport<WebRTCDialEvents>, Startable {
  private readonly log: Logger
  private _started = false
  private readonly metrics?: WebRTCTransportMetrics
  private readonly shutdownController: AbortController

  constructor (
    private readonly components: WebRTCTransportComponents,
    private readonly init: WebRTCTransportInit = {}
  ) {
    this.log = components.logger.forComponent('libp2p:webrtc')
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

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

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/webrtc'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  readonly [serviceDependencies]: string[] = [
    '@libp2p/identify',
    '@libp2p/circuit-relay-v2-transport'
  ]

  isStarted (): boolean {
    return this._started
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(SIGNALING_PROTO_ID, (data: IncomingStreamData) => {
      this._onProtocol(data).catch(err => { this.log.error('failed to handle incoming connect from %p', data.connection.remotePeer, err) })
    }, {
      runOnLimitedConnection: true
    })
    this._started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(SIGNALING_PROTO_ID)
    this._started = false
  }

  createListener (options: CreateListenerOptions): Listener {
    return new WebRTCPeerListener(this.components, {
      shutdownController: this.shutdownController
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can listen on
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(WebRTC.exactMatch)
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }

  /*
   * dial connects to a remote via the circuit relay or any other protocol
   * and proceeds to upgrade to a webrtc connection.
   * multiaddr of the form: <multiaddr>/webrtc/p2p/<destination-peer>
   * For a circuit relay, this will be of the form
   * <relay address>/p2p/<relay-peer>/p2p-circuit/webrtc/p2p/<destination-peer>
  */
  async dial (ma: Multiaddr, options: DialTransportOptions<WebRTCDialEvents>): Promise<Connection> {
    this.log.trace('dialing address: %a', ma)

    const { remoteAddress, peerConnection, muxerFactory } = await initiateConnection({
      rtcConfiguration: await getRtcConfiguration(this.init.rtcConfiguration),
      dataChannel: this.init.dataChannel,
      multiaddr: ma,
      dataChannelOptions: this.init.dataChannel,
      signal: options.signal,
      connectionManager: this.components.connectionManager,
      transportManager: this.components.transportManager,
      log: this.log,
      logger: this.components.logger,
      onProgress: options.onProgress
    })

    const webRTCConn = new WebRTCMultiaddrConnection(this.components, {
      peerConnection,
      timeline: { open: Date.now() },
      remoteAddr: remoteAddress,
      metrics: this.metrics?.dialerEvents
    })

    const connection = await options.upgrader.upgradeOutbound(webRTCConn, {
      skipProtection: true,
      skipEncryption: true,
      muxerFactory,
      onProgress: options.onProgress
    })

    // close the connection on shut down
    this._closeOnShutdown(peerConnection, webRTCConn)

    return connection
  }

  async _onProtocol ({ connection, stream }: IncomingStreamData): Promise<void> {
    const signal = AbortSignal.timeout(this.init.inboundConnectionTimeout ?? INBOUND_CONNECTION_TIMEOUT)
    const peerConnection = new RTCPeerConnection(await getRtcConfiguration(this.init.rtcConfiguration))
    const muxerFactory = new DataChannelMuxerFactory(this.components, {
      peerConnection,
      dataChannelOptions: this.init.dataChannel
    })

    try {
      const { remoteAddress } = await handleIncomingStream({
        peerConnection,
        connection,
        stream,
        signal,
        log: this.log
      })

      // close the stream if SDP messages have been exchanged successfully
      await stream.close({
        signal
      })

      const webRTCConn = new WebRTCMultiaddrConnection(this.components, {
        peerConnection,
        timeline: { open: (new Date()).getTime() },
        remoteAddr: remoteAddress,
        metrics: this.metrics?.listenerEvents
      })

      await this.components.upgrader.upgradeInbound(webRTCConn, {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory
      })

      // close the connection on shut down
      this._closeOnShutdown(peerConnection, webRTCConn)
    } catch (err: any) {
      this.log.error('incoming signaling error', err)

      peerConnection.close()
      stream.abort(err)
      throw err
    }
  }

  private _closeOnShutdown (pc: RTCPeerConnection, webRTCConn: WebRTCMultiaddrConnection): void {
    // close the connection on shut down
    const shutDownListener = (): void => {
      webRTCConn.close()
        .catch(err => {
          this.log.error('could not close WebRTCMultiaddrConnection', err)
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
    throw new InvalidParametersError('webrtc protocol was not present in multiaddr')
  }

  if (!addrs[0].includes(CIRCUIT_RELAY_TRANSPORT)) {
    throw new InvalidParametersError('p2p-circuit protocol was not present in multiaddr')
  }

  // look for remote peerId
  let remoteAddr = multiaddr(addrs[0])
  const destination = multiaddr('/' + addrs[1])

  const destinationIdString = destination.getPeerId()
  if (destinationIdString == null) {
    throw new InvalidParametersError('destination peer id was missing')
  }

  const lastProtoInRemote = remoteAddr.protos().pop()
  if (lastProtoInRemote === undefined) {
    throw new InvalidParametersError('invalid multiaddr')
  }
  if (lastProtoInRemote.name !== 'p2p') {
    remoteAddr = remoteAddr.encapsulate(`/p2p/${destinationIdString}`)
  }

  return { baseAddr: remoteAddr, peerId: peerIdFromString(destinationIdString) }
}
