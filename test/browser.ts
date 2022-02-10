/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import { goodbye } from 'it-goodbye'
import take from 'it-take'
import all from 'it-all'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { WebSockets } from '../src/index.js'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/transport/utils'
import env from 'wherearewe'
import type { Connection } from '@libp2p/interfaces/connection'

const upgrader = mockUpgrader()

describe('libp2p-websockets', () => {
  const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  let ws: WebSockets
  let conn: Connection

  beforeEach(async () => {
    ws = new WebSockets({ upgrader })
    conn = await ws.dial(ma)
  })

  afterEach(async () => {
    await conn.close()
  })

  it('echo', async () => {
    const message = uint8ArrayFromString('Hello World!')
    const s = goodbye({ source: [message], sink: all })
    const { stream } = await conn.newStream(['echo'])

    const results = await pipe(s, stream, s)
    expect(results).to.eql([message])
  })

  it('should filter out no DNS websocket addresses', function () {
    const ma1 = new Multiaddr('/ip4/127.0.0.1/tcp/80/ws')
    const ma2 = new Multiaddr('/ip4/127.0.0.1/tcp/443/wss')
    const ma3 = new Multiaddr('/ip6/::1/tcp/80/ws')
    const ma4 = new Multiaddr('/ip6/::1/tcp/443/wss')

    const valid = ws.filter([ma1, ma2, ma3, ma4])

    if (env.isBrowser || env.isWebWorker) {
      expect(valid.length).to.equal(0)
    } else {
      expect(valid.length).to.equal(4)
    }
  })

  describe('stress', () => {
    it('one big write', async () => {
      const rawMessage = new Uint8Array(1000000).fill(5)

      const s = goodbye({ source: [rawMessage], sink: all })
      const { stream } = await conn.newStream(['echo'])

      const results = await pipe(s, stream, s)
      expect(results).to.eql([rawMessage])
    })

    it('many writes', async function () {
      this.timeout(10000)
      const s = goodbye({
        source: pipe(
          (function * () {
            while (true) {
              yield uint8ArrayFromString(Math.random().toString())
            }
          }()),
          (source) => take(source, 20000)
        ),
        sink: all
      })

      const { stream } = await conn.newStream(['echo'])

      const results = await pipe(s, stream, s)
      expect(results).to.have.length(20000)
    })
  })

  it('.createServer throws in browser', () => {
    expect(new WebSockets({ upgrader }).createListener).to.throw()
  })
})
