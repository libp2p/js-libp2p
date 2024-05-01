/* eslint-env mocha */

import { noise } from '@chainsafe/libp2p-noise'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import map from 'it-map'
import toBuffer from 'it-to-buffer'
import { createLibp2p, type Libp2p } from 'libp2p'
import pWaitFor from 'p-wait-for'
import { webTransport } from '../src/index.js'
import { randomBytes } from './fixtures/random-bytes.js'

describe.skip('libp2p-webtransport', () => {
  let node: Libp2p

  beforeEach(async () => {
    node = await createLibp2p({
      transports: [webTransport()],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false
      },
      connectionManager: {
        minConnections: 0
      }
    })
  })

  afterEach(async () => {
    if (node != null) {
      console.info('stop node')
      await node.stop()

      const conns = node.getConnections()
      expect(conns.length).to.equal(0)
    }
  })

  it('webtransport connects to go-libp2p', async () => {
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const ma = multiaddr(maStr)

    // Ping many times
    for (let index = 0; index < 100; index++) {
      const now = Date.now()

      // Note we're re-implementing the ping protocol here because as of this
      // writing, go-libp2p will reset the stream instead of close it. The next
      // version of go-libp2p v0.24.0 will have this fix. When that's released
      // we can use the builtin ping system
      const stream = await node.dialProtocol(ma, '/ipfs/ping/1.0.0')

      const data = randomBytes(32)

      const pong = new Promise<void>((resolve, reject) => {
        (async () => {
          for await (const chunk of stream.source) {
            const v = chunk.subarray()
            const byteMatches: boolean = v.every((byte: number, i: number) => byte === data[i])
            if (byteMatches) {
              resolve()
            } else {
              reject(new Error('Wrong pong'))
            }
          }
        })().catch(reject)
      })

      let res = -1
      await stream.sink((async function * () {
        yield data
        // Wait for the pong before we close the write side
        await pong
        res = Date.now() - now
      })())

      await stream.close()

      expect(res).to.be.greaterThan(-1)
    }
  })

  it('fails to connect without certhashes', async () => {
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const maStrNoCerthash: string = maStr.split('/certhash')[0]
    const maStrP2p = maStr.split('/p2p/')[1]
    const ma = multiaddr(maStrNoCerthash + '/p2p/' + maStrP2p)

    await expect(node.dial(ma)).to.eventually.be.rejected()
      .with.property('code', 'ERR_NO_VALID_ADDRESSES')
  })

  it('fails to connect due to an aborted signal', async () => {
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const ma = multiaddr(maStr)

    const controller = new AbortController()
    controller.abort()

    const err = await expect(node.dial(ma, {
      signal: controller.signal
    })).to.eventually.be.rejected()
    expect(err.toString()).to.contain('aborted')
  })

  it.skip('connects to ipv6 addresses', async function () {
    if (process.env.disableIp6 === 'true') {
      return this.skip()
    }
    if (process.env.serverAddr6 == null) {
      throw new Error('serverAddr6 not found')
    }

    const ma = multiaddr(process.env.serverAddr6)

    // the address is unreachable but we can parse it correctly
    const stream = await node.dialProtocol(ma, '/ipfs/ping/1.0.0')
    await stream.close()
  })

  it('closes writes of streams after they have sunk a source', async () => {
    // This is the behavior of stream muxers: (see mplex, yamux and compliance tests: https://github.com/libp2p/js-libp2p/blob/main/packages/interface-compliance-tests/src/stream-muxer/close-test.ts)
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const ma = multiaddr(maStr)

    const data = [
      Uint8Array.from([0]),
      Uint8Array.from([1, 2, 3, 4]),
      Uint8Array.from([5, 6, 7]),
      Uint8Array.from([8, 9, 10, 11]),
      Uint8Array.from([12, 13, 14, 15])
    ]

    async function * gen (): AsyncGenerator<Uint8Array, void, undefined> {
      yield * data
    }

    const stream = await node.dialProtocol(ma, 'echo')

    expect(stream.timeline.closeWrite).to.be.undefined()
    expect(stream.timeline.closeRead).to.be.undefined()
    expect(stream.timeline.close).to.be.undefined()

    // send and receive data
    const [, output] = await Promise.all([
      stream.sink(gen()),
      toBuffer(map(stream.source, buf => buf.subarray()))
    ])

    // closing takes a little bit of time
    await pWaitFor(() => {
      return stream.writeStatus === 'closed'
    }, {
      interval: 100
    })

    expect(stream.writeStatus).to.equal('closed')
    expect(stream.timeline.closeWrite).to.be.greaterThan(0)

    // should have read all of the bytes
    expect(output).to.equalBytes(toBuffer(data))

    // should have set timeline events
    expect(stream.timeline.closeWrite).to.be.greaterThan(0)
    expect(stream.timeline.closeRead).to.be.greaterThan(0)
    expect(stream.timeline.close).to.be.greaterThan(0)
  })
})
