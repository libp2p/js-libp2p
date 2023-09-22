import dgram from 'dgram'
import { EventEmitter, CustomEvent } from '@libp2p/interface/events'
import { logger } from '@libp2p/logger'
import type { MultiaddrConnection, Connection } from '@libp2p/interface/connection'
import type { CounterGroup, MetricGroup, Metrics } from '@libp2p/interface/metrics'
import type { Listener, ListenerEvents, Upgrader } from '@libp2p/interface/transport'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { base64url } from 'multiformats/bases/base64'
import { base16upper } from 'multiformats/bases/base16'
import { RTCPeerConnection  } from '../webrtc/index.js'
import * as Digest from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { decode, ATTR } from './utils/stun.js'

const log = logger('libp2p:webrtc:listener')

/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged
 */
async function attemptClose (maConn: MultiaddrConnection): Promise<void> {
  try {
    await maConn.close()
  } catch (err: any) {
    log.error('an error occurred closing the connection', err)
    maConn.abort(err)
  }
}

export interface CloseServerOnMaxConnectionsOpts {
  /** Server listens once connection count is less than `listenBelow` */
  listenBelow: number
  /** Close server once connection count is greater than or equal to `closeAbove` */
  closeAbove: number
  onListenError?: (err: Error) => void
}

interface WebRTCDirectListenerInit {
  handler?: (conn: Connection) => void
  upgrader: Upgrader

  reuseAddr?: boolean
  ipv6Only?: boolean
  recvBufferSize?: number
  sendBufferSize?: number
  lookup?: () => {}

  metrics?: Metrics
}

const SERVER_STATUS_UP = 1
const SERVER_STATUS_DOWN = 0

export interface WebRTCDirectListenerMetrics {
  status: MetricGroup
  errors: CounterGroup
  events: CounterGroup
}

export class WebRTCDirectListener extends EventEmitter<ListenerEvents> implements Listener {
  private socket?: dgram.Socket
  /** Keep track of open connections to destroy in case of timeout */
  private readonly connections = new Set<MultiaddrConnection>()
  private metrics?: WebRTCDirectListenerMetrics
  private shutDownController?: AbortController
  private addr?: string

  private init: WebRTCDirectListenerInit
  private certificates: RTCCertificate[]
  private peerConnections: Map<string, RTCPeerConnection>

  constructor (init: WebRTCDirectListenerInit) {
    super()

    this.init = init
    this.certificates = []
    this.peerConnections = new Map()
  }
/*
  private onSocket (socket: net.Socket): void {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => {
      log('socket error', err)
      this.metrics?.events.increment({ [`${this.addr} error`]: true })
    })

    let maConn: MultiaddrConnection
    try {
      maConn = toMultiaddrConnection(socket, {
        listeningAddr: this.status.started ? this.status.listeningAddr : undefined,
        socketInactivityTimeout: this.context.socketInactivityTimeout,
        socketCloseTimeout: this.context.socketCloseTimeout,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `
      })
    } catch (err) {
      log.error('inbound connection failed', err)
      this.metrics?.errors.increment({ [`${this.addr} inbound_to_connection`]: true })
      return
    }

    log('new inbound connection %s', maConn.remoteAddr)
    try {
      this.context.upgrader.upgradeInbound(maConn)
        .then((conn) => {
          log('inbound connection upgraded %s', maConn.remoteAddr)
          this.connections.add(maConn)

          socket.once('close', () => {
            this.connections.delete(maConn)

            if (
              this.context.closeServerOnMaxConnections != null &&
              this.connections.size < this.context.closeServerOnMaxConnections.listenBelow
            ) {
              // The most likely case of error is if the port taken by this application is binded by
              // another process during the time the server if closed. In that case there's not much
              // we can do. netListen() will be called again every time a connection is dropped, which
              // acts as an eventual retry mechanism. onListenError allows the consumer act on this.
              this.netListen().catch(e => {
                log.error('error attempting to listen server once connection count under limit', e)
                this.context.closeServerOnMaxConnections?.onListenError?.(e as Error)
              })
            }
          })

          if (this.context.handler != null) {
            this.context.handler(conn)
          }

          if (
            this.context.closeServerOnMaxConnections != null &&
            this.connections.size >= this.context.closeServerOnMaxConnections.closeAbove
          ) {
            this.netClose()
          }

          this.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn }))
        })
        .catch(async err => {
          log.error('inbound connection failed', err)
          this.metrics?.errors.increment({ [`${this.addr} inbound_upgrade`]: true })

          await attemptClose(maConn)
        })
        .catch(err => {
          log.error('closing inbound connection failed', err)
        })
    } catch (err) {
      log.error('inbound connection failed', err)

      attemptClose(maConn)
        .catch(err => {
          log.error('closing inbound connection failed', err)
          this.metrics?.errors.increment({ [`${this.addr} inbound_closing_failed`]: true })
        })
    }
  }
*/
  getAddrs (): Multiaddr[] {
    const addressInfo = this.socket?.address()

    if (addressInfo == null) {
      return []
    }

    const certs = this.certificates.map(cert => {
      const encoded = `F${cert.getFingerprints()[0].value}`.replaceAll(':', '')
      const buf = base16upper.decode(encoded)
      const digest = Digest.create(sha256.code, buf)

      return base64url.encode(digest.bytes)
    })

    return [
      multiaddr(`/${addressInfo.family === 'IPv4' ? 'ip4' : 'ip6'}/${addressInfo.address}/udp/${addressInfo.port}/webrtc-direct/${certs.map(cert => `/certhash/${cert}`)}`)
    ]
  }

  async listen (ma: Multiaddr): Promise<void> {
    const addr = ma.nodeAddress()
    let type: 'udp4' | 'udp6'

    if (addr.family === 4) {
      type = 'udp4'
    } else if (addr.family === 6) {
      type = 'udp6'
    } else {
      throw new Error('can only listen on ip4 or ip6 addresses')
    }

    this.shutDownController = new AbortController()

    const socket = this.socket = dgram.createSocket({
      type,
      reuseAddr: this.init.reuseAddr,
      ipv6Only: this.init.ipv6Only,
      recvBufferSize: this.init.recvBufferSize,
      sendBufferSize: this.init.sendBufferSize,
      lookup: this.init.lookup,
      signal: this.shutDownController.signal
    }, this._onMessage.bind(this))

    this.socket.on('error', (err) => {
      log('socket error', err)
      this.metrics?.events.increment({ [`${this.addr} error`]: true })
      this.dispatchEvent(new CustomEvent('close'))
    })

    this.socket.on('close', () => {
      this.metrics?.status.update({
        [`${this.addr}`]: SERVER_STATUS_DOWN
      })
      this.dispatchEvent(new CustomEvent('close'))
    })

    this.socket.on('listening', () => {
      // we are listening, register metrics for our port
      const address = socket.address()

      if (address == null) {
        this.addr = 'unknown'
      } else {
        this.addr = `${address.address}:${address.port}`
      }

      if (this.init.metrics != null) {
        this.init.metrics.registerMetricGroup('libp2p_tcp_inbound_connections_total', {
          label: 'address',
          help: 'Current active connections in TCP listener',
          calculate: () => {
            return {
              [`${this.addr}`]: this.connections.size
            }
          }
        })

        this.metrics = {
          status: this.init.metrics.registerMetricGroup('libp2p_tcp_listener_status_info', {
            label: 'address',
            help: 'Current status of the WebRTCDirect listener socket'
          }),
          errors: this.init.metrics.registerMetricGroup('libp2p_tcp_listener_errors_total', {
            label: 'address',
            help: 'Total count of WebRTCDirect listener errors by type'
          }),
          events: this.init.metrics.registerMetricGroup('libp2p_tcp_listener_events_total', {
            label: 'address',
            help: 'Total count of WebRTCDirect listener events by type'
          })
        }

        this.metrics?.status.update({
          [this.addr]: SERVER_STATUS_UP
        })
      }

      this.dispatchEvent(new CustomEvent('listening'))
    })

    this.socket.bind(addr.port, addr.address)

    this.certificates = [
      await RTCPeerConnection.generateCertificate({
        name: 'ECDSA',
        namedCurve: 'P-256'
      })
    ]
  }

  private _onMessage (message: Buffer, rinfo: RemoteInfo) {
    Promise.resolve().then(async () => {
    const stun = decode(message)

    if (stun == null) {
      console.info('wat bad stun')
      log.error('could not decode incoming STUN package')
      return
    }

    const ufrag = stun.attrs[ATTR.USERNAME].toString().split(':')[0]

    const key = `${rinfo.address}:${rinfo.port}:${ufrag}`
    let peerConnection = this.peerConnections.get(key)

    if (peerConnection != null) {
      return
    }
    peerConnection = new RTCPeerConnection({
      certificates: this.certificates
    })

    this.peerConnections.set(key, peerConnection)

    const offer = `v=0
o=rtc 409579682 0 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=msid-semantic:WMS *
a=setup:actpass
a=ice-ufrag:${ufrag}
a=ice-pwd:${ufrag}
a=ice-options:ice2,trickle
a=fingerprint:SHA-256 89:3E:15:3A:40:EC:55:5B:8C:5A:7A:D5:D9:3A:F7:77:A7:EC:2D:DE:2F:CF:CB:CD:07:87:78:14:7C:D0:13:DD
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN ${rinfo.family === 'IPv4' ? 'IP4' : 'IP6'} ${rinfo.address} ${rinfo.port}
a=mid:0
a=sendrecv
a=sctp-port:5000
a=max-message-size:16384
`

      await peerConnection.setRemoteDescription({ type: 'offer', sdp: offer })

      const answer = await peerConnection.createAnswer()
      answer.sdp = answer.sdp
        ?.replace(/\na=max-message-size:\d+\r\n/, '\na=max-message-size:16384\r\n')

      await peerConnection.setLocalDescription(answer)

      peerConnection.ondatachannel = (channel) => {
        // perform noise handshake over first opened channel
      }
    })
  }

  async close (): Promise<void> {
    await Promise.all(
      Array.from(this.connections.values()).map(async maConn => { await attemptClose(maConn) })
    )

    // close peer connections
    for (const connection of this.peerConnections.values()) {
      connection.close()
    }

    // close UDP socket
    this.shutDownController?.abort()
  }
}

interface RemoteInfo {
  address: string
  family: 'IPv4' | 'IPv6'
  port: number
  size: number
}
