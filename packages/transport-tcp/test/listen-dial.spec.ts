import os from 'os'
import path from 'path'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.js'
import type { Connection, Transport, Upgrader } from '@libp2p/interface'

const isCI = process.env.CI

describe('listen', () => {
  let transport: Transport
  let listener: any
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
    const mh = multiaddr(`/unix/${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

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
    expect(multiaddrs[0].toOptions().host).to.not.equal('::')
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
    const ma = multiaddr(`/unix/${path.resolve(os.tmpdir(), `/tmp/p2pd-${Date.now()}.sock`)}`)

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
})
