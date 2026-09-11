import { InvalidParametersError, serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { CODE_P2P } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { UFRAG_PREFIX_V1 } from '../constants.ts'
import { UnimplementedError } from '../error.ts'
import { genUfrag } from '../util.ts'
import { connect } from './utils/connect.ts'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.ts'
import type { DataChannelOptions } from '../index.ts'
import type { WebRTCDialEvents } from '../private-to-private/transport.ts'
import type { CreateListenerOptions, Transport, Listener, ComponentLogger, Logger, Connection, CounterGroup, Metrics, PeerId, DialTransportOptions, PrivateKey, Upgrader } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Keychain } from '@libp2p/keychain'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Datastore } from 'interface-datastore'

export interface WebRTCDirectTransportComponents {
  peerId: PeerId
  privateKey: PrivateKey
  metrics?: Metrics
  logger: ComponentLogger
  transportManager: TransportManager
  upgrader: Upgrader
  keychain?: Keychain
  datastore: Datastore
}

export interface WebRTCMetrics {
  dialerEvents: CounterGroup
}

export interface WebRTCTransportDirectInit {
  /**
   * Force the version of the WebRTC Direct connection flow to dial with. When
   * not set, the first dial tries v1 and continues as v2 if the runtime does
   * not apply the munged ICE credentials in the local SDP offer, and later
   * dials start at whichever version that showed the runtime supports. The
   * server must support the version in use, listeners accept both.
   */
  dialerVersion?: 1 | 2

  /**
   * The default configuration used by all created RTCPeerConnections
   */
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)

  /**
   * The default configuration used by all created RTCDataChannels
   */
  dataChannel?: DataChannelOptions

  /**
   * Caps the inbound streams accepted before the connection surfaces them, and
   * the data channels buffered before the muxer exists (excess are closed).
   *
   * @default 10
   */
  maxEarlyStreams?: number
}

export class WebRTCDirectTransport implements Transport {
  protected readonly log: Logger
  protected readonly metrics?: WebRTCMetrics
  protected readonly components: WebRTCDirectTransportComponents
  protected readonly init: WebRTCTransportDirectInit
  private mungeable?: boolean

  constructor (components: WebRTCDirectTransportComponents, init: WebRTCTransportDirectInit = {}) {
    this.log = components.logger.forComponent('libp2p:webrtc-direct')
    this.components = components
    this.init = init

    const dialerVersion: unknown = init.dialerVersion

    if (dialerVersion != null && dialerVersion !== 1 && dialerVersion !== 2) {
      throw new InvalidParametersError(`Unknown WebRTC Direct dialer version "${String(dialerVersion)}"`)
    }

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_webrtc-direct_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebRTC-direct dial events by type'
        })
      }
    }
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/webrtc-direct'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  /**
   * Dial a given multiaddr
   */
  async dial (ma: Multiaddr, options: DialTransportOptions<WebRTCDialEvents>): Promise<Connection> {
    this.log('dial %a', ma)
    // do not create RTCPeerConnection if the signal has already been aborted
    options.signal.throwIfAborted()

    let theirPeerId: PeerId | undefined
    const remotePeerString = ma.getComponents().findLast(c => c.code === CODE_P2P)?.value
    if (remotePeerString != null) {
      theirPeerId = peerIdFromString(remotePeerString)
    }

    // an explicit dialer version is always used, otherwise start at v1 until a
    // dial shows this runtime does not apply munged ICE credentials
    const version = this.init.dialerVersion ?? (this.mungeable === false ? 2 : 1)
    const ufrag = version === 2
      ? genUfrag(32, '')
      : genUfrag(32, UFRAG_PREFIX_V1)
    const pwd = version === 2 ? genUfrag(22, '') : ufrag

    // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md
    const {
      peerConnection,
      muxerFactory
    } = await createDialerRTCPeerConnection('client', ufrag, {
      rtcConfiguration: typeof this.init.rtcConfiguration === 'function' ? await this.init.rtcConfiguration() : this.init.rtcConfiguration ?? {},
      events: this.metrics?.dialerEvents,
      log: this.log,
      dataChannel: this.init.dataChannel,
      maxEarlyStreams: this.init.maxEarlyStreams,
      pwd
    })

    try {
      const { connection, mungeable } = await connect(peerConnection, muxerFactory, ufrag, {
        role: 'client',
        log: this.log,
        logger: this.components.logger,
        events: this.metrics?.dialerEvents,
        signal: options.signal,
        version,
        fallback: this.init.dialerVersion == null,
        remoteAddr: ma,
        dataChannel: this.init.dataChannel,
        upgrader: options.upgrader,
        peerId: this.components.peerId,
        remotePeer: theirPeerId,
        privateKey: this.components.privateKey
      })

      // remember what the munge attempt showed so later dials start at the
      // right version
      this.mungeable ??= mungeable

      return connection
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  /**
   * Create a transport listener - this will throw in browsers
   */
  createListener (options: CreateListenerOptions): Listener {
    throw new UnimplementedError('WebRTCDirectTransport.createListener')
  }

  /**
   * Filter check for all Multiaddrs that this transport can listen on
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return []
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(WebRTCDirect.exactMatch)
  }
}
