/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { once } from 'node:events'
import fs from 'node:fs'
import http from 'node:http'
import { ConnectionFailedError } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebSocketsSecure } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import { isLoopbackAddr } from 'is-loopback-addr'
import { TypedEventEmitter } from 'main-event'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { setGlobalDispatcher, Agent } from 'undici'
import { WebSocketServer } from 'ws'
import { webSockets } from '../src/index.ts'
import { toWebSocket } from '../src/utils.ts'
import { webSocketToMaConn } from '../src/websocket-to-conn.ts'
import { registerWebSocketPollTests } from './websocket-to-conn.ts'
import type { Connection, Libp2pEvents, Listener, Transport, Upgrader, TLSCertificate } from '@libp2p/interface'
import type { Socket } from 'node:net'
import type { StubbedInstance } from 'sinon-ts'
import type { WebSocket as ServerWebSocket } from 'ws'

// allow connecting to self-signed certificates
setGlobalDispatcher(new Agent({
  connect: {
    rejectUnauthorized: false
  }
}))

registerWebSocketPollTests()

describe('WebSocket abort cleanup', () => {
  let server: http.Server
  let sockets: Set<Socket>
  let wss: WebSocketServer
  let ma: ReturnType<typeof multiaddr>
  let uri: string

  beforeEach(async () => {
    sockets = new Set()
    server = http.createServer()
    wss = new WebSocketServer({ noServer: true })
    server.on('connection', socket => {
      sockets.add(socket)
      socket.on('error', () => {})
      socket.once('close', () => sockets.delete(socket))
    })
    const listening = once(server, 'listening')
    server.listen(0, '127.0.0.1')
    await listening
    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('Expected a TCP listen address')
    }
    ma = multiaddr(`/ip4/127.0.0.1/tcp/${address.port}/ws`)
    uri = `ws://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    // Assertions run before fallback fixture teardown, including on the broken
    // implementation. Never leave the test's own failed-dial sockets behind.
    for (const client of wss.clients) {
      client.terminate()
    }
    for (const socket of sockets) {
      socket.destroy()
    }
    await Promise.all([
      new Promise<void>((resolve, reject) => wss.close(error => error != null ? reject(error) : resolve())),
      new Promise<void>((resolve, reject) => server.close(error => error != null ? reject(error) : resolve()))
    ])
  })

  it('closes an aborted opening dial with a delayed handshake', async () => {
    const ws = webSockets()({ events: new TypedEventEmitter(), logger: defaultLogger() })
    const upgrader = stubInterface<Upgrader>()
    const controller = new AbortController()
    const upgrade = once(server, 'upgrade')
    const dialing = ws.dial(ma, { upgrader, signal: controller.signal })
    const rejected = expect(dialing).to.eventually.be.rejectedWith(ConnectionFailedError, 'Could not connect')
    const [request, socket, head] = await upgrade
    const socketClosed = new Promise<void>(resolve => socket.once('close', () => resolve()))
    expect(socket.destroyed).to.equal(false)
    controller.abort()
    await rejected

    // A rejected dial must not leave an orphan socket once the peer responds.
    if (!socket.destroyed) {
      wss.handleUpgrade(request, socket, head, () => {})
    }
    await socketClosed
    expect(socket.destroyed).to.equal(true)
    expect(upgrader.upgradeOutbound).to.have.property('callCount', 0)
  })

  async function assertAbortedSocketCloses (direction: 'inbound' | 'outbound'): Promise<void> {
    const upgrade = once(server, 'upgrade')
    const client = new WebSocket(uri)
    const opened = once(client, 'open')
    const [request, socket, head] = await upgrade
    const serverClient = await new Promise<ServerWebSocket>(resolve => {
      wss.handleUpgrade(request, socket, head, resolve)
    })
    await opened
    const websocket = direction === 'outbound' ? client : toWebSocket(serverClient)
    const connection = webSocketToMaConn({
      websocket,
      remoteAddr: ma,
      direction,
      log: defaultLogger().forComponent('test:websocket-abort')
    })
    const closed = once(websocket, 'close')
    connection.abort(new Error('test abort'))
    expect(connection.status).to.equal('aborted')
    expect(websocket.readyState).not.to.equal(WebSocket.OPEN)
    await closed
    expect(websocket.readyState).to.equal(WebSocket.CLOSED)
  }

  it('closes the physical outbound WebSocket when its connection is aborted', async () => {
    await assertAbortedSocketCloses('outbound')
  })

  it('closes the physical inbound WebSocket when its connection is aborted', async () => {
    await assertAbortedSocketCloses('inbound')
  })
})

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

    it('should return an empty address list when `getAddrs` called before listening has finished', async () => {
      listener = ws.createListener({ upgrader })

      void listener.listen(ma)

      // call getAddrs before sockets have opened
      expect(listener.getAddrs()).to.be.empty()
    })

    it('should error on starting two listeners on same address', async () => {
      listener = ws.createListener({ upgrader })
      const dumbServer = http.createServer()
      const options = getNetConfig(ma)
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
      expect(addrs.map((a) => getNetConfig(a).port)).to.not.include(0)
    })

    it('listen on any Interface', async () => {
      const ma = multiaddr('/ip4/0.0.0.0/tcp/0/ws/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      listener = ws.createListener({ upgrader })

      await listener.listen(ma)
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => getNetConfig(a).host)).to.not.include('0.0.0.0')
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
      expect(addrs.map((a) => getNetConfig(a).port)).to.not.include('0')
    })

    it('getAddrs from listening on 0.0.0.0', async () => {
      const addr = multiaddr('/ip4/0.0.0.0/tcp/47382/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => getNetConfig(a).host)).to.not.include('0.0.0.0')
    })

    it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
      const addr = multiaddr('/ip4/0.0.0.0/tcp/0/ws')
      listener = ws.createListener({ upgrader })
      await listener.listen(addr)
      const addrs = listener.getAddrs()
      expect(addrs.map((a) => getNetConfig(a).host)).to.not.include('0.0.0.0')
      expect(addrs.map((a) => getNetConfig(a).port)).to.not.include('0')
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
        upgrader,
        signal: AbortSignal.timeout(5_000)
      })).to.eventually.be.ok()
    })

    it('dial with p2p Id', async () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')

      await expect(ws.dial(ma, {
        upgrader,
        signal: AbortSignal.timeout(5_000)
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
      await ws.dial(localAddrs[0], {
        upgrader,
        signal: AbortSignal.timeout(5_000)
      })

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
        const { host } = getNetConfig(ma)

        return !isLoopbackAddr(host)
      })

      if (addrs.length === 0) {
        return
      }

      // Dial first no loopback address
      await expect(ws.dial(addrs[0], {
        upgrader,
        signal: AbortSignal.timeout(5_000)
      }))
        .to.eventually.be.ok()
    })
  })

  describe('ip4 with wss', () => {
    let ws: Transport
    let listener: Listener
    const ma = multiaddr('/ip4/127.0.0.1/tcp/37284/tls/ws')

    beforeEach(async () => {
      ws = webSockets({
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
      await expect(ws.dial(ma, {
        upgrader,
        signal: AbortSignal.timeout(5_000)
      }))
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
      await expect(ws.dial(ma, {
        upgrader,
        signal: AbortSignal.timeout(5_000)
      }))
        .to.eventually.be.ok()
    })

    it('dial with p2p Id', async () => {
      const ma = multiaddr('/ip6/::1/tcp/9091/ws/p2p/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
      await expect(ws.dial(ma, {
        upgrader,
        signal: AbortSignal.timeout(5_000)
      }))
        .to.eventually.be.ok()
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

    ws = webSockets()({
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

    const wsOptions = getNetConfig(addrs2[0])
    const wssOptions = getNetConfig(addrs2[1])

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

    ws = webSockets()({
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

    const wsOptions = getNetConfig(addrs2[0])
    const wssOptions = getNetConfig(addrs2[1])

    expect(wsOptions.host).to.equal(wssOptions.host)
    expect(wsOptions.port).to.equal(wssOptions.port)
  })
})
