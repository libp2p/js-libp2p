import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import os from 'node:os'
import { TypedEventEmitter, setMaxListeners } from '@libp2p/interface'
import { ipPortToMultiaddr as toMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import duplex from 'it-ws/duplex'
import { pEvent } from 'p-event'
import * as ws from 'ws'
import { socketToMaConn } from './socket-to-conn.js'
import type { ComponentLogger, Logger, Listener, ListenerEvents, CreateListenerOptions, CounterGroup, MetricGroup, Metrics, TLSCertificate, TypedEventTarget, Libp2pEvents, Upgrader } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { EventEmitter } from 'node:events'
import type { Server } from 'node:http'
import type { Duplex } from 'node:stream'

export interface WebSocketListenerComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  metrics?: Metrics
}

export interface WebSocketListenerInit extends CreateListenerOptions {
  server?: Server
  inboundConnectionUpgradeTimeout?: number
  autoTLS?: boolean
  cert?: string
  key?: string
  http?: http.ServerOptions
  https?: http.ServerOptions
}

export interface WebSocketListenerMetrics {
  status?: MetricGroup
  errors?: CounterGroup
  events?: CounterGroup
}

export class WebSocketListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private readonly log: Logger
  private readonly logger: ComponentLogger
  private readonly server: net.Server
  private readonly wsServer: ws.WebSocketServer
  private readonly metrics: WebSocketListenerMetrics
  private readonly sockets: Set<net.Socket>
  private readonly upgrader: Upgrader
  private readonly inboundConnectionUpgradeTimeout: number
  private readonly httpOptions?: http.ServerOptions
  private readonly httpsOptions?: https.ServerOptions
  private http?: http.Server
  private https?: https.Server
  private addr?: string
  private listeningMultiaddr?: Multiaddr

  constructor (components: WebSocketListenerComponents, init: WebSocketListenerInit) {
    super()

    this.log = components.logger.forComponent('libp2p:websockets:listener')
    this.logger = components.logger
    this.upgrader = init.upgrader
    this.httpOptions = init.http
    this.httpsOptions = init.https
    this.inboundConnectionUpgradeTimeout = init.inboundConnectionUpgradeTimeout ?? 5000
    this.sockets = new Set()

    this.wsServer = new ws.WebSocketServer({
      noServer: true
    })
    this.wsServer.addListener('connection', this.onWsServerConnection.bind(this))

    components.metrics?.registerMetricGroup('libp2p_websockets_inbound_connections_total', {
      label: 'address',
      help: 'Current active connections in WebSocket listener',
      calculate: () => {
        if (this.addr == null) {
          return {}
        }

        return {
          [this.addr]: this.sockets.size
        }
      }
    })

    this.metrics = {
      status: components.metrics?.registerMetricGroup('libp2p_websockets_listener_status_info', {
        label: 'address',
        help: 'Current status of the WebSocket listener socket'
      }),
      errors: components.metrics?.registerMetricGroup('libp2p_websockets_listener_errors_total', {
        label: 'address',
        help: 'Total count of WebSocket listener errors by type'
      }),
      events: components.metrics?.registerMetricGroup('libp2p_websockets_listener_events_total', {
        label: 'address',
        help: 'Total count of WebSocket listener events by type'
      })
    }

    this.server = net.createServer(socket => {
      socket.once('data', buffer => {
        console.info('---> incoming packet')
try {
        // Pause the socket
        socket.pause()

        // Determine if this is an HTTP(s) request
        const byte = buffer[0]

        let server: EventEmitter | undefined = this.http

        if (byte === 22) {
          console.info('---> incoming https packet')
          server = this.https
        } else {
          console.info('---> incoming http packet')
        }

        if (server == null) {
          this.log.error('no appropriate listener configured for byte %d', byte)
          socket.destroy()
          return
        }

        // store the socket so we can close it when the listener closes
        this.sockets.add(socket)
        socket.on('close', () => {
          this.sockets.delete(socket)
        })

        // push the buffer back onto the front of the data stream
        socket.unshift(buffer)

        // emit the socket to the relevant server
        server.emit('connection', socket)

        // TODO: verify this
        // As of NodeJS 10.x the socket must be
        // resumed asynchronously or the socket
        // connection hangs, potentially crashing
        // the process. Prior to NodeJS 10.x
        // the socket may be resumed synchronously.
        process.nextTick(() => socket.resume())
      } catch (err) {
        console.error('error handling socket data', err)
      }
      })
    })

    if (init?.autoTLS === true) {
      components.events.addEventListener('certificate:provision', this.onCertificateProvision.bind(this))
      components.events.addEventListener('certificate:renew', this.onCertificateRenew.bind(this))
    }
  }

  onWsServerConnection (socket: ws.WebSocket, req: http.IncomingMessage): void {
    let addr: string | ws.AddressInfo | null

    try {
      if (req.socket.remoteAddress == null || req.socket.remotePort == null) {
        throw new Error('Remote connection did not have address and/or port')
      }

      addr = this.server.address()

      if (typeof addr === 'string') {
        throw new Error('Cannot listen on unix sockets')
      }

      if (addr == null) {
        throw new Error('Server was closing or not running')
      }
    } catch (err: any) {
      this.log.error('error obtaining remote socket address - %e', err)
      req.destroy(err)
      socket.close()
      return
    }

    const stream: DuplexWebSocket = {
      ...duplex(socket, {
        remoteAddress: req.socket.remoteAddress,
        remotePort: req.socket.remotePort
      }),
      localAddress: addr.address,
      localPort: addr.port
    }

    const maConn = socketToMaConn(stream, toMultiaddr(stream.remoteAddress ?? '', stream.remotePort ?? 0), {
      logger: this.logger,
      metrics: this.metrics?.events,
      metricPrefix: `${this.addr} `
    })
    this.log('new inbound connection %s', maConn.remoteAddr)

    const signal = AbortSignal.timeout(this.inboundConnectionUpgradeTimeout)
    setMaxListeners(Infinity, signal)

    this.upgrader.upgradeInbound(maConn, {
      signal
    })
      .catch(async err => {
        this.log.error('inbound connection failed to upgrade - %e', err)
        this.metrics.errors?.increment({ [`${this.addr} inbound_upgrade`]: true })

        await maConn.close()
          .catch(err => {
            this.log.error('inbound connection failed to close after upgrade failed', err)
            this.metrics.errors?.increment({ [`${this.addr} inbound_closing_failed`]: true })
          })
      })
  }

  onUpgrade (req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wsServer.handleUpgrade(req, socket, head, this.onWsServerConnection.bind(this))
  }

  async listen (ma: Multiaddr): Promise<void> {
    if (WebSockets.exactMatch(ma)) {
      this.http = http.createServer(this.httpOptions ?? {})
      this.http.addListener('upgrade', this.onUpgrade.bind(this))
    } else if (WebSocketsSecure.exactMatch(ma)) {
      this.https = https.createServer(this.httpsOptions ?? {})
      this.https.addListener('upgrade', this.onUpgrade.bind(this))
    }

    this.listeningMultiaddr = ma
    const { host, port } = ma.toOptions()
    this.addr = `${host}:${port}`

    this.server.listen(port)

    await new Promise<void>((resolve, reject) => {
      const onListening = (): void => {
        removeListeners()
        resolve()
      }
      const onError = (err: Error): void => {
        removeListeners()
        reject(err)
      }
      const removeListeners = (): void => {
        this.server.removeListener('listening', onListening)
        this.server.removeListener('error', onError)
      }

      this.server.addListener('listening', onListening)
      this.server.addListener('error', onError)
    })

    this.safeDispatchEvent('listening')
  }

  onCertificateProvision (event: CustomEvent<TLSCertificate>): void {
    if (this.https != null) {
      this.log('auto-tls certificate found but already listening on https')
      return
    }

    this.log('auto-tls certificate found, starting https server')
    this.https = https.createServer({
      ...this.httpsOptions,
      ...event.detail
    })
    this.https.addListener('upgrade', this.onUpgrade.bind(this))
    this.safeDispatchEvent('listening')
  }

  onCertificateRenew (event: CustomEvent<TLSCertificate>): void {
    // stop accepting new connections
    this.https?.close()
    this.https?.removeListener('upgrade', this.onUpgrade.bind(this))

    this.log('auto-tls certificate renews, restarting https server')
    this.https = https.createServer({
      ...this.httpsOptions,
      ...event.detail
    })
    this.https.addListener('upgrade', this.onUpgrade.bind(this))
  }

  async close (): Promise<void> {
    this.server.close()
    this.http?.close()
    this.https?.close()
    this.wsServer.close()

    this.http?.closeAllConnections()
    this.https?.closeAllConnections()

    ;[...this.sockets].forEach(socket => {
      socket.destroy()
    })

    await Promise.all([
      pEvent(this.server, 'close'),
      this.http == null ? null : pEvent(this.http, 'close'),
      this.https == null ? null : pEvent(this.https, 'close'),
      pEvent(this.wsServer, 'close')
    ])

    this.safeDispatchEvent('close')
  }

  getAddrs (): Multiaddr[] {
    console.info('getting ws addresses: http:', Boolean(this.http), 'https:', Boolean(this.https))

    const multiaddrs: Multiaddr[] = []
    const address = this.server.address()

    if (address == null) {
      throw new Error('Listener is not ready yet')
    }

    if (typeof address === 'string') {
      throw new Error('Wrong address type received - expected AddressInfo, got string - are you trying to listen on a unix socket?')
    }

    if (this.listeningMultiaddr == null) {
      throw new Error('Listener is not ready yet')
    }

    const protos = this.listeningMultiaddr.protos()

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (protos.some(proto => proto.code === protocols('ip4').code)) {
      const wsProto = protos.some(proto => proto.code === protocols('ws').code) ? '/ws' : '/wss'
      let m = this.listeningMultiaddr.decapsulate('tcp')
      m = m.encapsulate(`/tcp/${address.port}${wsProto}`)
      const options = m.toOptions()

      if (options.host === '0.0.0.0') {
        Object.values(os.networkInterfaces()).forEach(niInfos => {
          if (niInfos == null) {
            return
          }

          niInfos.forEach(ni => {
            if (ni.family === 'IPv4') {
              multiaddrs.push(multiaddr(`/ip${options.family}/${ni.address}/${options.transport}/${options.port}/ws`))

              if (this.https != null && WebSockets.exactMatch(m)) {
                multiaddrs.push(multiaddr(`/ip${options.family}/${ni.address}/${options.transport}/${options.port}/tls/ws`))
              }
            }
          })
        })
      } else {
        multiaddrs.push(m)
      }

      if (this.https != null && WebSockets.exactMatch(m)) {
        multiaddrs.push(
          m.decapsulate('/ws').encapsulate('/tls/ws')
        )
      }
    }

    console.info('ws addresses:\n', multiaddrs.map(ma => ma.toString()).join('\n'))

    return multiaddrs
  }
}

export function createListener (components: WebSocketListenerComponents, init: WebSocketListenerInit): Listener {
  return new WebSocketListener(components, init)
}
