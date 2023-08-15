/* eslint-disable no-console */
/* eslint-env mocha */

import { noise } from '@chainsafe/libp2p-noise'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { webTransport } from '../src/index.js'

declare global {
  interface Window {
    WebTransport: any
  }
}

describe('libp2p-webtransport', () => {
  it('webtransport connects to go-libp2p', async () => {
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const ma = multiaddr(maStr)
    const node = await createLibp2p({
      transports: [webTransport()],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false
      }
    })

    await node.start()

    // Ping many times
    for (let index = 0; index < 100; index++) {
      const now = Date.now()

      // Note we're re-implementing the ping protocol here because as of this
      // writing, go-libp2p will reset the stream instead of close it. The next
      // version of go-libp2p v0.24.0 will have this fix. When that's released
      // we can use the builtin ping system
      const stream = await node.dialProtocol(ma, '/ipfs/ping/1.0.0')

      const data = new Uint8Array(32)
      globalThis.crypto.getRandomValues(data)

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

    await node.stop()
    const conns = node.getConnections()
    expect(conns.length).to.equal(0)
  })

  it('fails to connect without certhashes', async () => {
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const maStrNoCerthash: string = maStr.split('/certhash')[0]
    const maStrP2p = maStr.split('/p2p/')[1]
    const ma = multiaddr(maStrNoCerthash + '/p2p/' + maStrP2p)

    const node = await createLibp2p({
      transports: [webTransport()],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false
      }
    })
    await node.start()

    const err = await expect(node.dial(ma)).to.eventually.be.rejected()
    expect(err.toString()).to.contain('Expected multiaddr to contain certhashes')

    await node.stop()
  })

  it('connects to ipv6 addresses', async function () {
    if (process.env.disableIp6 === 'true') {
      return this.skip()
    }
    if (process.env.serverAddr6 == null) {
      throw new Error('serverAddr6 not found')
    }

    const ma = multiaddr(process.env.serverAddr6)
    const node = await createLibp2p({
      transports: [webTransport()],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false
      }
    })

    await node.start()

    // the address is unreachable but we can parse it correctly
    const stream = await node.dialProtocol(ma, '/ipfs/ping/1.0.0')
    await stream.close()

    await node.stop()
  })

  it('closes writes of streams after they have sunk a source', async () => {
    // This is the behavior of stream muxers: (see mplex, yamux and compliance tests: https://github.com/libp2p/js-libp2p-interfaces/blob/master/packages/interface-stream-muxer-compliance-tests/src/close-test.ts)
    if (process.env.serverAddr == null) {
      throw new Error('serverAddr not found')
    }

    const maStr: string = process.env.serverAddr
    const ma = multiaddr(maStr)
    const node = await createLibp2p({
      transports: [webTransport()],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: async () => false
      }
    })

    async function * gen (): AsyncGenerator<Uint8Array, void, unknown> {
      yield new Uint8Array([0])
      yield new Uint8Array([1, 2, 3, 4])
      yield new Uint8Array([5, 6, 7])
      yield new Uint8Array([8, 9, 10, 11])
      yield new Uint8Array([12, 13, 14, 15])
    }

    await node.start()
    const stream = await node.dialProtocol(ma, 'echo')

    await stream.sink(gen())

    let expectedNextNumber = 0
    for await (const chunk of stream.source) {
      for (const byte of chunk.subarray()) {
        expect(byte).to.equal(expectedNextNumber++)
      }
    }
    expect(expectedNextNumber).to.equal(16)

    // Close read, we've should have closed the write side during sink
    await stream.closeRead()

    expect(stream.timeline.close).to.be.greaterThan(0)

    await node.stop()
  })
})
