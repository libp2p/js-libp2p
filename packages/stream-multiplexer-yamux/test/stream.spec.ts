/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import { type Pushable, pushable } from 'it-pushable'
import { defaultConfig } from '../src/config.js'
import { ERR_RECV_WINDOW_EXCEEDED } from '../src/constants.js'
import { GoAwayCode } from '../src/frame.js'
import { HalfStreamState, StreamState } from '../src/stream.js'
import { sleep, testClientServer, type YamuxFixture } from './util.js'
import type { Uint8ArrayList } from 'uint8arraylist'

describe('stream', () => {
  let client: YamuxFixture
  let server: YamuxFixture

  afterEach(async () => {
    if (client != null) {
      await client.close()
    }

    if (server != null) {
      await server.close()
    }
  })

  it('test send data - small', async () => {
    ({ client, server } = testClientServer({ initialStreamWindowSize: defaultConfig.initialStreamWindowSize }))
    const { default: drain } = await import('it-drain')

    const p = pushable()
    const c1 = client.newStream()
    await sleep(10)

    const s1 = server.streams[0]
    const sendPipe = pipe(p, c1)
    const recvPipe = pipe(s1, drain)
    for (let i = 0; i < 10; i++) {
      p.push(new Uint8Array(256))
    }
    p.end()

    await Promise.all([sendPipe, recvPipe])

    // the window capacities should have refilled via window updates as received data was consumed

    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(c1['sendWindowCapacity']).to.equal(defaultConfig.initialStreamWindowSize)
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(s1['recvWindowCapacity']).to.equal(defaultConfig.initialStreamWindowSize)
  })

  it('test send data - large', async () => {
    ({ client, server } = testClientServer({ initialStreamWindowSize: defaultConfig.initialStreamWindowSize }))
    const { default: drain } = await import('it-drain')

    const p = pushable()
    const c1 = client.newStream()
    await sleep(10)

    const s1 = server.streams[0]
    const sendPipe = pipe(p, c1)
    const recvPipe = pipe(s1, drain)
    // amount of data is greater than initial window size
    // and each payload is also greater than the max message size
    // this will payload chunking and also waiting for window updates before continuing to send
    for (let i = 0; i < 10; i++) {
      p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))
    }
    p.end()

    await Promise.all([sendPipe, recvPipe])
    // the window capacities should have refilled via window updates as received data was consumed

    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(c1['sendWindowCapacity']).to.equal(defaultConfig.initialStreamWindowSize)
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(s1['recvWindowCapacity']).to.equal(defaultConfig.initialStreamWindowSize)
  })

  it('test send data - large with increasing recv window size', async () => {
    ({ client, server } = testClientServer({ initialStreamWindowSize: defaultConfig.initialStreamWindowSize }))
    const { default: drain } = await import('it-drain')

    const p = pushable()
    const c1 = client.newStream()

    server.pauseWrite()
    void server.ping()
    await sleep(10)
    server.unpauseWrite()

    const s1 = server.streams[0]
    const sendPipe = pipe(p, c1)
    const recvPipe = pipe(s1, drain)
    // amount of data is greater than initial window size
    // and each payload is also greater than the max message size
    // this will payload chunking and also waiting for window updates before continuing to send
    for (let i = 0; i < 10; i++) {
      p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))
    }
    p.end()

    await Promise.all([sendPipe, recvPipe])
    // the window capacities should have refilled via window updates as received data was consumed

    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(c1['sendWindowCapacity']).to.be.gt(defaultConfig.initialStreamWindowSize)
    // eslint-disable-next-line @typescript-eslint/dot-notation
    expect(s1['recvWindowCapacity']).to.be.gt(defaultConfig.initialStreamWindowSize)
  })

  it('test many streams', async () => {
    ({ client, server } = testClientServer())
    for (let i = 0; i < 1000; i++) {
      client.newStream()
    }
    await sleep(100)

    expect(client.streams.length).to.equal(1000)
    expect(server.streams.length).to.equal(1000)
  })

  it('test many streams - ping pong', async () => {
    ({ client, server } = testClientServer({
      // echo on incoming streams
      onIncomingStream: (stream) => { void pipe(stream, stream) }
    }))
    const numStreams = 10

    const p: Array<Pushable<Uint8Array>> = []
    for (let i = 0; i < numStreams; i++) {
      client.newStream()
      p.push(pushable())
    }
    await sleep(100)

    for (let i = 0; i < numStreams; i++) {
      const s = client.streams[i]
      void pipe(p[i], s)
      p[i].push(new Uint8Array(16))
    }
    await sleep(100)

    expect(client.streams.length).to.equal(numStreams)
    expect(server.streams.length).to.equal(numStreams)

    await client.close()
  })

  it('test stream close', async () => {
    ({ client, server } = testClientServer())

    const c1 = client.newStream()
    await c1.close()
    await sleep(5)

    expect(c1.state).to.equal(StreamState.Finished)

    const s1 = server.streams[0]
    expect(s1).to.not.be.undefined()
    expect(s1.state).to.equal(StreamState.SYNReceived)
  })

  it('test stream close read', async () => {
    ({ client, server } = testClientServer())

    const c1 = client.newStream()
    await c1.closeRead()
    await sleep(5)

    expect(c1.readState).to.equal(HalfStreamState.Closed)
    expect(c1.writeState).to.equal(HalfStreamState.Open)

    const s1 = server.streams[0]
    expect(s1).to.not.be.undefined()
    expect(s1.readState).to.equal(HalfStreamState.Open)
    expect(s1.writeState).to.equal(HalfStreamState.Open)
  })

  it('test stream close write', async () => {
    ({ client, server } = testClientServer())

    const c1 = client.newStream()
    await c1.closeWrite()
    await sleep(5)

    expect(c1.readState).to.equal(HalfStreamState.Open)
    expect(c1.writeState).to.equal(HalfStreamState.Closed)

    const s1 = server.streams[0]
    expect(s1).to.not.be.undefined()
    expect(s1.readState).to.equal(HalfStreamState.Closed)
    expect(s1.writeState).to.equal(HalfStreamState.Open)
  })

  it('test window overflow', async () => {
    ({ client, server } = testClientServer({ maxMessageSize: defaultConfig.initialStreamWindowSize, initialStreamWindowSize: defaultConfig.initialStreamWindowSize }))
    const { default: drain } = await import('it-drain')

    const p = pushable()
    const c1 = client.newStream()
    await sleep(10)

    const s1 = server.streams[0]
    const sendPipe = pipe(p, c1)

    const c1SendData = c1.sendData.bind(c1)

    c1.sendData = async (data: Uint8ArrayList): Promise<void> => {
      await c1SendData(data)
      // eslint-disable-next-line @typescript-eslint/dot-notation
      c1['sendWindowCapacity'] = defaultConfig.initialStreamWindowSize * 10
    }
    p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))
    p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))

    await sleep(10)

    const recvPipe = pipe(s1, drain)
    p.end()

    try {
      await Promise.all([sendPipe, recvPipe])
    } catch (e) {
      expect((e as { code: string }).code).to.equal(ERR_RECV_WINDOW_EXCEEDED)
    }

    expect(client).to.have.property('remoteGoAway', GoAwayCode.ProtocolError)
    expect(server).to.have.property('localGoAway', GoAwayCode.ProtocolError)
  })

  it('test stream sink error', async () => {
    ({ client, server } = testClientServer())

    // don't let the server respond
    server.pauseRead()

    const p = pushable()
    const c1 = client.newStream()

    const sendPipe = pipe(p, c1)

    // send more data than the window size, will trigger a wait
    p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))
    p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))

    await sleep(10)

    // the client should close gracefully even though it was waiting to send more data
    await client.close()
    p.end()

    await sendPipe
  })
})
