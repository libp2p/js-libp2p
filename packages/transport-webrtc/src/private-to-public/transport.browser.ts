import { serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { CODE_P2P } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { UnimplementedError } from '../error.ts'
import { genUfrag } from '../util.js'
import { connect } from './utils/connect.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import type { DataChannelOptions } from '../index.js'
import type { WebRTCDialEvents } from '../private-to-private/transport.js'
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
   * The default configuration used by all created RTCPeerConnections
   */
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)

  /**
   * The default configuration used by all created RTCDataChannels
   */
  dataChannel?: DataChannelOptions
}

export class WebRTCDirectTransport implements Transport {
  protected readonly log: Logger
  protected readonly metrics?: WebRTCMetrics
  protected readonly components: WebRTCDirectTransportComponents
  protected readonly init: WebRTCTransportDirectInit

  constructor (components: WebRTCDirectTransportComponents, init: WebRTCTransportDirectInit = {}) {
    this.log = components.logger.forComponent('libp2p:webrtc-direct')
    this.components = components
    this.init = init

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

    const ufrag = genUfrag()

    // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md#browser-to-public-server
    const {
      peerConnection,
      muxerFactory
    } = await createDialerRTCPeerConnection('client', ufrag, {
      rtcConfiguration: typeof this.init.rtcConfiguration === 'function' ? await this.init.rtcConfiguration() : this.init.rtcConfiguration ?? {},
      dataChannel: this.init.dataChannel
    })

    try {
      return await connect(peerConnection, muxerFactory, ufrag, {
        role: 'client',
        log: this.log,
        logger: this.components.logger,
        events: this.metrics?.dialerEvents,
        signal: options.signal,
        remoteAddr: ma,
        dataChannel: this.init.dataChannel,
        upgrader: options.upgrader,
        peerId: this.components.peerId,
        remotePeer: theirPeerId,
        privateKey: this.components.privateKey
      })
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
