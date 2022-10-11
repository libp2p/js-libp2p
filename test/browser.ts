/* eslint-disable no-console */
/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { Noise } from '@chainsafe/libp2p-noise'
import { WebTransport as WebTransportLibp2p, isSubset } from '../src/index'
import { createLibp2p } from 'libp2p'

declare global {
  interface Window {
    WebTransport: any
  }
}

describe('libp2p-webtransport', () => {
  it('webtransport connects to go-libp2p', async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const maStr: string = process.env.serverAddr!
    const ma = multiaddr(maStr)
    const node = await createLibp2p({
      transports: [new WebTransportLibp2p()],
      connectionEncryption: [new Noise()]
    })

    await node.start()
    const res = await node.ping(ma)
    console.log('Ping ', res)
    expect(res).to.greaterThan(0)

    await node.stop()
    const conns = node.connectionManager.getConnections()
    expect(conns.length).to.equal(0)
  })

  it('fails to connect without certhashes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const maStr: string = process.env.serverAddr!
    const maStrNoCerthash: string = maStr.split('/certhash')[0]
    const maStrP2p = maStr.split('/p2p/')[1]
    const ma = multiaddr(maStrNoCerthash + '/p2p/' + maStrP2p)

    const node = await createLibp2p({
      transports: [new WebTransportLibp2p()],
      connectionEncryption: [new Noise()]
    })
    await node.start()

    const err = await expect(node.dial(ma)).to.eventually.be.rejected()
    expect(err.errors[0].toString()).to.contain('WebTransportError: Opening handshake failed.')
  })
})

describe('test helpers', () => {
  it('correctly checks subsets', () => {
    const testCases = [
      { a: [[1, 2, 3]], b: [[4, 5, 6]], isSubset: false },
      { a: [[1, 2, 3], [4, 5, 6]], b: [[1, 2, 3]], isSubset: true },
      { a: [[1, 2, 3], [4, 5, 6]], b: [], isSubset: true },
      { a: [], b: [[1, 2, 3]], isSubset: false },
      { a: [], b: [], isSubset: true },
      { a: [[1, 2, 3]], b: [[1, 2, 3], [4, 5, 6]], isSubset: false },
      { a: [[1, 2, 3]], b: [[1, 2]], isSubset: false }
    ]

    for (const tc of testCases) {
      expect(isSubset(tc.a.map(b => new Uint8Array(b)), tc.b.map(b => new Uint8Array(b)))).to.equal(tc.isSubset)
    }
  })
})
