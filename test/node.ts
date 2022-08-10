/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import https from 'https'
import fs from 'fs'
import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import { goodbye } from 'it-goodbye'
import { isLoopbackAddr } from 'is-loopback-addr'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { mockRegistrar, mockUpgrader } from '@libp2p/interface-mocks'
import defer from 'p-defer'
import waitFor from 'p-wait-for'
import { WebSockets } from '../src/index.js'
import * as filters from '../src/filters.js'
import drain from 'it-drain'
import type { Listener } from '@libp2p/interface-transport'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Source } from 'it-stream-types'
import './compliance.node.js'

async function * toBuffers (source: Source<Uint8ArrayList>) {
  for await (const list of source) {
    yield * list
  }
}

const protocol = '/say-hello/1.0.0'
const registrar = mockRegistrar()
void registrar.handle(protocol, (evt) => {
  void pipe([
    uint8ArrayFromString('hey')
  ],
  evt.stream,
  drain
  )
})
const upgrader = mockUpgrader({
  registrar
})

describe('instantiate the transport', () => {
  it('create', () => {
    const ws = new WebSockets()
    expect(ws).to.exist()
  })
})

describe('listen', () => {
  it('should close connections when stopping the listener', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/47382/ws')

    const ws = new WebSockets()
    const listener = ws.createListener({
      handler: (conn) => {
        void conn.newStream([protocol]).then(async (stream) => {
          return await pipe(stream, stream)
        })
      },
      upgrader
    })
    await listener.listen(ma)

    const conn = await ws.dial(ma, {
      upgrader
    })
    const stream = await conn.newStream([protocol])
    void pipe(stream, stream)

    await listener.close()

    await waitFor(() => conn.stat.timeline.close != null)
  })

  describe('ip4', () => {
    let ws: WebSockets
    const ma = multiaddr('/ip4/127.0.0.1/tcp/47382/ws')
    let listener: Listener

    beforeEach(() => {
      ws = new WebSockets()
    })

    afterEach(async () => {
      return await listener.close()
    })

    it('listen, check for promise', async () => {
      listener = ws.createListener({ upgrader })
      await listener.listen(ma)
    })

    it('listen, check for listening event', (done) => {
      listener = ws.createListener({ upgrader })

      listener.addEventListener('listening', () => {
        done()
      })

      void listener.listen(ma)
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener({ upgrader })

      listener.addEventListener('listening', () => {
        listener.addEventListener('close', () => done())
        void listener.close()
      })

      void listener.listen(ma)
    })

    it('listen on addr with /ipfs/QmHASH', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/47382/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
    })

    it('listen on port 0', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/0/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().port)).to.not.include(0)
    })

    it('listen on any Interface', async () => {
      const ma = multiaddr('/ip4/0.0.0.0/tcp/0/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
    })

    it('getAddrs', async () => {
      listener = ws.createListener({ upgrader })
      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs[0]).to.deep.equal(ma)
    })

    it('getAddrs on port 0 listen', async () => {
      const addr = multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = await listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
    })

    it('getAddrs from listening on 0.0.0.0', async () => {
      const addr = multiaddr('/ip4/0.0.0.0/tcp/47382/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
    })

    it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
      const addr = multiaddr('/ip4/0.0.0.0/tcp/0/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
      expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
    })

    it('getAddrs preserves p2p Id', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/47382/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs[0]).to.deep.equal(ma)
    })
  })

  describe('ip6', () => {
    let ws: WebSockets
    const ma = multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(() => {
      ws = new WebSockets()
    })

    it('listen, check for promise', async () => {
      const listener = ws.createListener({ upgrader })
      await listener.listen(ma)
      await listener.close()
    })

    it('listen, check for listening event', (done) => {
      const listener = ws.createListener({ upgrader })

      listener.addEventListener('listening', () => {
        void listener.close().then(done, done)
      })

      void listener.listen(ma)
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener({ upgrader })

      listener.addEventListener('listening', () => {
        listener.addEventListener('close', () => done())
        void listener.close()
      })

      void listener.listen(ma)
    })

    it('listen on addr with /ipfs/QmHASH', async () => {
      const ma = multiaddr('/ip6/::1/tcp/9091/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const listener = ws.createListener({ upgrader })
      await listener.listen(ma)
      await listener.close()
    })
  })
})

describe('dial', () => {
  describe('ip4', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws')

    beforeEach(async () => {
      ws = new WebSockets()
      listener = ws.createListener({ upgrader })
      return await listener.listen(ma)
    })

    afterEach(async () => await listener.close())

    it('dial', async () => {
      const conn = await ws.dial(ma, { upgrader })
      const stream = await conn.newStream([protocol])

      expect((await all(stream.source)).map(list => list.subarray())).to.deep.equal([uint8ArrayFromString('hey')])
      await conn.close()
    })

    it('dial with p2p Id', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const conn = await ws.dial(ma, { upgrader })
      const stream = await conn.newStream([protocol])

      expect((await all(stream.source)).map(list => list.subarray())).to.deep.equal([uint8ArrayFromString('hey')])
      await conn.close()
    })

    it('dial should throw on immediate abort', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      const controller = new AbortController()

      const conn = ws.dial(ma, { signal: controller.signal, upgrader })
      controller.abort()

      await expect(conn).to.eventually.be.rejected()
    })

    it('should resolve port 0', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      const ws = new WebSockets()

      // Create a Promise that resolves when a connection is handled
      const deferred = defer()

      const listener = ws.createListener({ handler: deferred.resolve, upgrader })

      // Listen on the multiaddr
      await listener.listen(ma)

      const localAddrs = listener.getAddrs()
      expect(localAddrs.length).to.equal(1)

      // Dial to that address
      await ws.dial(localAddrs[0], { upgrader })

      // Wait for the incoming dial to be handled
      await deferred.promise

      // close the listener
      await listener.close()
    })
  })

  describe('ip4 no loopback', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = multiaddr('/ip4/0.0.0.0/tcp/0/ws')

    beforeEach(async () => {
      ws = new WebSockets()
      listener = ws.createListener({
        handler: (conn) => {
          void conn.newStream([protocol]).then(async (stream) => {
            return await pipe(stream, stream)
          })
        },
        upgrader
      })
      return await listener.listen(ma)
    })

    afterEach(async () => await listener.close())

    it('dial', async () => {
      const addrs = listener.getAddrs().filter((ma) => {
        const { address } = ma.nodeAddress()

        return !isLoopbackAddr(address)
      })

      // Dial first no loopback address
      const conn = await ws.dial(addrs[0], { upgrader })
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const stream = await conn.newStream([protocol])

      await expect(pipe(
        s,
        stream,
        toBuffers,
        s
      )).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })
  })

  describe('ip4 with wss', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = multiaddr('/ip4/127.0.0.1/tcp/37284/wss')
    let server: https.Server

    beforeEach(async () => {
      server = https.createServer({
        cert: fs.readFileSync('./test/fixtures/certificate.pem'),
        key: fs.readFileSync('./test/fixtures/key.pem')
      })
      ws = new WebSockets({ websocket: { rejectUnauthorized: false }, server })
      listener = ws.createListener({
        handler: (conn) => {
          void conn.newStream([protocol]).then(async (stream) => {
            return await pipe(stream, stream)
          })
        },
        upgrader
      })
      return await listener.listen(ma)
    })

    afterEach(async () => {
      await listener.close()
      await server.close()
    })

    it('should listen on wss address', () => {
      const addrs = listener.getAddrs()

      expect(addrs).to.have.lengthOf(1)
      expect(ma.equals(addrs[0])).to.eql(true)
    })

    it('dial ip4', async () => {
      const conn = await ws.dial(ma, { upgrader })
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const stream = await conn.newStream([protocol])

      const res = await pipe(s, stream, toBuffers, s)

      expect(res[0]).to.equalBytes(uint8ArrayFromString('hey'))
      await conn.close()
    })
  })

  describe('ip6', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(async () => {
      ws = new WebSockets()
      listener = ws.createListener({
        handler: (conn) => {
          void conn.newStream([protocol]).then(async (stream) => {
            return await pipe(stream, stream)
          })
        },
        upgrader
      })
      return await listener.listen(ma)
    })

    afterEach(async () => await listener.close())

    it('dial ip6', async () => {
      const conn = await ws.dial(ma, { upgrader })
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const stream = await conn.newStream([protocol])

      await expect(pipe(s, stream, toBuffers, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })

    it('dial with p2p Id', async () => {
      const ma = multiaddr('/ip6/::1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const conn = await ws.dial(ma, { upgrader })

      const s = goodbye({
        source: [uint8ArrayFromString('hey')],
        sink: all
      })
      const stream = await conn.newStream([protocol])

      await expect(pipe(s, stream, toBuffers, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })
  })
})

describe('filter addrs', () => {
  let ws: WebSockets

  describe('default filter addrs with only dns', () => {
    before(() => {
      ws = new WebSockets()
    })

    it('should filter out invalid WS addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = multiaddr('/ip6/::1/tcp/80')
      const ma4 = multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.filter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct dns address', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.filter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })
  })

  describe('custom filter addrs', () => {
    before(() => {
      ws = new WebSockets({ filter: filters.all })
    })

    it('should fail invalid WS addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = multiaddr('/ip6/::1/tcp/80')
      const ma4 = multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.filter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct ipv4 addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv4 addresses with ipfs id', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/80/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 address', function () {
      const ma1 = multiaddr('/ip6/::1/tcp/80/ws')
      const ma2 = multiaddr('/ip6/::1/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 addresses with ipfs id', function () {
      const ma1 = multiaddr('/ip6/::1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip6/::1/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns address', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.filter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter mixed addresses', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma3 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma4 = multiaddr('/dns6/ipfs.io/ws')
      const mh5 = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw' +
        '/p2p-circuit/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2, ma3, ma4, mh5])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma4)
    })

    it('filter a single addr for this transport', () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma])
      expect(valid.length).to.equal(1)
      expect(valid[0]).to.deep.equal(ma)
    })
  })
})
