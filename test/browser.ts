/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { Noise } from "@chainsafe/libp2p-noise"
import { WebTransport as WebTransportLibp2p } from '../src/index'

import { createLibp2p } from 'libp2p'

declare global {
  interface Window {
    WebTransport: any;
  }
}

describe('libp2p-webtransport', () => {
  it("webtransport connects to go-libp2p", async () => {
    const maStr = "/ip4/127.0.0.1/udp/9195/quic/webtransport/certhash/uEiCngCsuegJXf24rzC_lKiISlWUg8Ts1l3XFXQgXw_p4dQ/certhash/uEiDCni4m1KyUNdHquD6ehWul6TDlXRIgw-kVlutATZLmEQ/p2p/12D3KooWK6C8p6zmDqGrLDLPgQUHwzmLrDmui8ufWTMuSae3ZGkW"
    const ma = multiaddr(maStr)
    const node = await createLibp2p({
      transports: [new WebTransportLibp2p()],
      connectionEncryption: [new Noise()]
    })

    await node.start()
    const res = await node.ping(ma)
    console.log("Ping ", res)
    expect(res).to.greaterThan(0)

    await node.stop()
    const conns = node.connectionManager.getConnections()
    console.log("Conns", conns)
    expect(conns.length).to.equal(0)
  })
})
