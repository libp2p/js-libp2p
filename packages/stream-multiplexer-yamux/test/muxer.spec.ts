/* eslint-env mocha */

import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { YamuxMuxer } from '../src/muxer.ts'
import { sleep } from './util.js'
import type { MultiaddrConnection } from '@libp2p/interface'

describe('muxer', () => {
  let client: YamuxMuxer
  let server: YamuxMuxer
  let outboundConnection: MultiaddrConnection
  let inboundConnection: MultiaddrConnection

  beforeEach(() => {
    ([outboundConnection, inboundConnection] = multiaddrConnectionPair())
    client = new YamuxMuxer(outboundConnection)
    server = new YamuxMuxer(inboundConnection)
  })

  afterEach(async () => {
    if (client != null) {
      await client.close()
    }

    if (server != null) {
      await server.close()
    }
  })

  it('test repeated close', async () => {
    // inspect logs to ensure its only closed once
    await client.close()
    await client.close()
    await client.close()
  })

  it('test client<->client', async () => {
    server['client'] = true

    await client.createStream().catch(() => {})
    await server.createStream().catch(() => {})

    await sleep(20)

    expect(client).to.have.property('status', 'closed')
    expect(server).to.have.property('status', 'closed')
  })

  it('test server<->server', async () => {
    client['client'] = false

    await client.createStream().catch(() => {})
    await server.createStream().catch(() => {})

    await sleep(20)

    expect(client).to.have.property('status', 'closed')
    expect(server).to.have.property('status', 'closed')
  })

  it('test ping', async () => {
    inboundConnection.pause()
    const clientRTT = client.ping()
    await sleep(10)
    inboundConnection.resume()
    await expect(clientRTT).to.eventually.not.equal(0)

    outboundConnection.pause()
    const serverRTT = server.ping()
    await sleep(10)
    outboundConnection.resume()
    expect(await serverRTT).to.not.equal(0)
  })

  it('test multiple simultaneous pings', async () => {
    inboundConnection.pause()
    const promise = [
      client.ping(),
      client.ping(),
      client.ping()
    ]
    await sleep(10)
    inboundConnection.resume()

    const clientRTTs = await Promise.all(promise)
    expect(clientRTTs[0]).to.not.equal(0)
    expect(clientRTTs[0]).to.equal(clientRTTs[1])
    expect(clientRTTs[1]).to.equal(clientRTTs[2])

    expect(client['nextPingID']).to.equal(1)

    await client.close()
  })

  it('test go away', async () => {
    await client.close()

    await expect(client.createStream()).to.eventually.be.rejected()
      .with.property('name', 'MuxerClosedError', 'should not be able to open a stream after close')
  })

  it('test keep alive', async () => {
    client['keepAlive']?.setInterval(10)

    await sleep(1000)

    expect(client['nextPingID']).to.be.gt(2)
  })

  it('test max inbound streams', async () => {
    server['config']['maxInboundStreams'] = 1

    await client.createStream()
    await client.createStream()
    await sleep(10)

    expect(server.streams.length).to.equal(1)
    expect(client.streams.length).to.equal(1)
  })

  it('test max outbound streams', async () => {
    client['config']['maxOutboundStreams'] = 1

    await client.createStream()
    await sleep(10)

    try {
      await client.createStream()
      expect.fail('stream creation should fail if exceeding maxOutboundStreams')
    } catch (e) {
      expect(server.streams.length).to.equal(1)
      expect(client.streams.length).to.equal(1)
    }
  })
})
