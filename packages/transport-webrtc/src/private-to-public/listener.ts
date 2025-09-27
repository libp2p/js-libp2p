import { isIPv4 } from '@chainsafe/is-ip'
import { InvalidParametersError } from '@libp2p/interface'
import { getNetConfig, getThinWaistAddresses } from '@libp2p/utils'
import { CODE_CERTHASH, CODE_WEBRTC_DIRECT, multiaddr } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import getPort from 'get-port'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import pWaitFor from 'p-wait-for'
import { connect } from './utils/connect.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import { stunListener } from './utils/stun-listener.js'
import type { DataChannelOptions, TransportCertificate } from '../index.js'
import type { WebRTCDirectTransportCertificateEvents } from './transport.js'
import type { DirectRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import type { StunServer } from './utils/stun-listener.js'
import type { PeerId, ListenerEvents, Listener, Upgrader, ComponentLogger, Logger, CounterGroup, Metrics, PrivateKey } from '@libp2p/interface'
import type { Keychain } from '@libp2p/keychain'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Datastore } from 'interface-datastore'
import type { TypedEventTarget } from 'main-event'

export interface WebRTCDirectListenerComponents {
  peerId: PeerId
  privateKey: PrivateKey
  logger: ComponentLogger
  upgrader: Upgrader
  keychain?: Keychain
  datastore: Datastore
  metrics?: Metrics
  events?: CounterGroup
}

export interface WebRTCDirectListenerInit {
  upgrader: Upgrader
  certificate: TransportCertificate
  maxInboundStreams?: number
  dataChannel?: DataChannelOptions
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  emitter: TypedEventTarget<WebRTCDirectTransportCertificateEvents>
}

export interface WebRTCListenerMetrics {
  listenerEvents: CounterGroup
}

interface UDPMuxServer {
  server: Promise<StunServer>
  isIPv4: boolean
  isIPv6: boolean
  port: number
  owner: WebRTCDirectListener
  peerId: PeerId
}

let UDP_MUX_LISTENERS: UDPMuxServer[] = []

export class WebRTCDirectListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private listeningMultiaddr?: Multiaddr
  private certificate: TransportCertificate
  private stunServer?: StunServer
  private readonly connections: Map<string, DirectRTCPeerConnection>
  private readonly log: Logger
  private readonly init: WebRTCDirectListenerInit
  private readonly components: WebRTCDirectListenerComponents
  private readonly metrics?: WebRTCListenerMetrics
  private readonly shutdownController: AbortController

  constructor (components: WebRTCDirectListenerComponents, init: WebRTCDirectListenerInit) {
    super()

    this.init = init
    this.components = components
    this.connections = new Map()
    this.log = components.logger.forComponent('libp2p:webrtc-direct:listener')
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
    this.certificate = init.certificate

    if (components.metrics != null) {
      this.metrics = {
        listenerEvents: components.metrics.registerCounterGroup('libp2p_webrtc-direct_listener_events_total', {
          label: 'event',
          help: 'Total count of WebRTC-direct listen events by type'
        })
      }
    }

    // inform the transport manager our addresses have changed
    init.emitter.addEventListener('certificate:renew', evt => {
      this.log('received new TLS certificate', evt.detail.certhash)
      this.certificate = evt.detail
      this.safeDispatchEvent('listening')
    })
  }

  async listen (ma: Multiaddr): Promise<void> {
    const { host, port, type, protocol } = getNetConfig(ma)

    if (port == null || protocol !== 'udp' || (type !== 'ip4' && type !== 'ip6')) {
      throw new InvalidParametersError(`Multiaddr ${ma} was not an IPv4 or IPv6 address or was missing a UDP port`)
    }

    let udpMuxServer: UDPMuxServer | undefined

    if (port !== 0) {
      // libjuice binds to all interfaces (IPv4/IPv6) for a given port so if we
      // want to listen on a specific port, and there's already a mux listener
      // for that port for the other family started by this node, we should
      // reuse it
      udpMuxServer = UDP_MUX_LISTENERS.find(s => s.port === port)

      // make sure the port is free for the given family
      if (udpMuxServer != null && ((udpMuxServer.isIPv4 && type === 'ip4') || (udpMuxServer.isIPv6 && type === 'ip6'))) {
        throw new InvalidParametersError(`There is already a listener for ${host}:${port}`)
      }

      // check that we own the mux server
      if (udpMuxServer != null && !udpMuxServer.peerId.equals(this.components.peerId)) {
        throw new InvalidParametersError(`Another peer is already performing UDP mux on ${host}:${port}`)
      }
    }

    // start the mux server if we don't have one already
    if (udpMuxServer == null) {
      this.log('starting UDP mux server on %s:%p', host, port)
      udpMuxServer = this.startUDPMuxServer(host, port, type === 'ip4' ? 4 : 6)
      UDP_MUX_LISTENERS.push(udpMuxServer)
    }

    if (type === 'ip4') {
      udpMuxServer.isIPv4 = true
    } else if (type === 'ip6') {
      udpMuxServer.isIPv6 = true
    }

    this.stunServer = await udpMuxServer.server
    this.listeningMultiaddr = ma
    this.safeDispatchEvent('listening')
  }

  private startUDPMuxServer (host: string, port: number, family: 4 | 6): UDPMuxServer {
    return {
      peerId: this.components.peerId,
      owner: this,
      port,
      isIPv4: family === 4,
      isIPv6: family === 6,
      server: Promise.resolve()
        .then(async (): Promise<StunServer> => {
          if (port === 0) {
            // libjuice doesn't map 0 to a random free port so we have to do it
            // ourselves
            this.log.trace('searching for free port')
            port = await getPort()
            this.log.trace('listening on free port %d', port)
          }

          return stunListener(host, port, this.log, (ufrag, remoteHost, remotePort) => {
            const signal = this.components.upgrader.createInboundAbortSignal(this.shutdownController.signal)

            this.incomingConnection(ufrag, remoteHost, remotePort, signal)
              .catch(err => {
                this.log.error('error processing incoming STUN request - %e', err)
              })
              .finally(() => {
                signal.clear()
              })
          })
        })
    }
  }

  private async incomingConnection (ufrag: string, remoteHost: string, remotePort: number, signal: AbortSignal): Promise<void> {
    const key = `${remoteHost}:${remotePort}:${ufrag}`
    let peerConnection = this.connections.get(key)

    if (peerConnection != null) {
      this.log.trace('already got peer connection for %s', key)
      return
    }

    this.log('create peer connection for %s', key)

    // do not create RTCPeerConnection objects if the signal has aborted already
    signal.throwIfAborted()

    // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md#browser-to-public-server
    const results = await createDialerRTCPeerConnection('server', ufrag, {
      rtcConfiguration: this.init.rtcConfiguration,
      certificate: this.certificate,
      events: this.metrics?.listenerEvents,
      dataChannel: this.init.dataChannel
    })
    peerConnection = results.peerConnection

    this.connections.set(key, peerConnection)

    peerConnection.addEventListener('connectionstatechange', () => {
      switch (peerConnection.connectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
          this.connections.delete(key)
          break
        default:
          break
      }
    })

    try {
      await connect(peerConnection, results.muxerFactory, ufrag, {
        role: 'server',
        log: this.log,
        logger: this.components.logger,
        events: this.metrics?.listenerEvents,
        signal,
        remoteAddr: multiaddr(`/ip${isIPv4(remoteHost) ? 4 : 6}/${remoteHost}/udp/${remotePort}/webrtc-direct`),
        dataChannel: this.init.dataChannel,
        upgrader: this.init.upgrader,
        peerId: this.components.peerId,
        privateKey: this.components.privateKey
      })
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  getAddrs (): Multiaddr[] {
    if (this.stunServer == null) {
      return []
    }

    const address = this.stunServer.address()

    return getThinWaistAddresses(this.listeningMultiaddr, address.port).map(ma => {
      return ma.encapsulate(`/webrtc-direct/certhash/${this.certificate?.certhash}`)
    })
  }

  updateAnnounceAddrs (multiaddrs: Multiaddr[]): void {
    for (let i = 0; i < multiaddrs.length; i++) {
      let ma = multiaddrs[i]

      if (!WebRTCDirect.exactMatch(ma)) {
        continue
      }

      // add the certhash if it is missing
      const components = ma.getComponents()

      for (let j = 0; j < components.length; j++) {
        if (components[j].code !== CODE_WEBRTC_DIRECT) {
          continue
        }

        const certhashIndex = j + 1

        if (components[certhashIndex] == null || components[certhashIndex].code !== CODE_CERTHASH) {
          components.splice(certhashIndex, 0, {
            code: CODE_CERTHASH,
            name: 'certhash',
            value: this.certificate?.certhash
          })

          ma = multiaddr(components)
          multiaddrs[i] = ma
        }
      }
    }
  }

  async close (): Promise<void> {
    // stop our UDP mux listeners
    await Promise.all(
      UDP_MUX_LISTENERS
        .filter(listener => listener.owner === this)
        .map(async listener => {
          const server = await listener.server
          await server.close()
        })
    )

    // remove our stopped UDP mux listeners
    UDP_MUX_LISTENERS = UDP_MUX_LISTENERS.filter(listener => listener.owner !== this)

    // close existing connections
    for (const connection of this.connections.values()) {
      connection.close()
    }

    // stop any in-progress incoming dials
    this.shutdownController.abort()

    // RTCPeerConnections will be removed from the connections map when their
    // connection state changes to 'closed'/'disconnected'/'failed
    await pWaitFor(() => {
      return this.connections.size === 0
    })

    this.safeDispatchEvent('close')
  }
}
