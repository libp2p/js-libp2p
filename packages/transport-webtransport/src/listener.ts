import * as os from 'node:os'
import { noise } from '@chainsafe/libp2p-noise'
import { TypedEventEmitter } from '@libp2p/interface'
import { ipPortToMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import toIt from 'browser-readablestream-to-it'
import { base64url } from 'multiformats/bases/base64'
import { createServer } from './create-server.js'
import { webtransportMuxer } from './muxer.js'
import { generateWebTransportCertificates } from './utils/generate-certificates.js'
import { inertDuplex } from './utils/inert-duplex.js'
import type { WebTransportServer } from './create-server.js'
import type { WebTransportCertificate } from './index.js'
import type { WebTransportSession } from '@fails-components/webtransport'
import type { MultiaddrConnection, Connection, Upgrader, Listener, ListenerEvents, CreateListenerOptions, PeerId, ComponentLogger, Metrics, Logger } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const CODE_P2P = 421

const networks = os.networkInterfaces()

function isAnyAddr (ip: string): boolean {
  return ['0.0.0.0', '::'].includes(ip)
}

function getNetworkAddrs (family: string): string[] {
  const addresses: string[] = []

  for (const [, netAddrs] of Object.entries(networks)) {
    if (netAddrs != null) {
      for (const netAddr of netAddrs) {
        if (netAddr.family === family) {
          addresses.push(netAddr.address)
        }
      }
    }
  }

  return addresses
}

const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

function getMultiaddrs (proto: 'ip4' | 'ip6', ip: string, port: number, certificates: WebTransportCertificate[] = []): Multiaddr[] {
  const certhashes = certificates.map(cert => {
    return `/certhash/${base64url.encode(cert.hash.bytes)}`
  }).join('')

  const toMa = (ip: string): Multiaddr => multiaddr(`/${proto}/${ip}/udp/${port}/quic-v1/webtransport${certhashes}`)
  return (isAnyAddr(ip) ? getNetworkAddrs(ProtoFamily[proto]) : [ip]).map(toMa)
}

export interface WebTransportListenerComponents {
  peerId: PeerId
  logger: ComponentLogger
  metrics?: Metrics
}

interface WebTransportListenerInit extends CreateListenerOptions {
  handler?(conn: Connection): void
  upgrader: Upgrader
  certificates?: WebTransportCertificate[]
  maxInboundStreams?: number
}

type Status = { started: false } | { started: true, listeningAddr: Multiaddr, peerId: string | null }

class WebTransportListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private server?: WebTransportServer
  private certificates?: WebTransportCertificate[]
  private readonly peerId: PeerId
  private readonly upgrader: Upgrader
  private readonly handler?: (conn: Connection) => void
  /** Keep track of open connections to destroy in case of timeout */
  private readonly connections: Connection[]
  private readonly components: WebTransportListenerComponents
  private readonly log: Logger
  private readonly maxInboundStreams: number

  private status: Status = { started: false }

  constructor (components: WebTransportListenerComponents, init: WebTransportListenerInit) {
    super()

    this.components = components
    this.certificates = init.certificates
    this.peerId = components.peerId
    this.upgrader = init.upgrader
    this.handler = init.handler
    this.connections = []
    this.log = components.logger.forComponent('libp2p:webtransport:listener')
    this.maxInboundStreams = init.maxInboundStreams ?? 1000
  }

  async onSession (session: WebTransportSession): Promise<void> {
    if (!this._assertSupportsNoise(session)) {
      session.close({
        closeCode: 1,
        reason: 'Unsupported encryption'
      })
    }

    const bidiReader = session.incomingBidirectionalStreams.getReader()

    // read one stream to do authentication
    this.log('read authentication stream')
    const bidistr = await bidiReader.read()

    if (bidistr.done) {
      this.log.error('bidirectional stream reader ended before authentication stream received')
      return
    }

    // ok we got a stream
    const bidistream = bidistr.value
    const writer = bidistream.writable.getWriter()

    const encrypter = noise({
      extensions: {
        webtransportCerthashes: this.certificates?.map(cert => cert.hash.bytes) ?? []
      }
    })(this.components)
    const duplex: Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>> = {
      source: toIt(bidistream.readable),
      sink: async (source: Source<Uint8Array | Uint8ArrayList>) => {
        for await (const buf of source) {
          if (buf instanceof Uint8Array) {
            await writer.write(buf)
          } else {
            await writer.write(buf.subarray())
          }
        }
      }
    }

    this.log('secure inbound stream')
    const { remotePeer } = await encrypter.secureInbound(this.peerId, duplex)

    // upgrade it
    const maConn: MultiaddrConnection = {
      close: async () => {
        this.log('Closing webtransport gracefully')
        session.close()
      },
      abort: (err: Error) => {
        this.log('Closing webtransport with err:', err)
        session.close()
      },
      // TODO: pull this from webtransport
      // remoteAddr: ipPortToMultiaddr(session.remoteAddress, session.remotePort),
      remoteAddr: ipPortToMultiaddr('127.0.0.1', 8080).encapsulate(`/p2p/${remotePeer.toString()}`),
      timeline: {
        open: Date.now()
      },
      log: this.components.logger.forComponent(`libp2p:webtransport:listener:${0}`),
      // This connection is never used directly since webtransport supports native streams
      ...inertDuplex()
    }

    session.closed.catch((err: Error) => {
      this.log.error('WebTransport connection closed with error:', err)
    }).finally(() => {
      // This is how we specify the connection is closed and shouldn't be used.
      maConn.timeline.close = Date.now()
    })

    try {
      this.log('upgrade inbound stream')
      const connection = await this.upgrader.upgradeInbound(maConn, {
        skipEncryption: true,
        skipProtection: true,
        muxerFactory: webtransportMuxer(
          session,
          bidiReader,
          this.components.logger, {
            maxInboundStreams: this.maxInboundStreams
          })
      })

      this.log('upgrade complete, close authentication stream')
      // We're done with this authentication stream
      writer.close().catch((err: Error) => {
        this.log.error('failed to close authentication stream writer', err)
      })

      this.connections.push(connection)

      if (this.handler != null) {
        this.handler(connection)
      }

      this.safeDispatchEvent('connection', {
        detail: connection
      })
    } catch (err: any) {
      session.close({
        closeCode: 500,
        reason: err.message
      })
    }
  }

  _assertSupportsNoise (session: any): boolean {
    return session?.userData?.search?.includes('type=noise')
  }

  getAddrs (): Multiaddr[] {
    if (!this.status.started || this.server == null) {
      return []
    }

    let addrs: Multiaddr[] = []
    const address = this.server.address()

    if (address == null) {
      return []
    }

    try {
      if (address.family === 'IPv4') {
        addrs = addrs.concat(getMultiaddrs('ip4', address.host, address.port, this.certificates))
      } else if (address.family === 'IPv6') {
        addrs = addrs.concat(getMultiaddrs('ip6', address.host, address.port, this.certificates))
      }
    } catch (err) {
      this.log.error('could not turn %s:%s into multiaddr', address.host, address.port, err)
    }

    return addrs.map(ma => this.peerId != null ? ma.encapsulate(`/p2p/${this.peerId.toString()}`) : ma)
  }

  async listen (ma: Multiaddr): Promise<void> {
    this.log('listen on multiaddr %s', ma)
    let certificates = this.certificates

    if (certificates == null || certificates.length === 0) {
      this.log('generating certificates')

      certificates = this.certificates = await generateWebTransportCertificates([{
        // can be max 14 days according to the spec
        days: 13
      }, {
        days: 13,
        // start in 12 days time
        start: new Date(Date.now() + (86400000 * 12))
      }])
    }

    const peerId = ma.getPeerId()
    const listeningAddr = peerId == null ? ma.decapsulateCode(CODE_P2P) : ma

    this.status = { started: true, listeningAddr, peerId }

    const options = listeningAddr.toOptions()

    const server = this.server = createServer(this.components, {
      port: options.port,
      host: options.host,
      secret: certificates[0].secret,
      cert: certificates[0].pem,
      privKey: certificates[0].privateKey
    })

    server.addEventListener('listening', () => {
      this.log('server listening %s', ma, server.address())
      this.safeDispatchEvent('listening')
    })
    server.addEventListener('error', (event) => {
      this.log('server error %s', ma, event.detail)
      this.safeDispatchEvent('error', { detail: event.detail })
    })
    server.addEventListener('session', (event) => {
      this.log('server new session %s', ma)
      this.onSession(event.detail)
        .catch(err => {
          this.log.error('error handling new session', err)
          event.detail.close()
        })
    })
    server.addEventListener('close', () => {
      this.log('server close %s', ma)
      this.safeDispatchEvent('close')
    })

    await new Promise<void>((resolve, reject) => {
      server.listen()

      server.addEventListener('listening', () => {
        resolve()
      })
    })
  }

  async close (): Promise<void> {
    if (this.server == null) {
      return
    }

    this.log('closing connections')
    await Promise.all(
      this.connections.map(async conn => {
        await this.attemptClose(conn)
      })
    )

    this.log('stopping server')
    this.server.close()
  }

  /**
   * Attempts to close the given maConn. If a failure occurs, it will be logged
   */
  private async attemptClose (conn: Connection): Promise<void> {
    try {
      await conn.close()
    } catch (err) {
      this.log.error('an error occurred closing the connection', err)
    }
  }
}

export default function createListener (components: WebTransportListenerComponents, options: WebTransportListenerInit): Listener {
  return new WebTransportListener(components, options)
}
