import * as Status from '@libp2p/interface/connection/status'
import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import * as mss from '@libp2p/multistream-select'
import { peerIdFromString } from '@libp2p/peer-id'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { mockMultiaddrConnection } from './multiaddr-connection.js'
import { mockMuxer } from './muxer.js'
import { mockRegistrar } from './registrar.js'
import type { AbortOptions } from '@libp2p/interface'
import type { MultiaddrConnection, Connection, Stream, Direction, ByteStream, ConnectionTimeline } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { StreamMuxer, StreamMuxerFactory } from '@libp2p/interface/stream-muxer'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:mock-connection')

export interface MockConnectionOptions {
  direction?: Direction
  registrar?: Registrar
  muxerFactory?: StreamMuxerFactory
}

interface MockConnectionInit {
  remoteAddr: Multiaddr
  remotePeer: PeerId
  direction: Direction
  maConn: MultiaddrConnection
  muxer: StreamMuxer
}

class MockConnection implements Connection {
  public id: string
  public remoteAddr: Multiaddr
  public remotePeer: PeerId
  public direction: Direction
  public timeline: ConnectionTimeline
  public multiplexer?: string
  public encryption?: string
  public status: keyof typeof Status
  public streams: Stream[]
  public tags: string[]

  private readonly muxer: StreamMuxer
  private readonly maConn: MultiaddrConnection

  constructor (init: MockConnectionInit) {
    const { remoteAddr, remotePeer, direction, maConn, muxer } = init

    this.id = `mock-connection-${Math.random()}`
    this.remoteAddr = remoteAddr
    this.remotePeer = remotePeer
    this.direction = direction
    this.status = Status.OPEN
    this.timeline = maConn.timeline
    this.multiplexer = 'test-multiplexer'
    this.encryption = 'yes-yes-very-secure'
    this.streams = []
    this.tags = []
    this.muxer = muxer
    this.maConn = maConn
  }

  async newStream (protocols: string | string[], options?: AbortOptions): Promise<Stream> {
    if (!Array.isArray(protocols)) {
      protocols = [protocols]
    }

    if (protocols.length === 0) {
      throw new Error('protocols must have a length')
    }

    if (this.status !== Status.OPEN) {
      throw new CodeError('connection must be open to create streams', 'ERR_CONNECTION_CLOSED')
    }

    const id = `${Math.random()}`
    const stream = await this.muxer.newStream(id)
    const protocolStream = await mss.select(stream, protocols, options)

    this.streams.push(protocolStream)

    return protocolStream
  }

  addStream (stream: any): void {
    this.streams.push(stream)
  }

  removeStream (id: string): void {
    this.streams = this.streams.filter(stream => stream.id !== id)
  }

  async close (): Promise<void> {
    this.status = Status.CLOSING
    await Promise.all(
      this.streams.map(async s => s.close())
    )
    await this.maConn.close()
    this.status = Status.CLOSED
    this.timeline.close = Date.now()
  }

  abort (err: Error): void {
    this.status = Status.CLOSING
    this.streams.forEach(s => {
      s.abort(err)
    })
    this.maConn.abort(err)
    this.status = Status.CLOSED
    this.timeline.close = Date.now()
  }
}

export function mockConnection (maConn: MultiaddrConnection, opts: MockConnectionOptions = {}): Connection {
  const remoteAddr = maConn.remoteAddr
  const remotePeerIdStr = remoteAddr.getPeerId() ?? '12D3KooWCrhmFM1BCPGBkNzbPfDk4cjYmtAYSpZwUBC69Qg2kZyq'

  if (remotePeerIdStr == null) {
    throw new Error('Remote multiaddr must contain a peer id')
  }

  const remotePeer = peerIdFromString(remotePeerIdStr)
  const direction = opts.direction ?? 'inbound'
  const registrar = opts.registrar ?? mockRegistrar()
  const muxerFactory = opts.muxerFactory ?? mockMuxer()

  const muxer = muxerFactory.createStreamMuxer({
    direction,
    onIncomingStream: (muxedStream) => {
      try {
        mss.handle(muxedStream, registrar.getProtocols())
          .then(stream => {
            log('%s: incoming stream opened on %s', stream.direction, stream.protocol)

            connection.addStream(muxedStream)
            const { handler } = registrar.getHandler(stream.protocol)

            handler({ connection, stream })
          }).catch(err => {
            log.error(err)
          })
      } catch (err: any) {
        log.error(err)
      }
    },
    onStreamEnd: (muxedStream) => {
      connection.removeStream(muxedStream.id)
    }
  })

  void pipe(
    maConn, muxer, maConn
  )

  const connection = new MockConnection({
    remoteAddr,
    remotePeer,
    direction,
    maConn,
    muxer
  })

  return connection
}

export function mockStream (stream: ByteStream): Stream {
  return {
    ...stream,
    close: async () => {},
    abort: () => {},
    direction: 'outbound',
    protocol: '/foo/1.0.0',
    timeline: {
      open: Date.now()
    },
    metadata: {},
    id: `stream-${Date.now()}`
  }
}

export interface Peer {
  peerId: PeerId
  registrar: Registrar
}

export function multiaddrConnectionPair (a: { peerId: PeerId, registrar: Registrar }, b: { peerId: PeerId, registrar: Registrar }): [ MultiaddrConnection, MultiaddrConnection ] {
  const [peerBtoPeerA, peerAtoPeerB] = duplexPair<Uint8Array>()

  return [
    mockMultiaddrConnection(peerAtoPeerB, b.peerId),
    mockMultiaddrConnection(peerBtoPeerA, a.peerId)
  ]
}

export function connectionPair (a: { peerId: PeerId, registrar: Registrar }, b: { peerId: PeerId, registrar: Registrar }): [ Connection, Connection ] {
  const [peerBtoPeerA, peerAtoPeerB] = multiaddrConnectionPair(a, b)

  return [
    mockConnection(peerBtoPeerA, {
      registrar: a.registrar
    }),
    mockConnection(peerAtoPeerB, {
      registrar: b.registrar
    })
  ]
}
