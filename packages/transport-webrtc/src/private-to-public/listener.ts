import { createSocket } from 'node:dgram'
import { networkInterfaces } from 'node:os'
import { isIPv4, isIPv6 } from '@chainsafe/is-ip'
import { TypedEventEmitter } from '@libp2p/interface'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { IP4 } from '@multiformats/multiaddr-matcher'
import { sha256 } from 'multiformats/hashes/sha2'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
// @ts-expect-error no types
import stun from 'stun'
import { UFRAG_PREFIX } from './constants.js'
import { connect } from './utils/connect.js'
import { generateTransportCertificate } from './utils/generate-certificates.js'
import { type DirectRTCPeerConnection, createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import type { DataChannelOptions, TransportCertificate } from '../index.js'
import type { PeerId, ListenerEvents, Listener, Upgrader, ComponentLogger, Logger, CounterGroup, Metrics, ConnectionHandler } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Socket, RemoteInfo } from 'node:dgram'
import type { AddressInfo } from 'node:net'

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
  rtcConfiguration?: RTCConfiguration
}

export interface WebRTCListenerMetrics {
  listenerEvents: CounterGroup
}

const UDP_PROTOCOL = protocols('udp')
const IP4_PROTOCOL = protocols('ip4')
const IP6_PROTOCOL = protocols('ip6')

export class WebRTCDirectListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private socket?: Socket
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

    const port = parseInt(parts
      .filter(([code, value]) => code === UDP_PROTOCOL.code)
      .pop()?.[1] ?? '')

    if (isNaN(port)) {
      throw new Error('UDP port must be specified in webrtc-direct mulitaddr')
    }

    this.socket = createSocket({
      type: `udp${ipVersion}`,
      reuseAddr: true
    })

    try {
      this.socket.bind(port, host)
      await pEvent(this.socket, 'listening')
    } catch (err) {
      this.socket.close()
      throw err
    }

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

    const address = this.socket.address()

    getNetworkAddresses(address, ipVersion).forEach((ma) => {
      this.multiaddrs.push(multiaddr(`${ma}/webrtc-direct/certhash/${certificate.certhash}`))
    })

    this.socket.on('message', (msg, rinfo) => {
      try {
        this.log('incoming STUN packet from %o', rinfo)
        const response = stun.decode(msg)
        // TODO: this needs to be rate limited keyed by the remote host to
        // prevent a DOS attack
        this.incomingConnection(response, rinfo, certificate).catch(err => {
          this.log.error('could not process incoming STUN data from %o', rinfo, err)
        })
      } catch (err) {
        this.log.error('could not process incoming STUN data from %o', rinfo, err)
      }
    })

    this.socket.on('close', () => {
      this.safeDispatchEvent('close')
    })

    this.safeDispatchEvent('listening')
  }

  private async incomingConnection (stunMessage: any, rinfo: RemoteInfo, certificate: TransportCertificate): Promise<void> {
    const usernameAttribute = stunMessage.getAttribute(stun.constants.STUN_ATTR_USERNAME)
    const username: string | undefined = usernameAttribute?.value?.toString()

    if (username == null || !username.startsWith(UFRAG_PREFIX)) {
      this.log.trace('ufrag missing from incoming STUN message from %s:%s', rinfo.address, rinfo.port)
      return
    }

    const ufrag = username.split(':')[0]
    const key = `${rinfo.address}:${rinfo.port}:${ufrag}`
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
      const conn = await connect(peerConnection, ufrag, {
        role: 'initiator',
        log: this.log,
        logger: this.components.logger,
        metrics: this.components.metrics,
        events: this.metrics?.listenerEvents,
        signal: AbortSignal.timeout(HANDSHAKE_TIMEOUT_MS),
        remoteAddr: multiaddr(`/${rinfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${rinfo.address}/udp/${rinfo.port}`),
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

    await Promise.all([
      new Promise<void>((resolve) => {
        if (this.socket == null) {
          resolve()
          return
        }

        this.socket.close(() => {
          resolve()
        })
      }),
      // RTCPeerConnections will be removed from the connections map when their
      // connection state changes to 'closed'/'disconnected'/'failed
      pWaitFor(() => {
        return this.connections.size === 0
      })
    ])
  }
}

function getNetworkAddresses (host: AddressInfo, version: 4 | 6): string[] {
  if (host.address === '0.0.0.0' || host.address === '::1') {
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
      .map(address => `/ip${version}/${address}/udp/${host.port}`)
  }

  return [
    `/ip${version}/${host.address}/udp/${host.port}`
  ]
}
