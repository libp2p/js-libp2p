import net from 'node:net'
import { Worker } from 'node:worker_threads'
import os from 'os'
import path from 'path'
import { defaultLogger } from '@libp2p/logger'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.ts'
import type { Connection, Listener, MultiaddrConnection, Startable, Transport, Upgrader } from '@libp2p/interface'

const isCI = process.env.CI

describe('listen', () => {
  let transport: Transport & Startable
  let listener: Listener
  let upgrader: Upgrader

  beforeEach(() => {
    transport = tcp()({
      logger: defaultLogger()
    }) as Transport & Startable
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
    Sinon.restore()

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
  let transport: Transport & Startable
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
    }) as Transport & Startable
  })

  afterEach(() => {
    Sinon.restore()
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
  })

  it('should destroy and await outbound sockets when the transport stops', async () => {
    let outboundMaConn: MultiaddrConnection | undefined

    const listener = transport.createListener({
      upgrader: stubInterface<Upgrader>({
        upgradeInbound: Sinon.stub().resolves()
      })
    })
    await listener.listen(multiaddr('/ip4/127.0.0.1/tcp/0'))

    const connection = stubInterface<Connection>()
    await transport.dial(listener.getAddrs()[0], {
      upgrader: stubInterface<Upgrader>({
        async upgradeOutbound (maConn) {
          outboundMaConn = maConn
          return connection
        }
      }),
      signal: AbortSignal.timeout(5_000)
    })

    expect(outboundMaConn).to.have.property('status', 'open')

    await transport.stop()

    expect(outboundMaConn).to.have.property('status', 'closed')
    await expect(transport.dial(listener.getAddrs()[0], {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })).to.eventually.be.rejected()
      .with.property('name', 'NotStartedError')

    await listener.close()
  })

  it('should abort a pending connect and await the socket close event on stop', async () => {
    const socket = new net.Socket()
    Sinon.stub(net, 'connect').returns(socket)

    const dial = transport.dial(multiaddr('/ip4/192.0.2.1/tcp/4001'), {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })

    await transport.stop()

    expect(socket.closed).to.be.true()
    await expect(dial).to.eventually.be.rejected()
      .with.property('name', 'AbortError')
  })

  it('should leave no TCP handles and allow prompt worker termination after repeated shutdowns', async () => {
    const tcpModuleUrl = new URL('../src/index.js', import.meta.url).href

    for (let iteration = 0; iteration < 5; iteration++) {
      const worker = new Worker(`
        const { parentPort, workerData } = require('node:worker_threads')

        void (async () => {
          const { tcp } = await import(workerData.tcpModuleUrl)
          const { defaultLogger } = await import('@libp2p/logger')
          const transport = tcp()({ logger: defaultLogger() })
          const upgrader = {
            async upgradeInbound () {},
            async upgradeOutbound () { return {} }
          }
          const listener = transport.createListener({ upgrader })

          transport.start()
          await listener.listen((await import('@multiformats/multiaddr')).multiaddr('/ip4/127.0.0.1/tcp/0'))

          await Promise.all(Array.from({ length: 16 }, async () => {
            await transport.dial(listener.getAddrs()[0], {
              upgrader,
              signal: AbortSignal.timeout(5_000)
            })
          }))

          await Promise.all([
            listener.close(),
            transport.stop()
          ])
          await new Promise(resolve => setImmediate(resolve))

          parentPort.postMessage(process.getActiveResourcesInfo().filter(name => name === 'TCPSocketWrap'))
        })().catch(err => {
          parentPort.postMessage({ error: err.stack ?? err.message })
        })
      `, {
        eval: true,
        workerData: { tcpModuleUrl }
      })

      const resources = await new Promise<unknown>((resolve, reject) => {
        worker.once('message', resolve)
        worker.once('error', reject)
      })

      if (resources != null && typeof resources === 'object' && !Array.isArray(resources) && 'error' in resources) {
        throw new Error(String(resources.error))
      }

      expect(resources).to.deep.equal([])

      const terminationTimeout = Promise.withResolvers<void>()
      const timeout = setTimeout(() => {
        terminationTimeout.reject(new Error('Worker did not terminate promptly'))
      }, 1_000)

      try {
        await Promise.race([
          worker.terminate(),
          terminationTimeout.promise
        ])
      } finally {
        clearTimeout(timeout)
      }
    }
  })
})
