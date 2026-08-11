import net from 'net'
import os from 'os'
import path from 'path'
import { stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.js'
import type { Connection, Listener, MultiaddrConnection, Transport, Upgrader } from '@libp2p/interface'

const isCI = process.env.CI

describe('listen', () => {
  let transport: Transport
  let listener: Listener
  let upgrader: Upgrader

  beforeEach(() => {
    transport = tcp()({
      logger: defaultLogger()
    })
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })
  })

  afterEach(async () => {
    try {
      if (listener != null) {
        await listener.close()
      }
    } catch {
      // some tests close the listener so ignore errors
    }
  })

  it('listen on unix domain socket', async () => {
    const mh = multiaddr(`/unix/${encodeURIComponent(path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`))}`)

    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on port 0', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('errors when listening on busy port', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const listener2 = transport.createListener({
      upgrader
    })

    const mh2 = listener.getAddrs()[0]
    await expect(listener2.listen(mh2)).to.eventually.be.rejected()
      .with.property('code', 'EADDRINUSE')
  })

  it('listen on IPv6 addr', async () => {
    if (isCI != null) {
      return
    }
    const mh = multiaddr('/ip6/::/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on any Interface', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('getAddrs', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })

  it('getAddrs on port 0 listen', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
  })

  it('getAddrs from listening on 0.0.0.0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/tcp/0')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on ip6 \'::\'', async () => {
    const mh = multiaddr('/ip6/::/tcp/9090')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(getNetConfig(multiaddrs[0]).host).to.not.equal('::')
  })
})

describe('dial', () => {
  let transport: Transport
  let upgrader: Upgrader

  beforeEach(async () => {
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })

    transport = tcp()({
      logger: defaultLogger()
    })
  })

  it('waits for the socket to close when a dial is aborted', async () => {
    const server = net.createServer()
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('TCP server did not bind to an IP port')
    }

    const connectSpy = Sinon.spy(net, 'connect')

    try {
      const controller = new AbortController()
      const dialPromise = transport.dial(multiaddr(`/ip4/127.0.0.1/tcp/${address.port}`), {
        upgrader,
        signal: controller.signal
      })
      const socket = connectSpy.returnValues[0]

      if (socket == null) {
        throw new Error('TCP transport did not open a socket')
      }

      controller.abort()

      await expect(dialPromise).to.eventually.be.rejected()
      expect(socket.closed).to.be.true()
    } finally {
      connectSpy.restore()
      await new Promise<void>(resolve => {
        server.close(() => { resolve() })
      })
    }
  })

  it('waits for the socket to close when an outbound upgrade fails', async () => {
    const server = net.createServer(socket => {
      socket.on('error', () => {})
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('TCP server did not bind to an IP port')
    }

    const connectSpy = Sinon.spy(net, 'connect')
    const upgradeError = new Error('upgrade failed')

    try {
      const dialPromise = transport.dial(multiaddr(`/ip4/127.0.0.1/tcp/${address.port}`), {
        upgrader: stubInterface<Upgrader>({
          upgradeOutbound: Sinon.stub().rejects(upgradeError)
        }),
        signal: AbortSignal.timeout(5_000)
      })

      await expect(dialPromise).to.eventually.be.rejectedWith(upgradeError)

      const socket = connectSpy.returnValues[0]
      if (socket == null) {
        throw new Error('TCP transport did not open a socket')
      }

      expect(socket.closed).to.be.true()
    } finally {
      connectSpy.restore()
      await new Promise<void>(resolve => {
        server.close(() => { resolve() })
      })
    }
  })

  it('waits for established outbound sockets to close when stopped', async () => {
    const server = net.createServer(socket => {
      socket.on('error', () => {})
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('TCP server did not bind to an IP port')
    }

    const connectSpy = Sinon.spy(net, 'connect')

    try {
      await transport.dial(multiaddr(`/ip4/127.0.0.1/tcp/${address.port}`), {
        upgrader,
        signal: AbortSignal.timeout(5_000)
      })

      const socket = connectSpy.returnValues[0]
      if (socket == null) {
        throw new Error('TCP transport did not open a socket')
      }

      expect(socket.closed).to.be.false()
      await stop(transport)
      expect(socket.closed).to.be.true()
    } finally {
      connectSpy.restore()
      await new Promise<void>(resolve => {
        server.close(() => { resolve() })
      })
    }
  })

  it('waits for reset outbound sockets to emit close when stopped', async () => {
    const server = net.createServer(socket => {
      socket.on('error', () => {})
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('TCP server did not bind to an IP port')
    }

    const connectSpy = Sinon.spy(net, 'connect')
    const tcpTransport = tcp()({ logger: defaultLogger() })
    let maConn: MultiaddrConnection | undefined

    try {
      await tcpTransport.dial(multiaddr(`/ip4/127.0.0.1/tcp/${address.port}`), {
        upgrader: stubInterface<Upgrader>({
          upgradeOutbound: async (connection) => {
            maConn = connection

            return stubInterface<Connection>({
              remoteAddr: connection.remoteAddr
            })
          }
        }),
        signal: AbortSignal.timeout(5_000)
      })

      const socket = connectSpy.returnValues[0]
      if (socket == null || maConn == null) {
        throw new Error('TCP transport did not open a socket')
      }

      let socketClosed = false
      socket.once('close', () => {
        socketClosed = true
      })

      maConn.abort(new Error('connection aborted'))

      expect(socket.closed).to.be.true()
      expect(socketClosed).to.be.false()

      await stop(tcpTransport)

      expect(socketClosed).to.be.true()
    } finally {
      connectSpy.restore()
      await new Promise<void>(resolve => {
        server.close(() => { resolve() })
      })
    }
  })

  it('closes an outbound socket when abort races graceful close', async () => {
    const server = net.createServer(socket => {
      socket.on('error', () => {})
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    const address = server.address()
    if (address == null || typeof address === 'string') {
      throw new Error('TCP server did not bind to an IP port')
    }

    const connectSpy = Sinon.spy(net, 'connect')
    const tcpTransport = tcp()({ logger: defaultLogger() })
    let maConn: MultiaddrConnection | undefined

    try {
      await tcpTransport.dial(multiaddr(`/ip4/127.0.0.1/tcp/${address.port}`), {
        upgrader: stubInterface<Upgrader>({
          upgradeOutbound: async (connection) => {
            maConn = connection

            return stubInterface<Connection>({
              remoteAddr: connection.remoteAddr
            })
          }
        }),
        signal: AbortSignal.timeout(5_000)
      })

      const socket = connectSpy.returnValues[0]
      if (socket == null || maConn == null) {
        throw new Error('TCP transport did not open a socket')
      }

      const closePromise = maConn.close()
      expect(socket.writableEnded).to.be.true()

      maConn.abort(new Error('connection aborted while closing'))

      await closePromise
      await stop(tcpTransport)

      expect(socket.closed).to.be.true()
    } finally {
      connectSpy.restore()
      await new Promise<void>(resolve => {
        server.close(() => { resolve() })
      })
    }
  })

  it('dial IPv4', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.ok()

    await listener.close()
  })

  it('dial IPv6', async () => {
    if (isCI != null) {
      return
    }

    const ma = multiaddr('/ip6/::/tcp/9090')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.ok()

    await listener.close()
  })

  it('dial unix domain socket', async () => {
    const ma = multiaddr(`/unix/${encodeURIComponent(path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`))}`)

    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.ok()

    await listener.close()
  })

  it('dials IPv4 with IPFS Id', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.ok()

    await listener.close()
  })

  it('should close before connection upgrade is completed', async () => {
    // create a Promise that resolves when the upgrade starts
    const upgradeStarted = pDefer()

    // create a listener with the handler
    const listener = transport.createListener({
      upgrader: stubInterface<Upgrader>({
        async upgradeInbound () {
          upgradeStarted.resolve()

          return new Promise(() => {})
        },
        async upgradeOutbound () {
          return new Promise(() => {})
        }
      })
    })

    // listen on a multiaddr
    await listener.listen(multiaddr('/ip4/127.0.0.1/tcp/0'))

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // dial the listener address
    transport.dial(localAddrs[0], {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    }).catch(() => {})

    // wait for the upgrade to start
    await upgradeStarted.promise

    // close the listener, process should exit normally
    await listener.close()
  })

  it('should abort inbound upgrade on close', async () => {
    // create a Promise that resolves when the upgrade starts
    const upgradeStarted = pDefer()
    const abortedUpgrade = pDefer()
    const createServerSpy = Sinon.spy(net, 'createServer')
    let inboundSocket: net.Socket | undefined

    // create a listener with the handler
    const listener = transport.createListener({
      upgrader: stubInterface<Upgrader>({
        async upgradeInbound (maConn, opts) {
          upgradeStarted.resolve()

          opts?.signal?.addEventListener('abort', () => {
            abortedUpgrade.resolve()
          }, {
            once: true
          })

          return new Promise(() => {})
        },
        async upgradeOutbound () {
          return new Promise(() => {})
        }
      })
    })
    const server = createServerSpy.returnValues[0]
    server?.once('connection', socket => {
      inboundSocket = socket
    })

    // listen on a multiaddr
    await listener.listen(multiaddr('/ip4/127.0.0.1/tcp/0'))

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // dial the listener address
    transport.dial(localAddrs[0], {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    }).catch(() => {})

    // wait for the upgrade to start
    await upgradeStarted.promise

    // close the listener
    await listener.close()

    // should abort the upgrade
    await abortedUpgrade.promise
    expect(inboundSocket?.closed).to.be.true()
    createServerSpy.restore()
  })
})
