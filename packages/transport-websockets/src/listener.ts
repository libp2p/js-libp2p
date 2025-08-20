import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import { getThinWaistAddresses } from '@libp2p/utils/get-thin-waist-addresses'
import { ipPortToMultiaddr as toMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import duplex from 'it-ws/duplex'
import { TypedEventEmitter, setMaxListeners } from 'main-event'
import { pEvent } from 'p-event'
import * as ws from 'ws'
import { socketToMaConn } from './socket-to-conn.js'
import type { ComponentLogger, Logger, Listener, ListenerEvents, CreateListenerOptions, CounterGroup, MetricGroup, Metrics, TLSCertificate, Libp2pEvents, Upgrader, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'
import type { TypedEventTarget } from 'main-event'
import type { EventEmitter } from 'node:events'
import type { Server } from 'node:http'
import type { Duplex } from 'node:stream'
import type tls from 'node:tls'

export interface WebSocketListenerComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  metrics?: Metrics
}

export interface WebSocketListenerInit extends CreateListenerOptions {
  server?: Server
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
  private readonly httpOptions?: http.ServerOptions
  private readonly httpsOptions?: https.ServerOptions
  private readonly shutdownController: AbortController
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
    this.httpsOptions = init.https ?? init.http
    this.sockets = new Set()
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

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

    this.server = net.createServer({
      pauseOnConnect: true
    }, (socket) => {
      this.onSocketConnection(socket)
        .catch(err => {
          this.log.error('error handling socket - %e', err)
          socket.destroy()
        })
    })

    components.events.addEventListener('certificate:provision', this.onCertificateProvision.bind(this))
    components.events.addEventListener('certificate:renew', this.onCertificateRenew.bind(this))
  }

  async onSocketConnection (socket: net.Socket): Promise<void> {
    this.metrics.events?.increment({ [`${this.addr} connection`]: true })

    let buffer = socket.read(1)

    if (buffer == null) {
      await pEvent(socket, 'readable')
      buffer = socket.read(1)
    }

    // determine if this is an HTTP(s) request
    const byte = buffer[0]
    let server: EventEmitter | undefined = this.http

    // https://github.com/mscdex/httpolyglot/blob/1c6c4af65f4cf95a32c918d0fdcc532e0c095740/lib/index.js#L92
    if (byte < 32 || byte >= 127) {
      server = this.https
    }

    if (server == null) {
      this.log.error('no appropriate listener configured for byte %d', byte)
      socket.destroy()
      return
    }

    // store the socket so we can close it when the listener closes
    this.sockets.add(socket)

    socket.on('close', () => {
      this.metrics.events?.increment({ [`${this.addr} close`]: true })
      this.sockets.delete(socket)
    })

    socket.on('error', (err) => {
      this.log.error('socket error - %e', err)
      this.metrics.events?.increment({ [`${this.addr} error`]: true })
      socket.destroy()
    })

    socket.once('timeout', () => {
      this.metrics.events?.increment({ [`${this.addr} timeout`]: true })
    })

    socket.once('end', () => {
      this.metrics.events?.increment({ [`${this.addr} end`]: true })
    })

    // re-queue first data chunk
    socket.unshift(buffer)

    // hand the socket off to the appropriate server
    server.emit('connection', socket)
  }

  onWsServerConnection (socket: ws.WebSocket, req: http.IncomingMessage): void {
    let addr: string | ws.AddressInfo | null

    try {
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
        remoteAddress: req.socket.remoteAddress ?? '0.0.0.0',
        remotePort: req.socket.remotePort ?? 0
      }),
      localAddress: addr.address,
      localPort: addr.port
    }

    let maConn: MultiaddrConnection

    try {
      maConn = socketToMaConn(stream, toMultiaddr(stream.remoteAddress ?? '', stream.remotePort ?? 0), {
        logger: this.logger,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `
      })
    } catch (err: any) {
      this.log.error('inbound connection failed', err)
      this.metrics.errors?.increment({ [`${this.addr} inbound_to_connection`]: true })
      socket.close()
      return
    }

    this.log('new inbound connection %s', maConn.remoteAddr)

    this.upgrader.upgradeInbound(maConn, {
      signal: this.shutdownController.signal
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

  onTLSClientError (err: Error, socket: tls.TLSSocket): void {
    this.log.error('TLS client error - %e', err)
    socket.destroy()
  }

  async listen (ma: Multiaddr): Promise<void> {
    if (WebSockets.exactMatch(ma)) {
      this.http = http.createServer(this.httpOptions ?? {}, this.httpRequestHandler.bind(this))
      this.http.addListener('upgrade', this.onUpgrade.bind(this))
    } else if (WebSocketsSecure.exactMatch(ma)) {
      this.https = https.createServer(this.httpsOptions ?? {}, this.httpRequestHandler.bind(this))
      this.https.addListener('upgrade', this.onUpgrade.bind(this))
      this.https.addListener('tlsClientError', this.onTLSClientError.bind(this))
    }

    const options = ma.toOptions()
    this.addr = `${options.host}:${options.port}`

    this.server.listen({
      ...options,
      ipv6Only: options.family === 6
    })

    await new Promise<void>((resolve, reject) => {
      const onListening = (): void => {
        removeListeners()
        resolve()
      }
      const onError = (err: Error): void => {
        this.metrics.errors?.increment({ [`${this.addr} listen_error`]: true })
        removeListeners()
        reject(err)
      }
      const onDrop = (): void => {
        this.metrics.events?.increment({ [`${this.addr} drop`]: true })
      }
      const removeListeners = (): void => {
        this.server.removeListener('listening', onListening)
        this.server.removeListener('error', onError)
        this.server.removeListener('drop', onDrop)
      }

      this.server.addListener('listening', onListening)
      this.server.addListener('error', onError)
      this.server.addListener('drop', onDrop)
    })

    this.listeningMultiaddr = ma
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
    }, this.httpRequestHandler.bind(this))
    this.https.addListener('upgrade', this.onUpgrade.bind(this))
    this.https.addListener('tlsClientError', this.onTLSClientError.bind(this))

    this.safeDispatchEvent('listening')
  }

  onCertificateRenew (event: CustomEvent<TLSCertificate>): void {
    // stop accepting new connections
    this.https?.close()

    this.log('auto-tls certificate renewed, restarting https server')
    this.https = https.createServer({
      ...this.httpsOptions,
      ...event.detail
    }, this.httpRequestHandler.bind(this))
    this.https.addListener('upgrade', this.onUpgrade.bind(this))
    this.https.addListener('tlsClientError', this.onTLSClientError.bind(this))
  }

  async close (): Promise<void> {
    this.server.close()
    this.http?.close()
    this.https?.close()
    this.wsServer.close()

    // close all connections, must be done after closing the server to prevent
    // race conditions where a new connection is accepted while we are closing
    // the existing ones
    this.http?.closeAllConnections()
    this.https?.closeAllConnections()

    ;[...this.sockets].forEach(socket => {
      socket.destroy()
    })

    // abort and in-flight connection upgrades
    this.shutdownController.abort()

    await Promise.all([
      pEvent(this.server, 'close'),
      this.http == null ? null : pEvent(this.http, 'close'),
      this.https == null ? null : pEvent(this.https, 'close'),
      pEvent(this.wsServer, 'close')
    ])

    this.safeDispatchEvent('close')
  }

  getAddrs (): Multiaddr[] {
    const address = this.server.address()

    if (address == null) {
      return []
    }

    if (typeof address === 'string') {
      return [multiaddr(`/unix/${encodeURIComponent(address)}/ws`)]
    }

    const multiaddrs: Multiaddr[] = getThinWaistAddresses(this.listeningMultiaddr, address.port)
    const insecureMultiaddrs: Multiaddr[] = []

    if (this.http != null) {
      multiaddrs.forEach(ma => {
        insecureMultiaddrs.push(ma.encapsulate('/ws'))
      })
    }

    const secureMultiaddrs: Multiaddr[] = []

    if (this.https != null) {
      multiaddrs.forEach(ma => {
        secureMultiaddrs.push(ma.encapsulate('/tls/ws'))
      })
    }

    return [
      ...insecureMultiaddrs,
      ...secureMultiaddrs
    ]
  }

  updateAnnounceAddrs (): void {

  }

  private httpRequestHandler (req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(400)
    res.write('Only WebSocket connections are supported')
    res.end()
  }
}

export function createListener (components: WebSocketListenerComponents, init: WebSocketListenerInit): Listener {
  return new WebSocketListener(components, init)
}
