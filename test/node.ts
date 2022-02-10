/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import https from 'https'
import fs from 'fs'
import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { goodbye } from 'it-goodbye'
import { isLoopbackAddr } from 'is-loopback-addr'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { mockUpgrader } from '@libp2p/interface-compliance-tests/transport/utils'
import defer from 'p-defer'
import waitFor from 'p-wait-for'
import { WebSockets } from '../src/index.js'
import * as filters from '../src/filters.js'
import type { Listener } from '@libp2p/interfaces/transport'

import './compliance.node.js'

const upgrader = mockUpgrader()

describe('instantiate the transport', () => {
  it('create', () => {
    const ws = new WebSockets({ upgrader })
    expect(ws).to.exist()
  })
})

describe('listen', () => {
  it('should close connections when stopping the listener', async () => {
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/47382/ws')

    const ws = new WebSockets({ upgrader })
    const listener = ws.createListener({
      handler: (conn) => {
        void conn.newStream(['echo']).then(async ({ stream }) => {
          return await pipe(stream, stream)
        })
      }
    })
    await listener.listen(ma)

    const conn = await ws.dial(ma)
    const { stream } = await conn.newStream(['echo'])
    void pipe(stream, stream)

    await listener.close()

    await waitFor(() => conn.stat.timeline.close != null)
  })

  describe('ip4', () => {
    let ws: WebSockets
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/47382/ws')
    let listener: Listener

    beforeEach(() => {
      ws = new WebSockets({ upgrader })
    })

    afterEach(async () => {
      return await listener.close()
    })

    it('listen, check for promise', async () => {
      listener = ws.createListener()
      await listener.listen(ma)
    })

    it('listen, check for listening event', (done) => {
      listener = ws.createListener()

      listener.addEventListener('listening', () => {
        done()
      })

      void listener.listen(ma)
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener()

      listener.addEventListener('listening', () => {
        listener.addEventListener('close', () => done())
        void listener.close()
      })

      void listener.listen(ma)
    })

    it('listen on addr with /ipfs/QmHASH', async () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/47382/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener()

      await listener.listen(ma)
    })

    it('listen on port 0', async () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/0/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener()

      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().port)).to.not.include(0)
    })

    it('listen on any Interface', async () => {
      const ma = new Multiaddr('/ip4/0.0.0.0/tcp/0/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener()

      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
    })

    it('getAddrs', async () => {
      listener = ws.createListener()
      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs[0]).to.deep.equal(ma)
    })

    it('getAddrs on port 0 listen', async () => {
      const addr = new Multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      listener = ws.createListener()
      await listener.listen(addr)
      const addrs = await listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
    })

    it('getAddrs from listening on 0.0.0.0', async () => {
      const addr = new Multiaddr('/ip4/0.0.0.0/tcp/47382/ws')
      listener = ws.createListener()
      await listener.listen(addr)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
    })

    it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
      const addr = new Multiaddr('/ip4/0.0.0.0/tcp/0/ws')
      listener = ws.createListener()
      await listener.listen(addr)
      const addrs = await listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
      expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
    })

    it('getAddrs preserves p2p Id', async () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/47382/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener()

      await listener.listen(ma)
      const addrs = await listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs[0]).to.deep.equal(ma)
    })
  })

  describe('ip6', () => {
    let ws: WebSockets
    const ma = new Multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(() => {
      ws = new WebSockets({ upgrader })
    })

    it('listen, check for promise', async () => {
      const listener = ws.createListener()
      await listener.listen(ma)
      await listener.close()
    })

    it('listen, check for listening event', (done) => {
      const listener = ws.createListener()

      listener.addEventListener('listening', () => {
        void listener.close().then(done, done)
      })

      void listener.listen(ma)
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener()

      listener.addEventListener('listening', () => {
        listener.addEventListener('close', () => done())
        void listener.close()
      })

      void listener.listen(ma)
    })

    it('listen on addr with /ipfs/QmHASH', async () => {
      const ma = new Multiaddr('/ip6/::1/tcp/9091/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const listener = ws.createListener()
      await listener.listen(ma)
      await listener.close()
    })
  })
})

describe('dial', () => {
  describe('ip4', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9091/ws')

    beforeEach(async () => {
      ws = new WebSockets({ upgrader })
      listener = ws.createListener({
        handler: (conn) => {
          void conn.newStream(['echo']).then(async ({ stream }) => {
            return await pipe(stream, stream)
          })
        }
      })
      return await listener.listen(ma)
    })

    afterEach(async () => await listener.close())

    it('dial', async () => {
      const conn = await ws.dial(ma)
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const { stream } = await conn.newStream(['echo'])

      await expect(pipe(s, stream, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })

    it('dial with p2p Id', async () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const conn = await ws.dial(ma)
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const { stream } = await conn.newStream(['echo'])

      await expect(pipe(s, stream, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })

    it('dial should throw on immediate abort', async () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      const controller = new AbortController()

      const conn = ws.dial(ma, { signal: controller.signal })
      controller.abort()

      await expect(conn).to.eventually.be.rejected()
    })

    it('should resolve port 0', async () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      const ws = new WebSockets({ upgrader })

      // Create a Promise that resolves when a connection is handled
      const deferred = defer()

      const listener = ws.createListener({ handler: deferred.resolve })

      // Listen on the multiaddr
      await listener.listen(ma)

      const localAddrs = listener.getAddrs()
      expect(localAddrs.length).to.equal(1)

      // Dial to that address
      await ws.dial(localAddrs[0])

      // Wait for the incoming dial to be handled
      await deferred.promise

      // close the listener
      await listener.close()
    })
  })

  describe('ip4 no loopback', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = new Multiaddr('/ip4/0.0.0.0/tcp/0/ws')

    beforeEach(async () => {
      ws = new WebSockets({ upgrader })
      listener = ws.createListener({
        handler: (conn) => {
          void conn.newStream(['echo']).then(async ({ stream }) => {
            return await pipe(stream, stream)
          })
        }
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
      const conn = await ws.dial(addrs[0])
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const { stream } = await conn.newStream(['echo'])

      await expect(pipe(s, stream, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })
  })

  describe('ip4 with wss', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = new Multiaddr('/ip4/127.0.0.1/tcp/37284/wss')
    let server: https.Server

    beforeEach(async () => {
      server = https.createServer({
        cert: fs.readFileSync('./test/fixtures/certificate.pem'),
        key: fs.readFileSync('./test/fixtures/key.pem')
      })
      ws = new WebSockets({ upgrader })
      listener = ws.createListener({
        server,
        handler: (conn) => {
          void conn.newStream(['echo']).then(async ({ stream }) => {
            return await pipe(stream, stream)
          })
        }
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
      const conn = await ws.dial(ma, { websocket: { rejectUnauthorized: false } })
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const { stream } = await conn.newStream(['echo'])

      const res = await pipe(s, stream, s)

      expect(res[0]).to.equalBytes(uint8ArrayFromString('hey'))
      await conn.close()
    })
  })

  describe('ip6', () => {
    let ws: WebSockets
    let listener: Listener
    const ma = new Multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(async () => {
      ws = new WebSockets({ upgrader })
      listener = ws.createListener({
        handler: (conn) => {
          void conn.newStream(['echo']).then(async ({ stream }) => {
            return await pipe(stream, stream)
          })
        }
      })
      return await listener.listen(ma)
    })

    afterEach(async () => await listener.close())

    it('dial ip6', async () => {
      const conn = await ws.dial(ma)
      const s = goodbye({ source: [uint8ArrayFromString('hey')], sink: all })
      const { stream } = await conn.newStream(['echo'])

      await expect(pipe(s, stream, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })

    it('dial with p2p Id', async () => {
      const ma = new Multiaddr('/ip6/::1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const conn = await ws.dial(ma)

      const s = goodbye({
        source: [uint8ArrayFromString('hey')],
        sink: all
      })
      const { stream } = await conn.newStream(['echo'])

      await expect(pipe(s, stream, s)).to.eventually.deep.equal([uint8ArrayFromString('hey')])
    })
  })
})

describe('filter addrs', () => {
  let ws: WebSockets

  describe('default filter addrs with only dns', () => {
    before(() => {
      ws = new WebSockets({ upgrader })
    })

    it('should filter out invalid WS addresses', function () {
      const ma1 = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = new Multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = new Multiaddr('/ip6/::1/tcp/80')
      const ma4 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.filter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct dns address', function () {
      const ma1 = new Multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.filter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = new Multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = new Multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = new Multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = new Multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = new Multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })
  })

  describe('custom filter addrs', () => {
    before(() => {
      ws = new WebSockets({ upgrader, filter: filters.all })
    })

    it('should fail invalid WS addresses', function () {
      const ma1 = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = new Multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = new Multiaddr('/ip6/::1/tcp/80')
      const ma4 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.filter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct ipv4 addresses', function () {
      const ma1 = new Multiaddr('/ip4/127.0.0.1/tcp/80/ws')
      const ma2 = new Multiaddr('/ip4/127.0.0.1/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv4 addresses with ipfs id', function () {
      const ma1 = new Multiaddr('/ip4/127.0.0.1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/ip4/127.0.0.1/tcp/80/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 address', function () {
      const ma1 = new Multiaddr('/ip6/::1/tcp/80/ws')
      const ma2 = new Multiaddr('/ip6/::1/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 addresses with ipfs id', function () {
      const ma1 = new Multiaddr('/ip6/::1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/ip6/::1/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns address', function () {
      const ma1 = new Multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.filter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = new Multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = new Multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = new Multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = new Multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = new Multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = new Multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter mixed addresses', function () {
      const ma1 = new Multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma3 = new Multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma4 = new Multiaddr('/dns6/ipfs.io/ws')
      const mh5 = new Multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw' +
        '/p2p-circuit/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma1, ma2, ma3, ma4, mh5])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma4)
    })

    it('filter a single addr for this transport', () => {
      const ma = new Multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.filter([ma])
      expect(valid.length).to.equal(1)
      expect(valid[0]).to.deep.equal(ma)
    })
  })
})
