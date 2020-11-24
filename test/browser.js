/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')

const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const goodbye = require('it-goodbye')
const { collect, take } = require('streaming-iterables')
const uint8ArrayFromString = require('uint8arrays/from-string')

const WS = require('../src')

const mockUpgrader = {
  upgradeInbound: maConn => maConn,
  upgradeOutbound: maConn => maConn
}

describe('libp2p-websockets', () => {
  const ma = multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  let ws
  let conn

  beforeEach(async () => {
    ws = new WS({ upgrader: mockUpgrader })
    conn = await ws.dial(ma)
  })

  it('echo', async () => {
    const message = uint8ArrayFromString('Hello World!')
    const s = goodbye({ source: [message], sink: collect })

    const results = await pipe(s, conn, s)
    expect(results).to.eql([message])
  })

  it('should filter out no DNS websocket addresses', function () {
    const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws')
    const ma2 = multiaddr('/ip4/127.0.0.1/tcp/443/wss')
    const ma3 = multiaddr('/ip6/::1/tcp/80/ws')
    const ma4 = multiaddr('/ip6/::1/tcp/443/wss')

    const valid = ws.filter([ma1, ma2, ma3, ma4])
    expect(valid.length).to.equal(0)
  })

  describe('stress', () => {
    it('one big write', async () => {
      const rawMessage = new Uint8Array(1000000).fill('a')

      const s = goodbye({ source: [rawMessage], sink: collect })

      const results = await pipe(s, conn, s)
      expect(results).to.eql([rawMessage])
    })

    it('many writes', async function () {
      this.timeout(10000)
      const s = goodbye({
        source: pipe(
          {
            [Symbol.iterator] () { return this },
            next: () => ({ done: false, value: uint8ArrayFromString(Math.random().toString()) })
          },
          take(20000)
        ),
        sink: collect
      })

      const result = await pipe(s, conn, s)
      expect(result).to.have.length(20000)
    })
  })

  it('.createServer throws in browser', () => {
    expect(new WS({ upgrader: mockUpgrader }).createListener).to.throw()
  })
})
