/* eslint-disable no-console */
/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { Noise } from '@chainsafe/libp2p-noise'
import { WebTransport as WebTransportLibp2p } from '../src/index'

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
})
