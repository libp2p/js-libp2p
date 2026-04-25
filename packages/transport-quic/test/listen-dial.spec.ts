import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { quic } from '../src/index.ts'
import type { Connection, Listener, PeerId, Transport, Upgrader } from '@libp2p/interface'

const isCI = process.env.CI

describe('listen', () => {
  let transport: Transport
  let listener: Listener | undefined
  let upgrader: Upgrader

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    transport = quic()({
      privateKey,
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

  it('listen on port 0', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/udp/0/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on IPv6 addr', async () => {
    if (isCI != null) {
      return
    }
    const mh = multiaddr('/ip6/::/udp/9090/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('listen on any Interface', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/udp/9090/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)
  })

  it('getAddrs', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/udp/9090/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })

  it('getAddrs on port 0 listen', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/udp/0/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
  })

  it('getAddrs from listening on 0.0.0.0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/udp/9090/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on 0.0.0.0 and port 0', async () => {
    const mh = multiaddr('/ip4/0.0.0.0/udp/0/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(multiaddrs[0].toString().indexOf('0.0.0.0')).to.equal(-1)
  })

  it('getAddrs from listening on ip6 \'::\'', async () => {
    const mh = multiaddr('/ip6/::/udp/9090/quic-v1')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length > 0).to.equal(true)
    expect(getNetConfig(multiaddrs[0]).host).to.not.equal('::')
  })

  it('getAddrs preserves IPFS Id', async () => {
    const mh = multiaddr('/ip4/127.0.0.1/udp/9090/quic-v1/ipfs/Qmb6owHp6eaWArVbcJJbQSyifyJBttMMjYV76N2hMbf5Vw')
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(mh)

    const multiaddrs = listener.getAddrs()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0]).to.deep.equal(mh)
  })
})

describe('dial', () => {
  let transport: Transport
  let upgrader: Upgrader
  let peerId: PeerId

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    peerId = peerIdFromPrivateKey(privateKey)

    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves(),
      upgradeOutbound: async (maConn) => {
        return stubInterface<Connection>({
          remoteAddr: maConn.remoteAddr
        })
      }
    })

    transport = quic()({
      privateKey,
      logger: defaultLogger()
    })
  })

  it('dial IPv4', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/udp/9090/quic-v1')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      signal: AbortSignal.timeout(5_000),
      upgrader
    })).to.eventually.be.ok()

    await listener.close()
  })

  it.skip('dial IPv6', async () => {
    if (isCI != null) {
      return
    }

    const ma = multiaddr('/ip6/::/udp/9090/quic-v1')
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      signal: AbortSignal.timeout(5_000),
      upgrader
    })).to.eventually.be.ok()

    await listener.close()
  })

  it('dials IPv4 with IPFS Id', async () => {
    const ma = multiaddr(`/ip4/127.0.0.1/udp/9090/quic-v1/ipfs/${peerId}`)
    const listener = transport.createListener({
      upgrader
    })
    await listener.listen(ma)

    await expect(transport.dial(ma, {
      signal: AbortSignal.timeout(5_000),
      upgrader
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
    await listener.listen(multiaddr('/ip4/127.0.0.1/udp/0/quic-v1'))

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // dial the listener address
    transport.dial(localAddrs[0], {
      signal: AbortSignal.timeout(5_000),
      upgrader
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
    await listener.listen(multiaddr('/ip4/127.0.0.1/udp/0/quic-v1'))

    const localAddrs = listener.getAddrs()
    expect(localAddrs.length).to.equal(1)

    // dial the listener address
    transport.dial(localAddrs[0], {
      signal: AbortSignal.timeout(5_000),
      upgrader
    }).catch(() => {})

    // wait for the upgrade to start
    await upgradeStarted.promise

    // close the listener
    await listener.close()

    // should abort the upgrade
    await abortedUpgrade.promise
  })
})
