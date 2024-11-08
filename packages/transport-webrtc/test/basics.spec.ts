/* eslint-disable @typescript-eslint/no-unused-expressions */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { webSockets } from '@libp2p/websockets'
import * as filter from '@libp2p/websockets/filters'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import map from 'it-map'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import toBuffer from 'it-to-buffer'
import { createLibp2p } from 'libp2p'
import pDefer from 'p-defer'
import pRetry from 'p-retry'
import { webRTC } from '../src/index.js'
import type { Libp2p, Connection, Stream, StreamHandler } from '@libp2p/interface'

async function createNode (): Promise<Libp2p> {
  return createLibp2p({
    addresses: {
      listen: [
        '/webrtc',
        `${process.env.RELAY_MULTIADDR}/p2p-circuit`
      ]
    },
    transports: [
      webSockets({
        filter: filter.all
      }),
      circuitRelayTransport(),
      webRTC()
    ],
    connectionEncrypters: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    services: {
      identify: identify()
    }
  })
}

describe('basics', () => {
  const echo = '/echo/1.0.0'

  let localNode: Libp2p
  let remoteNode: Libp2p
  let streamHandler: StreamHandler

  async function connectNodes (): Promise<Connection> {
    const remoteAddr = remoteNode.getMultiaddrs()
      .filter(ma => WebRTC.exactMatch(ma)).pop()
console.info(remoteNode.getMultiaddrs())
    if (remoteAddr == null) {
      throw new Error('Remote peer could not listen on relay')
    }

    await remoteNode.handle(echo, (info) => {
      streamHandler(info)
    }, {
      runOnLimitedConnection: true
    })

    const connection = await localNode.dial(remoteAddr)

    // disconnect both from relay
    await localNode.hangUp(multiaddr(process.env.RELAY_MULTIADDR))
    await remoteNode.hangUp(multiaddr(process.env.RELAY_MULTIADDR))

    return connection
  }

  beforeEach(async () => {
    streamHandler = ({ stream }) => {
      void pipe(
        stream,
        stream
      )
    }

    localNode = await createNode()
    remoteNode = await createNode()
  })

  afterEach(async () => {
    if (localNode != null) {
      await localNode.stop()
    }

    if (remoteNode != null) {
      await remoteNode.stop()
    }
  })

  it('can dial through a relay', async () => {
    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo)

    // send and receive some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(10))
    const output = await pipe(
      input,
      stream,
      (source) => map(source, list => list.subarray()),
      async (source) => toBuffer(source)
    )

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })

  it('reports remote addresses correctly', async () => {
    const initatorConnection = await connectNodes()
    expect(initatorConnection.remoteAddr.toString()).to.equal(`${process.env.RELAY_MULTIADDR}/p2p-circuit/webrtc/p2p/${remoteNode.peerId}`)

    const receiverConnections = remoteNode.getConnections(localNode.peerId)
      .filter(conn => conn.remoteAddr.toString() === `/webrtc/p2p/${localNode.peerId}`)
    expect(receiverConnections).to.have.lengthOf(1)
  })

  it('can send a large file', async () => {
    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnLimitedConnection: true
    })

    // send and receive some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(1024 * 1024))
    const output = await pipe(
      input,
      stream,
      (source) => map(source, list => list.subarray()),
      async (source) => toBuffer(source)
    )

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })

  it('can close local stream for reading but send a large file', async () => {
    let output: Uint8Array = new Uint8Array(0)
    const streamClosed = pDefer()

    streamHandler = ({ stream }) => {
      void Promise.resolve().then(async () => {
        output = await toBuffer(map(stream.source, (buf) => buf.subarray()))
        await stream.close()
        streamClosed.resolve()
      })
    }

    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnLimitedConnection: true
    })

    // close for reading
    await stream.closeRead()

    // send some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(1024 * 1024))

    await stream.sink(input)
    await stream.close()

    // wait for remote to receive all data
    await streamClosed.promise

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })

  it('can close local stream for writing but receive a large file', async () => {
    const input = new Array(5).fill(0).map(() => new Uint8Array(1024 * 1024))

    streamHandler = ({ stream }) => {
      void Promise.resolve().then(async () => {
        // send some data
        await stream.sink(input)
        await stream.close()
      })
    }

    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnLimitedConnection: true
    })

    // close for reading
    await stream.closeWrite()

    // receive some data
    const output = await toBuffer(map(stream.source, (buf) => buf.subarray()))

    await stream.close()

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })

  it('can close local stream for writing and reading while a remote stream is writing', async () => {
    /**
     * NodeA             NodeB
     * |   <--- STOP_SENDING |
     * | FIN --->            |
     * |            <--- FIN |
     * | FIN_ACK --->        |
     * |        <--- FIN_ACK |
     */

    const getRemoteStream = pDefer<Stream>()

    streamHandler = ({ stream }) => {
      void Promise.resolve().then(async () => {
        getRemoteStream.resolve(stream)
      })
    }

    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnLimitedConnection: true
    })

    // close the write end immediately
    const p = stream.closeWrite()

    const remoteStream = await getRemoteStream.promise
    // close the readable end of the remote stream
    await remoteStream.closeRead()

    // keep the remote write end open, this should delay the FIN_ACK reply to the local stream
    const remoteInputStream = pushable<Uint8Array>()
    void remoteStream.sink(remoteInputStream)

    // wait for remote to receive local close-write
    await pRetry(() => {
      if (remoteStream.readStatus !== 'closed') {
        throw new Error('Remote stream read status ' + remoteStream.readStatus)
      }
    }, {
      minTimeout: 100
    })

    // remote closes write
    remoteInputStream.end()

    // wait to receive FIN_ACK
    await p

    // wait for remote to notice closure
    await pRetry(() => {
      if (remoteStream.status !== 'closed') {
        throw new Error('Remote stream not closed')
      }
    })

    assertStreamClosed(stream)
    assertStreamClosed(remoteStream)
  })

  it('can close local stream for writing and reading while a remote stream is writing using source/sink', async () => {
    /**
     * NodeA             NodeB
     * | FIN --->            |
     * |            <--- FIN |
     * | FIN_ACK --->        |
     * |        <--- FIN_ACK |
     */

    const getRemoteStream = pDefer<Stream>()

    streamHandler = ({ stream }) => {
      void Promise.resolve().then(async () => {
        getRemoteStream.resolve(stream)
      })
    }

    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnLimitedConnection: true
    })

    // keep the remote write end open, this should delay the FIN_ACK reply to the local stream
    const p = stream.sink([])

    const remoteStream = await getRemoteStream.promise
    // close the readable end of the remote stream
    await remoteStream.closeRead()
    // readable end should finish
    await drain(remoteStream.source)

    // wait for remote to receive local close-write
    await pRetry(() => {
      if (remoteStream.readStatus !== 'closed') {
        throw new Error('Remote stream read status ' + remoteStream.readStatus)
      }
    }, {
      minTimeout: 100
    })

    // remote closes write
    await remoteStream.sink([])

    // wait to receive FIN_ACK
    await p

    // close read end of stream
    await stream.closeRead()
    // readable end should finish
    await drain(stream.source)

    // wait for remote to notice closure
    await pRetry(() => {
      if (remoteStream.status !== 'closed') {
        throw new Error('Remote stream not closed')
      }
    })

    assertStreamClosed(stream)
    assertStreamClosed(remoteStream)
  })
})

function assertStreamClosed (stream: Stream): void {
  expect(stream.status).to.equal('closed')
  expect(stream.readStatus).to.equal('closed')
  expect(stream.writeStatus).to.equal('closed')

  expect(stream.timeline.close).to.be.a('number')
  expect(stream.timeline.closeRead).to.be.a('number')
  expect(stream.timeline.closeWrite).to.be.a('number')
}
