/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { Multiaddr } from '@multiformats/multiaddr'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { WebSockets } from '../src/index.js'
import { mockUpgrader } from '@libp2p/interface-mocks'
import env from 'wherearewe'
import type { Connection } from '@libp2p/interface-connection'

const protocol = '/echo/1.0.0'

describe('libp2p-websockets', () => {
  const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9095/ws')
  let ws: WebSockets
  let conn: Connection

  beforeEach(async () => {
    ws = new WebSockets()
    conn = await ws.dial(ma, { upgrader: mockUpgrader() })
  })

  afterEach(async () => {
    await conn.close()
  })

  it('echo', async () => {
    const data = uint8ArrayFromString('hey')
    const { stream } = await conn.newStream([protocol])

    const res = await pipe(
      [data],
      stream,
      async (source) => await all(source)
    )

    expect(res).to.deep.equal([data])
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
      const data = new Uint8Array(1000000).fill(5)
      const { stream } = await conn.newStream([protocol])

      const res = await pipe(
        [data],
        stream,
        async (source) => await all(source)
      )

      expect(res).to.deep.equal([data])
    })

    it('many writes', async function () {
      this.timeout(60000)

      const count = 20000
      const data = Array(count).fill(0).map(() => uint8ArrayFromString(Math.random().toString()))
      const { stream } = await conn.newStream([protocol])

      const res = await pipe(
        data,
        stream,
        async (source) => await all(source)
      )

      expect(res).to.deep.equal(data)
    })
  })

  it('.createServer throws in browser', () => {
    expect(new WebSockets().createListener).to.throw()
  })
})
