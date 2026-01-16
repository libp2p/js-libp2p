import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { memory } from '@libp2p/memory'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { dns } from '@multiformats/dns'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { createPeers } from './fixtures/create-peers.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p, Stream } from '@libp2p/interface'

describe('connections', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('libp2p.getConnections gets the conns', async () => {
    ({ dialer, listener } = await createPeers())

    const conn = await dialer.dial(listener.getMultiaddrs())

    expect(conn).to.be.ok()
    expect(dialer.getConnections()).to.have.lengthOf(1)
  })

  it('should open multiple connections when forced', async () => {
    ({ dialer, listener } = await createPeers())

    // connect once, should have one connection
    await dialer.dial(listener.getMultiaddrs())
    expect(dialer.getConnections()).to.have.lengthOf(1)

    // connect twice, should still only have one connection
    await dialer.dial(listener.getMultiaddrs())
    expect(dialer.getConnections()).to.have.lengthOf(1)

    // force connection, should have two connections now
    await dialer.dial(listener.getMultiaddrs(), {
      force: true
    })
    expect(dialer.getConnections()).to.have.lengthOf(2)
  })

  it('should use custom DNS resolver', async () => {
    const resolver = Sinon.stub()

    ;({ dialer, listener } = await createPeers({
      dns: dns({
        resolvers: {
          '.': resolver
        }
      })
    }))

    const ma = multiaddr('/dnsaddr/example.com/tcp/12345')
    const err = new Error('Could not resolve')

    resolver.withArgs('_dnsaddr.example.com').rejects(err)

    await expect(dialer.dial(ma)).to.eventually.be.rejected
      .with.property('name', 'DNSQueryFailedError')
  })

  it('should fail to dial if resolve fails and there are no addresses to dial', async () => {
    const resolver = Sinon.stub()

    ;({ dialer, listener } = await createPeers({
      dns: dns({
        resolvers: {
          '.': resolver
        }
      })
    }))

    const ma = multiaddr('/dnsaddr/example.com/tcp/12345')

    resolver.withArgs('_dnsaddr.example.com').resolves({
      Answer: []
    })

    await expect(dialer.dial(ma)).to.eventually.be.rejected
      .with.property('name', 'NoValidAddressesError')
  })

  it('should only dial to the max concurrency', async () => {
    const maxParallelDials = 2
    const addrs = [
      '/memory/address-1',
      '/memory/address-2',
      '/memory/address-3',
      '/memory/address-4'
    ]

    ;({ dialer, listener } = await createPeers({
      transports: [
        memory({
          latency: 100
        })
      ],
      connectionManager: {
        maxParallelDials
      }
    }, {
      addresses: {
        listen: addrs
      },
      transports: [
        memory({
          latency: 100
        })
      ]
    }))

    let running = 0
    let maxRunning = 0

    await Promise.all(
      addrs.map(async (addr) => {
        await dialer.dial(multiaddr(addr), {
          force: true,
          onProgress: (event) => {
            // first event in the dial process
            if (event.type === 'dial-queue:start-dial') {
              running++

              if (running > maxRunning) {
                maxRunning = running
              }
            }

            // final event in the dial process
            if (event.type === 'upgrader:multiplex-outbound-connection') {
              running--
            }
          }
        })
      })
    )

    expect(maxRunning).to.equal(maxParallelDials)
  })

  it('should limit the maximum dial queue size', async () => {
    const maxParallelDials = 1
    const maxDialQueueLength = 1
    const addrs = [
      '/memory/address-1',
      '/memory/address-2'
    ]

    ;({ dialer, listener } = await createPeers({
      transports: [
        memory({
          latency: 100
        })
      ],
      connectionManager: {
        maxDialQueueLength,
        maxParallelDials
      }
    }, {
      addresses: {
        listen: addrs
      },
      transports: [
        memory({
          latency: 100
        })
      ]
    }))

    await expect(Promise.all([
      dialer.dial(multiaddr(addrs[0])),
      dialer.dial(multiaddr(addrs[1]))
    ])).to.eventually.be.rejected
      .with.property('name', 'DialError')
  })

  it('should be able to connect to remote node with multiple addresses', async () => {
    const addrs = [
      '/memory/address-1',
      '/memory/address-2',
      '/memory/address-3',
      '/memory/address-4'
    ]

    ;({ dialer, listener } = await createPeers({}, {
      addresses: {
        listen: addrs
      }
    }))

    await dialer.peerStore.merge(listener.peerId, {
      multiaddrs: addrs.map(ma => multiaddr(ma))
    })

    await expect(dialer.dial(listener.peerId)).to.eventually.be.ok()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    ({ dialer, listener } = await createPeers())

    await expect(dialer.dial(multiaddr('/ip4/127.0.0.1/udp/12345')))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.name', 'NoValidAddressesError')
  })

  it('should fail to connect by peer id if peer has no known addresses', async () => {
    ({ dialer, listener } = await createPeers())

    await expect(dialer.dial(listener.peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.name', 'NoValidAddressesError')
  })

  it('should be able to connect to a given peer id by stored addresses', async () => {
    ({ dialer, listener } = await createPeers())

    await dialer.peerStore.patch(listener.peerId, {
      multiaddrs: listener.getMultiaddrs()
    })

    await expect(dialer.dial(listener.peerId)).to.eventually.be.ok()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    ({ dialer, listener } = await createPeers())

    await dialer.peerStore.patch(listener.peerId, {
      multiaddrs: [multiaddr('/ip4/127.0.0.1/udp/12345')]
    })

    await expect(dialer.dial(listener.peerId))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.name', 'NoValidAddressesError')
  })

  it('should only try to connect to addresses supported by the transports configured', async () => {
    ({ dialer, listener } = await createPeers())

    await dialer.peerStore.patch(listener.peerId, {
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/udp/12345'),
        listener.getMultiaddrs()[0]
      ]
    })

    await expect(dialer.dial(listener.peerId)).to.eventually.be.ok()
  })

  it('should abort outgoing dials on queue task timeout', async () => {
    ({ dialer, listener } = await createPeers({
      transports: [
        memory({
          latency: 5_000
        })
      ],
      connectionManager: {
        dialTimeout: 10
      }
    }, {
      transports: [
        memory({
          latency: 5_000
        })
      ]
    }))

    await expect(dialer.dial(listener.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'TimeoutError')
  })

  it('should abort incoming dials on queue task timeout', async () => {
    ({ dialer, listener } = await createPeers({
      transports: [
        memory({
          latency: 1000
        })
      ]
    }, {
      transports: [
        memory({
          latency: 1000
        })
      ],
      connectionManager: {
        inboundUpgradeTimeout: 10
      }
    }))

    await expect(dialer.dial(listener.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
  })

  it('should throw when using dialProtocol with no protocols', async () => {
    ({ dialer, listener } = await createPeers())

    // @ts-expect-error invalid params
    await expect(dialer.dialProtocol(listener.getMultiaddrs()))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('name', 'InvalidParametersError')

    await expect(dialer.dialProtocol(listener.getMultiaddrs(), []))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('name', 'InvalidParametersError')
  })

  it('should be able to use hangup to close connections', async () => {
    ({ dialer, listener } = await createPeers())

    const connection = await dialer.dial(listener.getMultiaddrs())
    expect(connection).to.exist()
    expect(connection.timeline.close).to.not.exist()
    await dialer.hangUp(connection.remotePeer)
    expect(connection.timeline.close).to.exist()
    expect(connection.status).to.equal('closed')
  })

  it('should be able to use hangup when no connection exists', async () => {
    ({ dialer, listener } = await createPeers())

    await dialer.hangUp(listener.peerId)
  })

  it('should coalesce parallel dials to the same peer (id in multiaddr)', async () => {
    const addrs = [
      '/memory/address-1',
      '/memory/address-2',
      '/memory/address-3',
      '/memory/address-4'
    ]

    ;({ dialer, listener } = await createPeers({}, {
      addresses: {
        listen: addrs
      }
    }))

    const dialAddrsWithPeerId = addrs.map(ma => multiaddr(`${ma}/p2p/${listener.peerId}`))

    await dialer.peerStore.patch(listener.peerId, {
      multiaddrs: listener.getMultiaddrs()
    })
    const dialResults = await Promise.all([
      dialer.dial(listener.peerId),
      dialer.dial(dialAddrsWithPeerId[0]),
      dialer.dial(dialAddrsWithPeerId[1]),
      dialer.dial(dialAddrsWithPeerId[2]),
      dialer.dial(dialAddrsWithPeerId[3])
    ])

    // all should succeed and we should have ten results
    expect(dialResults).to.have.length(5)
    const id = dialResults[0].id
    for (const connection of dialResults) {
      // should all be the same connection
      expect(connection).to.have.property('id', id)
    }

    // 1 connection, because we know the peer in the multiaddr
    expect(dialer.getConnections()).to.have.lengthOf(1)
    expect(listener.getConnections()).to.have.lengthOf(1)
  })

  it('should negotiate protocol fully when dialing a protocol', async () => {
    ({ dialer, listener } = await createPeers())

    const protocol = '/test/1.0.0'
    const streamOpen = pDefer<Stream>()

    await listener.handle(protocol, (stream) => {
      streamOpen.resolve(stream)
    })

    const outboundStream = await dialer.dialProtocol(listener.getMultiaddrs(), protocol)

    expect(outboundStream).to.have.property('protocol', protocol)

    await expect(streamOpen.promise).to.eventually.have.property('protocol', protocol)
  })

  it('should negotiate protocol fully when opening on a connection', async () => {
    ({ dialer, listener } = await createPeers())

    const protocol = '/test/1.0.0'
    const streamOpen = pDefer<Stream>()

    await listener.handle(protocol, (stream) => {
      streamOpen.resolve(stream)
    })

    const connection = await dialer.dial(listener.getMultiaddrs())
    const outboundStream = await connection.newStream(protocol)

    expect(outboundStream).to.have.property('protocol', protocol)

    await expect(streamOpen.promise).to.eventually.have.property('protocol', protocol)
  })

  it('should mark a peer as having recently failed to connect', async () => {
    ({ dialer, listener } = await createPeers())

    const multiaddrs = listener.getMultiaddrs()
    await listener.stop()

    await expect(dialer.dial(multiaddrs))
      .to.eventually.be.rejected()

    const peer = await dialer.peerStore.get(listener.peerId)

    expect(peer.metadata.has('last-dial-failure')).to.be.true()
  })

  it('should throw when a peer advertises more than the allowed number of addresses', async () => {
    const maxPeerAddrsToDial = 10

    ;({ dialer, listener } = await createPeers({
      connectionManager: {
        maxPeerAddrsToDial
      }
    }, {
      addresses: {
        announce: Array.from({ length: 11 }, (_, i) => `/memory/address-${i}`)
      }
    }))

    expect(listener.getMultiaddrs()).to.have.length.greaterThan(maxPeerAddrsToDial)

    await expect(dialer.dial(listener.getMultiaddrs()))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'DialError')
  })

  it('shutting down should abort pending dials', async () => {
    const addrs = [
      '/memory/address-1',
      '/memory/address-2',
      '/memory/address-3',
      '/memory/address-4'
    ]

    ;({ dialer, listener } = await createPeers({
      connectionManager: {
        maxParallelDials: 2
      },
      transports: [
        memory({
          latency: 1000
        })
      ]
    }, {
      addresses: {
        listen: addrs
      },
      transports: [
        memory({
          latency: 1000
        })
      ]
    }))

    // Perform 3 multiaddr dials
    const dialPromise = Promise.all(
      addrs.map(async (ma) => {
        return dialer.dial(multiaddr(`${ma}`))
      })
    )

    // Let the call stack run
    await delay(0)

    await dialer.stop()

    await expect(dialPromise).to.eventually.be.rejected
      .with.property('name', 'AbortError')

    expect(dialer.getConnections()).to.have.lengthOf(0)
    expect(listener.getConnections()).to.have.lengthOf(0)
  })

  it('should throw if dialling an empty array is attempted', async () => {
    ({ dialer, listener } = await createPeers())

    // Perform dial
    await expect(dialer.dial([])).to.eventually.be.rejected
      .with.property('name', 'NoValidAddressesError')
  })

  it('should throw if dialling multiaddrs with mismatched peer ids', async () => {
    ({ dialer, listener } = await createPeers())

    // Perform dial
    await expect(dialer.dial([
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(peerIdFromPrivateKey(await generateKeyPair('Ed25519'))).toString()}`),
      multiaddr(`/ip4/0.0.0.0/tcp/8001/ws/p2p/${(peerIdFromPrivateKey(await generateKeyPair('Ed25519'))).toString()}`)
    ])).to.eventually.rejected
      .with.property('name', 'InvalidParametersError')
  })

  it('should throw if dialling multiaddrs with inconsistent peer ids', async () => {
    ({ dialer, listener } = await createPeers())

    // Perform dial
    await expect(dialer.dial([
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(peerIdFromPrivateKey(await generateKeyPair('Ed25519'))).toString()}`),
      multiaddr('/ip4/0.0.0.0/tcp/8001/ws')
    ])).to.eventually.rejected
      .with.property('name', 'InvalidParametersError')

    // Perform dial
    await expect(dialer.dial([
      multiaddr('/ip4/0.0.0.0/tcp/8001/ws'),
      multiaddr(`/ip4/0.0.0.0/tcp/8000/ws/p2p/${(peerIdFromPrivateKey(await generateKeyPair('Ed25519'))).toString()}`)
    ])).to.eventually.rejected
      .with.property('name', 'InvalidParametersError')
  })

  it('should fail to dial self', async () => {
    ({ dialer, listener } = await createPeers())

    await expect(listener.dial(listener.getMultiaddrs()))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'InvalidPeerIdError')

    await expect(listener.dial(listener.peerId))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'InvalidPeerIdError')
  })
})
