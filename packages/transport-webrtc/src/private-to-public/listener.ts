
import { networkInterfaces } from 'node:os'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { TypedEventEmitter } from '@libp2p/interface'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { IP4 } from '@multiformats/multiaddr-matcher'
import getPort from 'get-port'
import { sha256 } from 'multiformats/hashes/sha2'
import pWaitFor from 'p-wait-for'
import { connect } from './utils/connect.js'
import { generateTransportCertificate } from './utils/generate-certificates.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import { stunListener } from './utils/stun-listener.js'
import type { DirectRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import type { StunServer } from './utils/stun-listener.js'
import type { DataChannelOptions, TransportCertificate } from '../index.js'
import type { PeerId, ListenerEvents, Listener, Upgrader, ComponentLogger, Logger, CounterGroup, Metrics, ConnectionHandler } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * The time to wait, in milliseconds, for the data channel handshake to complete
 */
const HANDSHAKE_TIMEOUT_MS = 10_000

export interface WebRTCDirectListenerComponents {
  peerId: PeerId
  logger: ComponentLogger
  metrics?: Metrics
}

export interface WebRTCDirectListenerInit {
  handler?: ConnectionHandler
  upgrader: Upgrader
  certificates?: TransportCertificate[]
  maxInboundStreams?: number
  dataChannel?: DataChannelOptions
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)
  useLibjuice?: boolean
}

export interface WebRTCListenerMetrics {
  listenerEvents: CounterGroup
}

const UDP_PROTOCOL = protocols('udp')
const IP4_PROTOCOL = protocols('ip4')
const IP6_PROTOCOL = protocols('ip6')

export class WebRTCDirectListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private server?: StunServer
  private readonly multiaddrs: Multiaddr[]
  private certificate?: TransportCertificate
  private readonly connections: Map<string, DirectRTCPeerConnection>
  private readonly log: Logger
  private readonly init: WebRTCDirectListenerInit
  private readonly components: WebRTCDirectListenerComponents
  private readonly metrics?: WebRTCListenerMetrics

  constructor (components: WebRTCDirectListenerComponents, init: WebRTCDirectListenerInit) {
    super()

    this.init = init
    this.components = components
    this.multiaddrs = []
    this.connections = new Map()
    this.log = components.logger.forComponent('libp2p:webrtc-direct:listener')
    this.certificate = init.certificates?.[0]

    if (components.metrics != null) {
      this.metrics = {
        listenerEvents: components.metrics.registerCounterGroup('libp2p_webrtc-direct_listener_events_total', {
          label: 'event',
          help: 'Total count of WebRTC-direct listen events by type'
        })
      }
    }
  }

  async listen (ma: Multiaddr): Promise<void> {
    const parts = ma.stringTuples()
    const ipVersion = IP4.matches(ma) ? 4 : 6
    const host = parts
      .filter(([code]) => code === IP4_PROTOCOL.code)
      .pop()?.[1] ?? parts
      .filter(([code]) => code === IP6_PROTOCOL.code)
      .pop()?.[1]

    if (host == null) {
      throw new Error('IP4/6 host must be specified in webrtc-direct mulitaddr')
    }
    let port = parseInt(parts
      .filter(([code, value]) => code === UDP_PROTOCOL.code)
      .pop()?.[1] ?? '')

    if (isNaN(port)) {
      throw new Error('UDP port must be specified in webrtc-direct mulitaddr')
    }

    if (port === 0 && this.init.useLibjuice !== false) {
      // libjuice doesn't map 0 to a random free port so we have to do it
      // ourselves
      port = await getPort()
    }

    this.server = await stunListener(host, port, ipVersion, this.log, (ufrag, pwd, remoteHost, remotePort) => {
      this.incomingConnection(ufrag, pwd, remoteHost, remotePort)
        .catch(err => {
          this.log.error('error processing incoming STUN request', err)
        })
    }, {
      useLibjuice: this.init.useLibjuice
    })

    let certificate = this.certificate

    if (certificate == null) {
      const keyPair = await crypto.subtle.generateKey({
        name: 'ECDSA',
        namedCurve: 'P-256'
      }, true, ['sign', 'verify'])

      certificate = this.certificate = await generateTransportCertificate(keyPair, {
        days: 365
      })
    }

    const address = this.server.address()

    getNetworkAddresses(address.address, address.port, ipVersion).forEach((ma) => {
      this.multiaddrs.push(multiaddr(`${ma}/webrtc-direct/certhash/${certificate.certhash}`))
    })

    this.safeDispatchEvent('listening')
  }

  private async incomingConnection (ufrag: string, pwd: string, remoteHost: string, remotePort: number): Promise<void> {
    const key = `${remoteHost}:${remotePort}:${ufrag}`
    let peerConnection = this.connections.get(key)

    if (peerConnection != null) {
      this.log('already got peer connection for', key)
      return
    }

    this.log('create peer connection for', key)

    // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md#browser-to-public-server
    peerConnection = await createDialerRTCPeerConnection('NodeB', ufrag, this.init.rtcConfiguration, this.certificate)

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
      const conn = await connect(peerConnection, ufrag, pwd, {
        role: 'initiator',
        log: this.log,
        logger: this.components.logger,
        metrics: this.components.metrics,
        events: this.metrics?.listenerEvents,
        signal: AbortSignal.timeout(HANDSHAKE_TIMEOUT_MS),
        remoteAddr: multiaddr(`/ip${isIPv4(remoteHost) ? 4 : 6}/${remoteHost}/udp/${remotePort}`),
        hashCode: sha256.code,
        dataChannel: this.init.dataChannel,
        upgrader: this.init.upgrader,
        peerId: this.components.peerId,
        handler: this.init.handler
      })

      this.safeDispatchEvent('connection', { detail: conn })
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  getAddrs (): Multiaddr[] {
    return this.multiaddrs
  }

  async close (): Promise<void> {
    for (const connection of this.connections.values()) {
      connection.close()
    }

    await this.server?.close()

    // RTCPeerConnections will be removed from the connections map when their
    // connection state changes to 'closed'/'disconnected'/'failed
    await pWaitFor(() => {
      return this.connections.size === 0
    })

    this.safeDispatchEvent('close')
  }
}

function getNetworkAddresses (host: string, port: number, version: 4 | 6): string[] {
  if (host === '0.0.0.0' || host === '::1') {
    // return all ip4 interfaces
    return Object.entries(networkInterfaces())
      .flatMap(([_, addresses]) => addresses)
      .map(address => address?.address)
      .filter(address => {
        if (address == null) {
          return false
        }

        if (version === 4) {
          return isIPv4(address)
        }

        if (version === 6) {
          return isIPv6(address)
        }

        return false
      })
      .map(address => `/ip${version}/${address}/udp/${port}`)
  }

  return [
    `/ip${version}/${host}/udp/${port}`
  ]
}
