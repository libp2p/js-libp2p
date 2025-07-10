import { InvalidParametersError, serviceCapabilities, serviceDependencies, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { setMaxListeners } from 'main-event'
import { SIGNALING_PROTOCOL } from '../constants.js'
import { WebRTCMultiaddrConnection } from '../maconn.js'
import { DataChannelMuxerFactory } from '../muxer.js'
import { getRtcConfiguration } from '../util.js'
import { RTCPeerConnection } from '../webrtc/index.js'
import { initiateConnection } from './initiate-connection.js'
import { WebRTCPeerListener } from './listener.js'
import { handleIncomingStream } from './signaling-stream-handler.js'
import type { DataChannelOptions } from '../index.js'
import type { OutboundConnectionUpgradeEvents, CreateListenerOptions, DialTransportOptions, Transport, Listener, Upgrader, ComponentLogger, Logger, Connection, PeerId, CounterGroup, Metrics, Startable, OpenConnectionProgressEvents, IncomingStreamData, Libp2pEvents } from '@libp2p/interface'
import type { Registrar, ConnectionManager, TransportManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'
import type { ProgressEvent } from 'progress-events'

export interface WebRTCTransportInit {
  /**
   * Add additional configuration to any RTCPeerConnections that are created.
   *
   * This could be extra STUN/TURN servers, certificate, etc.
   */
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)

  /**
   * Any options here will be applied to any RTCDataChannels that are opened.
   */
  dataChannel?: DataChannelOptions

  /**
   * Inbound connections must complete the upgrade within this many ms
   *
   * @default 30_000
   * @deprecated configure `connectionManager.inboundUpgradeTimeout` instead
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
  events: TypedEventTarget<Libp2pEvents>
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
    await this.components.registrar.handle(SIGNALING_PROTOCOL, (data: IncomingStreamData) => {
      // ensure we don't try to upgrade forever
      const signal = this.components.upgrader.createInboundAbortSignal(this.shutdownController.signal)

      this._onProtocol(data, signal)
        .catch(err => {
          this.log.error('failed to handle incoming connect from %p', data.connection.remotePeer, err)
        })
        .finally(() => {
          signal.clear()
        })
    }, {
      runOnLimitedConnection: true
    })
    this._started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(SIGNALING_PROTOCOL)
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
      onProgress: options.onProgress,
      signal: options.signal
    })

    // close the connection on shut down
    this._closeOnShutdown(peerConnection, webRTCConn)

    return connection
  }

  async _onProtocol ({ connection, stream }: IncomingStreamData, signal: AbortSignal): Promise<void> {
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
        muxerFactory,
        signal
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

export function splitAddr (ma: Multiaddr): { circuitAddress: Multiaddr, targetPeer: PeerId } {
  const target = ma.getComponents()
    .filter(({ name }) => name === 'p2p')
    .map(({ value }) => value)
    .pop()

  if (target == null) {
    throw new InvalidParametersError('Destination peer id was missing')
  }

  const circuitAddress = multiaddr(
    ma.getComponents()
      .filter(({ name }) => name !== 'webrtc')
  )

  return { circuitAddress, targetPeer: peerIdFromString(target) }
}
