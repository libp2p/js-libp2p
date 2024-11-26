/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import fs from 'node:fs'
import http from 'node:http'
import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import { isLoopbackAddr } from 'is-loopback-addr'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import * as filters from '../src/filters.js'
import { webSockets } from '../src/index.js'
import type { Connection, Libp2pEvents, Listener, Transport, Upgrader, TLSCertificate } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('instantiate the transport', () => {
  it('create', () => {
    const ws = webSockets()({
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    })
    expect(ws).to.exist()
  })
})

describe('listen', () => {
  let upgrader: StubbedInstance<Upgrader>

  beforeEach(() => {
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })
  })

  describe('ip4', () => {
    let ws: Transport
    const ma = multiaddr('/ip4/127.0.0.1/tcp/47382/ws')
    let listener: Listener

    beforeEach(() => {
      ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
    })

    afterEach(async () => {
      await listener.close()
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

    it('should error on starting two listeners on same address', async () => {
      listener = ws.createListener({ upgrader })
      const dumbServer = http.createServer()
      const options = ma.toOptions()
      await new Promise<void>(resolve => dumbServer.listen(options.port, options.host, resolve))
      await expect(listener.listen(ma)).to.eventually.rejectedWith('listen EADDRINUSE')
      await new Promise<void>(resolve => dumbServer.close(() => { resolve() }))
    })

    it('listen, check for the close event', (done) => {
      const listener = ws.createListener({ upgrader })

      listener.addEventListener('listening', () => {
        listener.addEventListener('close', () => { done() })
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
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().port)).to.not.include(0)
    })

    it('listen on any Interface', async () => {
      const ma = multiaddr('/ip4/0.0.0.0/tcp/0/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
    })

    it('getAddrs', async () => {
      listener = ws.createListener({ upgrader })
      await listener.listen(ma)
      const addrs = listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs[0]).to.deep.equal(ma)
    })

    it('getAddrs on port 0 listen', async () => {
      const addr = multiaddr('/ip4/127.0.0.1/tcp/0/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
    })

    it('getAddrs from listening on 0.0.0.0', async () => {
      const addr = multiaddr('/ip4/0.0.0.0/tcp/47382/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
    })

    it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
      const addr = multiaddr('/ip4/0.0.0.0/tcp/0/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => a.toOptions().host)).to.not.include('0.0.0.0')
      expect(addrs.map((a) => a.toOptions().port)).to.not.include('0')
    })

    it('getAddrs preserves p2p Id', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/47382/ws')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
      const addrs = listener.getAddrs()
      expect(addrs.length).to.equal(1)
      expect(addrs[0]).to.deep.equal(ma)
    })
  })

  describe('ip6', () => {
    let ws: Transport
    const ma = multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(() => {
      ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
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
        listener.addEventListener('close', () => { done() })
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
  let upgrader: StubbedInstance<Upgrader>

  beforeEach(() => {
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })
  })

  describe('ip4', () => {
    let ws: Transport
    let listener: Listener
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws')

    beforeEach(async () => {
      ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
      listener = ws.createListener({
        upgrader
      })
      await listener.listen(ma)
    })

    afterEach(async () => {
      await listener.close()
    })

    it('dial', async () => {
      await expect(ws.dial(ma, {
        upgrader
      })).to.eventually.be.ok()
    })

    it('dial with p2p Id', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      await expect(ws.dial(ma, {
        upgrader
      })).to.eventually.be.ok()
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
      const ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })

      const listener = ws.createListener({ upgrader })

      // Listen on the multiaddr
      await listener.listen(ma)

      const localAddrs = listener.getAddrs()
      expect(localAddrs.length).to.equal(1)

      // Dial to that address
      await ws.dial(localAddrs[0], { upgrader })

      // Wait for the incoming dial to be handled
      await pWaitFor(() => {
        return upgrader.upgradeInbound.callCount === 1
      })

      // close the listener
      await listener.close()
    })
  })

  describe('ip4 no loopback', () => {
    let ws: Transport
    let listener: Listener
    const ma = multiaddr('/ip4/0.0.0.0/tcp/0/ws')

    beforeEach(async () => {
      ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
      listener = ws.createListener({
        upgrader
      })
      await listener.listen(ma)
    })

    afterEach(async () => {
      await listener.close()
    })

    it('dial', async () => {
      const addrs = listener.getAddrs().filter((ma) => {
        const { address } = ma.nodeAddress()

        return !isLoopbackAddr(address)
      })

      if (addrs.length === 0) {
        return
      }

      // Dial first no loopback address
      await expect(ws.dial(addrs[0], { upgrader }))
        .to.eventually.be.ok()
    })
  })

  describe('ip4 with wss', () => {
    let ws: Transport
    let listener: Listener
    const ma = multiaddr('/ip4/127.0.0.1/tcp/37284/tls/ws')

    beforeEach(async () => {
      ws = webSockets({
        websocket: {
          rejectUnauthorized: false
        },
        https: {
          cert: fs.readFileSync('./test/fixtures/certificate.pem'),
          key: fs.readFileSync('./test/fixtures/key.pem')
        }
      })({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
      listener = ws.createListener({
        upgrader
      })
      await listener.listen(ma)
    })

    afterEach(async () => {
      await listener.close()
    })

    it('should listen on wss address', () => {
      const addrs = listener.getAddrs()

      expect(addrs).to.have.lengthOf(1)
      expect(ma.equals(addrs[0])).to.eql(true)
    })

    it('dial ip4', async () => {
      await expect(ws.dial(ma, { upgrader }))
        .to.eventually.be.ok()
    })
  })

  describe('ip6', () => {
    let ws: Transport
    let listener: Listener
    const ma = multiaddr('/ip6/::1/tcp/9091/ws')

    beforeEach(async () => {
      ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
      listener = ws.createListener({
        upgrader
      })
      await listener.listen(ma)
    })

    afterEach(async () => {
      await listener.close()
    })

    it('dial ip6', async () => {
      await expect(ws.dial(ma, { upgrader }))
        .to.eventually.be.ok()
    })

    it('dial with p2p Id', async () => {
      const ma = multiaddr('/ip6/::1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      await expect(ws.dial(ma, { upgrader }))
        .to.eventually.be.ok()
    })
  })
})

describe('filter addrs', () => {
  let ws: Transport

  describe('default filter addrs with only dns', () => {
    before(() => {
      ws = webSockets()({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
    })

    it('should filter out invalid WS addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = multiaddr('/ip6/::1/tcp/80')
      const ma4 = multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.dialFilter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct dns address', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.dialFilter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })
  })

  describe('custom filter addrs', () => {
    before(() => {
      ws = webSockets({ filter: filters.all })({
        events: new TypedEventEmitter(),
        logger: defaultLogger()
      })
    })

    it('should fail invalid WS addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/9090')
      const ma2 = multiaddr('/ip4/127.0.0.1/udp/9090')
      const ma3 = multiaddr('/ip6/::1/tcp/80')
      const ma4 = multiaddr('/dnsaddr/ipfs.io/tcp/80')

      const valid = ws.dialFilter([ma1, ma2, ma3, ma4])
      expect(valid.length).to.equal(0)
    })

    it('should filter correct ipv4 addresses', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/443/wss')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv4 addresses with ipfs id', function () {
      const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip4/127.0.0.1/tcp/80/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 address', function () {
      const ma1 = multiaddr('/ip6/::1/tcp/80/ws')
      const ma2 = multiaddr('/ip6/::1/tcp/443/wss')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct ipv6 addresses with ipfs id', function () {
      const ma1 = multiaddr('/ip6/::1/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/ip6/::1/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns address', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/ws')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws')
      const ma3 = multiaddr('/dnsaddr/ipfs.io/tcp/80/wss')

      const valid = ws.dialFilter([ma1, ma2, ma3])
      expect(valid.length).to.equal(3)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
      expect(valid[2]).to.deep.equal(ma3)
    })

    it('should filter correct dns address with ipfs id', function () {
      const ma1 = multiaddr('/dnsaddr/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dnsaddr/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns4 address', function () {
      const ma1 = multiaddr('/dns4/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns4/ipfs.io/tcp/443/wss')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss')

      const valid = ws.dialFilter([ma1, ma2])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma2)
    })

    it('should filter correct dns6 address with ipfs id', function () {
      const ma1 = multiaddr('/dns6/ipfs.io/tcp/80/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      const ma2 = multiaddr('/dns6/ipfs.io/tcp/443/wss/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma1, ma2])
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

      const valid = ws.dialFilter([ma1, ma2, ma3, ma4, mh5])
      expect(valid.length).to.equal(2)
      expect(valid[0]).to.deep.equal(ma1)
      expect(valid[1]).to.deep.equal(ma4)
    })

    it('filter a single addr for this transport', () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      const valid = ws.dialFilter([ma])
      expect(valid.length).to.equal(1)
      expect(valid[0]).to.deep.equal(ma)
    })
  })
})

describe('auto-tls (IPv4)', () => {
  let ws: Transport
  let listener: Listener
  let events: TypedEventEmitter<Libp2pEvents>
  const ma = multiaddr('/ip4/127.0.0.1/tcp/37284/ws')

  beforeEach(async () => {
    events = new TypedEventEmitter()

    const upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async () => {
        return stubInterface<Connection>()
      }
    })

    ws = webSockets({
      websocket: {
        rejectUnauthorized: false
      }
    })({
      events,
      logger: defaultLogger()
    })
    listener = ws.createListener({
      upgrader
    })
    await listener.listen(ma)
  })

  afterEach(async () => {
    await listener.close()
  })

  it('should listen on wss after a certificate is found', async () => {
    const addrs = listener.getAddrs()
    expect(addrs).to.have.lengthOf(1)
    expect(WebSockets.exactMatch(addrs[0])).to.be.true()
    const listeningPromise = pEvent(listener, 'listening')

    events.safeDispatchEvent<TLSCertificate>('certificate:provision', {
      detail: {
        key: fs.readFileSync('./test/fixtures/key.pem', {
          encoding: 'utf-8'
        }),
        cert: fs.readFileSync('./test/fixtures/certificate.pem', {
          encoding: 'utf-8'
        })
      }
    })

    await listeningPromise

    const addrs2 = listener.getAddrs()
    expect(addrs2).to.have.lengthOf(2)
    expect(WebSockets.exactMatch(addrs2[0])).to.be.true()
    expect(WebSocketsSecure.exactMatch(addrs2[1])).to.be.true()

    const wsOptions = addrs2[0].toOptions()
    const wssOptions = addrs2[1].toOptions()

    expect(wsOptions.host).to.equal(wssOptions.host)
    expect(wsOptions.port).to.equal(wssOptions.port)
  })
})

describe('auto-tls (IPv6)', () => {
  let ws: Transport
  let listener: Listener
  let events: TypedEventEmitter<Libp2pEvents>
  const ma = multiaddr('/ip6/::1/tcp/37284/ws')

  beforeEach(async () => {
    events = new TypedEventEmitter()

    const upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async () => {
        return stubInterface<Connection>()
      }
    })

    ws = webSockets({
      websocket: {
        rejectUnauthorized: false
      }
    })({
      events,
      logger: defaultLogger()
    })
    listener = ws.createListener({
      upgrader
    })
    await listener.listen(ma)
  })

  afterEach(async () => {
    await listener.close()
  })

  it('should listen on wss after a certificate is found', async () => {
    const addrs = listener.getAddrs()
    expect(addrs).to.have.lengthOf(1)
    expect(WebSockets.exactMatch(addrs[0])).to.be.true()
    const listeningPromise = pEvent(listener, 'listening')

    events.safeDispatchEvent<TLSCertificate>('certificate:provision', {
      detail: {
        key: fs.readFileSync('./test/fixtures/key.pem', {
          encoding: 'utf-8'
        }),
        cert: fs.readFileSync('./test/fixtures/certificate.pem', {
          encoding: 'utf-8'
        })
      }
    })

    await listeningPromise

    const addrs2 = listener.getAddrs()
    expect(addrs2).to.have.lengthOf(2)
    expect(WebSockets.exactMatch(addrs2[0])).to.be.true()
    expect(WebSocketsSecure.exactMatch(addrs2[1])).to.be.true()

    const wsOptions = addrs2[0].toOptions()
    const wssOptions = addrs2[1].toOptions()

    expect(wsOptions.host).to.equal(wssOptions.host)
    expect(wsOptions.port).to.equal(wssOptions.port)
  })
})
