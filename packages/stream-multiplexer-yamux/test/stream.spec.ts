/* eslint-env mocha */

import { multiaddrConnectionPair, pipe } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import drain from 'it-drain'
import { pushable } from 'it-pushable'
import { pEvent } from 'p-event'
import { defaultConfig } from '../src/config.js'
import { GoAwayCode } from '../src/frame.js'
import { YamuxMuxer } from '../src/muxer.ts'
import { StreamState, YamuxStream } from '../src/stream.js'
import { sleep } from './util.js'
import type { MultiaddrConnection } from '@libp2p/interface'
import type { Pushable } from 'it-pushable'

describe('stream', () => {
  let inboundConnection: MultiaddrConnection
  let outboundConnection: MultiaddrConnection
  let client: YamuxMuxer
  let server: YamuxMuxer

  beforeEach(() => {
    ([inboundConnection, outboundConnection] = multiaddrConnectionPair())
    client = new YamuxMuxer(inboundConnection, {
      maxEarlyStreams: 2000
    })
    server = new YamuxMuxer(outboundConnection, {
      maxEarlyStreams: 2000
    })
  })

  afterEach(async () => {
    await client?.close()
    await server?.close()
  })

  it('test send data - small', async () => {
    const [
      s1, c1
    ] = await Promise.all([
      pEvent<'stream', CustomEvent<YamuxStream>>(server, 'stream').then(evt => evt.detail),
      client.createStream()
    ])

    await Promise.all([
      Promise.resolve().then(async () => {
        for (let i = 0; i < 10; i++) {
          const sendMore = c1.send(new Uint8Array(256))

          if (!sendMore) {
            await pEvent(c1, 'drain')
          }
        }

        await c1.close()
      }),
      drain(s1)
    ])

    // the window capacities should have refilled via window updates as received data was consumed
    expect(c1['sendWindowCapacity']).to.be.gte(defaultConfig.initialStreamWindowSize)
    expect(s1['recvWindowCapacity']).to.be.gte(defaultConfig.initialStreamWindowSize)
  })

  it('test send data - large', async () => {
    const [
      s1, c1
    ] = await Promise.all([
      pEvent<'stream', CustomEvent<YamuxStream>>(server, 'stream').then(evt => evt.detail),
      client.createStream()
    ])

    await Promise.all([
      Promise.resolve().then(async () => {
        // amount of data is greater than initial window size
        // and each payload is also greater than the max message size
        // this will payload chunking and also waiting for window updates before
        // continuing to send
        for (let i = 0; i < 10; i++) {
          const sendMore = c1.send(new Uint8Array(defaultConfig.initialStreamWindowSize))

          if (!sendMore) {
            await pEvent(c1, 'drain')
          }
        }

        await c1.close()
      }),
      drain(s1)
    ])

    // the window capacities should have refilled via window updates as received data was consumed
    expect(c1['sendWindowCapacity']).to.be.gte(defaultConfig.initialStreamWindowSize)
    expect(s1['recvWindowCapacity']).to.be.gte(defaultConfig.initialStreamWindowSize)
  })

  it('test send data - large with increasing recv window size', async () => {
    const [
      s1, c1
    ] = await Promise.all([
      pEvent<'stream', CustomEvent<YamuxStream>>(server, 'stream').then(evt => evt.detail),
      client.createStream(),
      server.ping()
    ])

    await Promise.all([
      Promise.resolve().then(async () => {
        // amount of data is greater than initial window size
        // and each payload is also greater than the max message size
        // this will payload chunking and also waiting for window updates before
        // continuing to send
        for (let i = 0; i < 10; i++) {
          const sendMore = c1.send(new Uint8Array(defaultConfig.initialStreamWindowSize))

          if (!sendMore) {
            await pEvent(c1, 'drain')
          }
        }
        await c1.close()
      }),
      drain(s1)
    ])

    // the window capacities should have refilled via window updates as received data was consumed
    expect(c1['sendWindowCapacity']).to.be.gte(defaultConfig.initialStreamWindowSize)
    expect(s1['recvWindowCapacity']).to.be.gte(defaultConfig.initialStreamWindowSize)
  })

  it('test many streams', async () => {
    for (let i = 0; i < 1000; i++) {
      await client.createStream()
    }
    await sleep(100)

    expect(client.streams.length).to.equal(1000)
    expect(server.streams.length).to.equal(1000)
  })

  it('test many streams - ping pong', async () => {
    server.addEventListener('stream', (evt) => {
      // echo on incoming streams
      pipe(evt.detail, evt.detail)
    })

    const numStreams = 10

    const p: Array<Pushable<Uint8Array>> = []
    for (let i = 0; i < numStreams; i++) {
      client.createStream()
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
    server.addEventListener('stream', (evt) => {
      // close incoming streams
      evt.detail.close()
    })

    const c1 = await client.createStream()
    await c1.close()
    await sleep(100)

    expect(c1.state).to.equal(StreamState.Finished)

    expect(client.streams).to.be.empty()
    expect(server.streams).to.be.empty()
  })

  it('test stream close write', async () => {
    const c1 = await client.createStream()
    await c1.close()
    await sleep(100)

    expect(c1.state).to.equal(StreamState.SYNSent)
    expect(c1.writeStatus).to.equal('closed')

    const s1 = server.streams[0]
    expect(s1).to.not.be.undefined()
    expect(s1.state).to.equal(StreamState.SYNReceived)
  })

  it('test stream close read', async () => {
    const c1 = await client.createStream()
    await c1.closeRead()
    await sleep(5)

    const s1 = server.streams[0]
    expect(s1).to.not.be.undefined()
    expect(s1.readStatus).to.equal('readable')
    expect(s1.writeStatus).to.equal('writable')
  })

  it('test stream close write', async () => {
    const c1 = await client.createStream()
    await c1.close()
    await sleep(5)

    expect(c1.readStatus).to.equal('readable')
    expect(c1.writeStatus).to.equal('closed')

    const s1 = server.streams[0]
    expect(s1).to.not.be.undefined()
    expect(s1.readStatus).to.equal('readable')
    expect(s1.writeStatus).to.equal('writable')
  })

  it('test window overflow', async () => {
    const [
      s1, c1
    ] = await Promise.all([
      pEvent<'stream', CustomEvent<YamuxStream>>(server, 'stream').then(evt => evt.detail),
      client.createStream()
    ])

    await expect(
      Promise.all([
        (async () => {
          const data = new Array(10).fill(new Uint8Array(s1['recvWindowCapacity'] * 2))

          for (const buf of data) {
            c1['maxMessageSize'] = s1['recvWindowCapacity'] * 2
            c1['sendWindowCapacity'] = s1['recvWindowCapacity'] * 2
            const sendMore = c1.send(buf)

            if (!sendMore) {
              await pEvent(c1, 'drain')
            }
          }

          await c1.close()
        })(),
        drain(s1)
      ])
    ).to.eventually.be.rejected()
      .with.property('name', 'ReceiveWindowExceededError')

    expect(client).to.have.property('remoteGoAway', GoAwayCode.ProtocolError)
    expect(server).to.have.property('localGoAway', GoAwayCode.ProtocolError)
  })

  it('test stream sink error', async () => {
    // don't let the server respond
    inboundConnection.pause()

    const p = pushable()
    const c1 = await client.createStream()

    pipe(p, c1)

    // send more data than the window size, will trigger a wait
    p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))
    p.push(new Uint8Array(defaultConfig.initialStreamWindowSize))

    await sleep(10)

    // the client should fail to close gracefully because there is unsent data
    // that will never be sent
    await expect(client.close({
      signal: AbortSignal.timeout(10)
    })).to.eventually.be.rejected()

    p.end()
    inboundConnection.resume()
  })
})
