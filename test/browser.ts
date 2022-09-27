/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { Noise } from "@chainsafe/libp2p-noise"
import { bases, digest } from 'multiformats/basics'
import { WebTransport as webTransportPb } from '../src/proto/webtransport'
import { WebTransport as WebTransportLibp2p } from '../src/index'
// import * as PeerId from '@libp2p/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { Source } from 'it-stream-types'
import { peerIdFromString } from '@libp2p/peer-id'
// import { Duplex } from 'it-stream-types'
// import * as digest from 'multiformats/hashes/digest'
// import * as multibase from 'multiformats/bases/base'
// import { pipe } from 'it-pipe'
// import all from 'it-all'
// import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
// import { WebSockets } from '../src/index.js'
// import { isBrowser, isWebWorker } from 'wherearewe'
// import type { Connection } from '@libp2p/interface-connection'

import { createLibp2p } from 'libp2p'


// const protocol = '/echo/1.0.0'


declare global {
  interface Window {
    WebTransport: any;
  }
}

describe('libp2p-websockets', () => {
  it("echo with vanilla webtransport", async () => {
    const url = "https://usa.echo.webtransport.day"
    const wt = new window.WebTransport(url)
    await wt.ready
    const stream = await wt.createBidirectionalStream()
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    await writer.write(new Uint8Array([1, 2, 3]))
    const val = (await reader.read()).value
    console.log(val)

    expect([...val]).to.eql([1, 2, 3])
  })

  it("Connects to go-libp2p", async () => {
    const maStr = "/ip4/127.0.0.1/udp/9195/quic/webtransport/certhash/uEiCbtWiZ2ESj0U7TVfA0gsXzE_2drqlKuDoD3u-8varjVQ/certhash/uEiCJH8dlwVZZEEXn-VEDJtKtYexsiXEvyLkPtTsHdLV32Q/p2p/12D3KooWJQe521ThWpFmrkV3aHnC53ngtFtBRoZzcztKsvJ89nWx"
    const ma = multiaddr(maStr)
    const parts = ma.stringTuples()
    const certhashparts = parts.filter(part => part[0] == protocols("certhash").code)
    const lastPart = parts[parts.length - 1]
    console.log(lastPart)
    const remotePeer = peerIdFromString(lastPart[1]!)


    Object.values(bases).reduce((acc: { [key: string]: typeof bases[keyof typeof bases] }, b) => (acc[b.prefix] = b, acc), {})
    // @ts-ignore
    const multibaseDecoder = Object.values(bases).map(b => b.decoder).reduce((d, b) => d.or(b))

    function decodeCerthashStr(s: string) {
      return digest.decode(multibaseDecoder.decode(s))
    }

    const certhashes = certhashparts.map(s => decodeCerthashStr(s[1]!))

    const url = "https://127.0.0.1:9195/.well-known/libp2p-webtransport"
    const wt = new window.WebTransport(url, {
      serverCertificateHashes: certhashes.map(certhash => ({
        algorithm: "sha-256",
        value: certhash.digest,
      }))
    })


    await wt.ready

    const stream = await wt.createBidirectionalStream()
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    // const duplex: Duplex = {
    const duplex = {
      source: (async function* () {
        while (true) {
          const val = await reader.read()
          yield val.value
        }
      })(),
      sink: async function (source: Source<Uint8Array>) {
        for await (const chunk of source) {
          await writer.write(chunk)
        }
      }
    }

    let msgBytes = webTransportPb.encode({
      certHashes: certhashes.map(ch => ch.bytes)
    })



    const noise = new Noise(undefined, msgBytes)

    const localPeer = await createEd25519PeerId()

    // authenticate webtransport
    await noise.secureOutbound(localPeer, duplex, remotePeer)
    await writer.abort()
    await reader.cancel()


    // noise.secureOutbound()


    // const wt = new window.WebTransport(url)
    // await wt.ready
    // const stream = await wt.createBidirectionalStream()
    // const writer = stream.writable.getWriter()
    // const reader = stream.readable.getReader()
    // await writer.write(new Uint8Array([1, 2, 3]))
    // const val = (await reader.read()).value
    // console.log(val)

    // expect([...val]).to.eql([1, 2, 3])
  })

  // const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  // let ws: WebSockets
  // let conn: Connection

  // beforeEach(async () => {
  //   ws = new WebSockets()
  //   conn = await ws.dial(ma, { upgrader: mockUpgrader() })
  // })

  // afterEach(async () => {
  //   await conn.close()
  // })

  // it('echo', async () => {
  //   const data = uint8ArrayFromString('hey')
  //   const stream = await conn.newStream([protocol])

  //   const res = await pipe(
  //     [data],
  //     stream,
  //     async (source) => await all(source)
  //   )

  //   expect(res[0].subarray()).to.equalBytes(data)
  // })

  // it('should filter out no DNS websocket addresses', function () {
  //   const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws')
  //   const ma2 = multiaddr('/ip4/127.0.0.1/tcp/443/wss')
  //   const ma3 = multiaddr('/ip6/::1/tcp/80/ws')
  //   const ma4 = multiaddr('/ip6/::1/tcp/443/wss')

  //   const valid = ws.filter([ma1, ma2, ma3, ma4])

  //   if (isBrowser || isWebWorker) {
  //     expect(valid.length).to.equal(0)
  //   } else {
  //     expect(valid.length).to.equal(4)
  //   }
  // })

  // describe('stress', () => {
  //   it('one big write', async () => {
  //     const data = new Uint8Array(1000000).fill(5)
  //     const stream = await conn.newStream([protocol])

  //     const res = await pipe(
  //       [data],
  //       stream,
  //       async (source) => await all(source)
  //     )

  //     expect(res[0].subarray()).to.deep.equal(data)
  //   })

  //   it('many writes', async function () {
  //     this.timeout(60000)

  //     const count = 20000
  //     const data = Array(count).fill(0).map(() => uint8ArrayFromString(Math.random().toString()))
  //     const stream = await conn.newStream([protocol])

  //     const res = await pipe(
  //       data,
  //       stream,
  //       async (source) => await all(source)
  //     )

  //     expect(res.map(list => list.subarray())).to.deep.equal(data)
  //   })
  // })

  // it('.createServer throws in browser', () => {
  //   expect(new WebSockets().createListener).to.throw()
  // })

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
