/* eslint-env mocha */

import { TypedEventEmitter, start } from '@libp2p/interface'
import { mockConnection, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { dns } from '@multiformats/dns'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pipe } from 'it-pipe'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { defaultComponents } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { createBaseOptions } from '../fixtures/base-options.browser.js'
import { createNode } from '../fixtures/creators/peer.js'
import { ECHO_PROTOCOL, echo } from '../fixtures/echo-service.js'
import type { Libp2p } from '../../src/index.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import type { ConnectionGater, PeerId, PeerStore } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

describe('Connection Manager', () => {
  let libp2p: Libp2p
  let peerIds: PeerId[]

  before(async () => {
    peerIds = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId()
    ])
  })

  beforeEach(async () => {
    libp2p = await createNode({
      config: createBaseOptions({
        peerId: peerIds[0],
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/0/ws']
        }
      })
    })
  })

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should filter connections on disconnect, removing the closed one', async () => {
    const peerStore = stubInterface<PeerStore>()
    const components = defaultComponents({
      peerId: peerIds[0],
      peerStore,
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter()
    })
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const conn1 = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))
    const conn2 = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(0)

    // Add connection to the connectionManager
    components.events.safeDispatchEvent('connection:open', { detail: conn1 })
    components.events.safeDispatchEvent('connection:open', { detail: conn2 })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(2)

    await conn2.close()
    components.events.safeDispatchEvent('connection:close', { detail: conn2 })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(1)

    expect(conn1).to.have.nested.property('status', 'open')

    await connectionManager.stop()
  })

  it('should close connections on stop', async () => {
    const peerStore = stubInterface<PeerStore>()
    const components = defaultComponents({
      peerId: peerIds[0],
      peerStore,
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter()
    })
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const conn1 = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))
    const conn2 = mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))

    // Add connection to the connectionManager
    components.events.safeDispatchEvent('connection:open', { detail: conn1 })
    components.events.safeDispatchEvent('connection:open', { detail: conn2 })

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(2)

    await connectionManager.stop()

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(0)
  })
})

describe('libp2p.connections', () => {
  let peerIds: PeerId[]
  let libp2p: Libp2p

  before(async () => {
    peerIds = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId()
    ])
  })

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('libp2p.connections gets the connectionManager conns', async () => {
    libp2p = await createNode({
      config: createBaseOptions({
        peerId: peerIds[0],
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15003/ws']
        }
      })
    })
    const remoteLibp2p = await createNode({
      config: createBaseOptions({
        peerId: peerIds[1],
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15004/ws']
        }
      })
    })

    await libp2p.peerStore.patch(remoteLibp2p.peerId, {
      multiaddrs: remoteLibp2p.getMultiaddrs()
    })
    const conn = await libp2p.dial(remoteLibp2p.peerId)

    expect(conn).to.be.ok()
    expect(libp2p.getConnections()).to.have.lengthOf(1)

    await libp2p.stop()
    await remoteLibp2p.stop()
  })

  describe('proactive connections', () => {
    let libp2p: Libp2pNode
    let nodes: Libp2p[] = []

    beforeEach(async () => {
      nodes = await Promise.all([
        createNode({
          config: {
            addresses: {
              listen: ['/ip4/127.0.0.1/tcp/0/ws']
            }
          }
        }),
        createNode({
          config: {
            addresses: {
              listen: ['/ip4/127.0.0.1/tcp/0/ws']
            }
          }
        })
      ])
    })

    afterEach(async () => {
      await Promise.all(nodes.map(async (node) => { await node.stop() }))

      if (libp2p != null) {
        await libp2p.stop()
      }

      sinon.reset()
    })

    it('should be closed status once immediately stopping', async () => {
      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/15003/ws']
          }
        })
      })
      const remoteLibp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[1],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/15004/ws']
          }
        })
      })

      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: remoteLibp2p.getMultiaddrs()
      })
      await libp2p.dial(remoteLibp2p.peerId)

      const conns = libp2p.components.connectionManager.getConnections()
      expect(conns.length).to.eql(1)
      const conn = conns[0]

      await libp2p.stop()
      expect(conn.status).to.eql('closed')

      await remoteLibp2p.stop()
    })

    it('should open multiple connections when forced', async () => {
      libp2p = await createNode({
        config: createBaseOptions({
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          }
        })
      })

      // connect once, should have one connection
      await libp2p.components.connectionManager.openConnection(nodes[0].getMultiaddrs())
      expect(libp2p.components.connectionManager.getConnections()).to.have.lengthOf(1)

      // connect twice, should still only have one connection
      await libp2p.components.connectionManager.openConnection(nodes[0].getMultiaddrs(), {
        force: false
      })
      expect(libp2p.components.connectionManager.getConnections()).to.have.lengthOf(1)

      // force connection, should have two connections now
      await libp2p.components.connectionManager.openConnection(nodes[0].getMultiaddrs(), {
        force: true
      })
      expect(libp2p.components.connectionManager.getConnections()).to.have.lengthOf(2)
    })

    it('should use custom DNS resolver', async () => {
      const resolver = sinon.stub()

      libp2p = await createNode({
        config: createBaseOptions({
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          dns: dns({
            resolvers: {
              '.': resolver
            }
          })
        })
      })

      const ma = multiaddr('/dnsaddr/example.com/tcp/12345')
      const err = new Error('Could not resolve')

      resolver.withArgs('_dnsaddr.example.com').rejects(err)

      await expect(libp2p.dial(ma)).to.eventually.be.rejectedWith(err)
    })
  })

  describe('connection gater', () => {
    let libp2p: Libp2p
    let remoteLibp2p: Libp2p

    beforeEach(async () => {
      remoteLibp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[1],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          services: {
            echo: echo()
          }
        })
      })
    })

    afterEach(async () => {
      if (remoteLibp2p != null) {
        await remoteLibp2p.stop()
      }

      if (libp2p != null) {
        await libp2p.stop()
      }
    })

    it('intercept peer dial', async () => {
      const denyDialPeer = sinon.stub().returns(true)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyDialPeer
          }
        })
      })
      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: remoteLibp2p.getMultiaddrs()
      })

      await expect(libp2p.dial(remoteLibp2p.peerId))
        .to.eventually.be.rejected().with.property('name', 'DialDeniedError')
    })

    it('intercept addr dial', async () => {
      const denyDialMultiaddr = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyDialMultiaddr
          }
        })
      })
      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: remoteLibp2p.getMultiaddrs()
      })
      await libp2p.dial(remoteLibp2p.peerId)

      for (const multiaddr of remoteLibp2p.getMultiaddrs()) {
        expect(denyDialMultiaddr.calledWith(multiaddr)).to.be.true()
      }
    })

    it('intercept multiaddr store', async () => {
      const filterMultiaddrForPeer = sinon.stub().returns(true)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            filterMultiaddrForPeer
          }
        })
      })

      const fullMultiaddr = remoteLibp2p.getMultiaddrs()[0]

      await libp2p.peerStore.merge(remoteLibp2p.peerId, {
        multiaddrs: [fullMultiaddr]
      })

      expect(filterMultiaddrForPeer.callCount).to.equal(1)

      const args = filterMultiaddrForPeer.getCall(0).args
      expect(args[0].toString()).to.equal(remoteLibp2p.peerId.toString())
      expect(args[1].toString()).to.equal(fullMultiaddr.toString())
    })

    it('intercept accept inbound connection', async () => {
      const denyInboundConnection = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyInboundConnection
          }
        })
      })
      await remoteLibp2p.peerStore.patch(libp2p.peerId, {
        multiaddrs: libp2p.getMultiaddrs()
      })
      await remoteLibp2p.dial(libp2p.peerId)

      expect(denyInboundConnection.called).to.be.true()
    })

    it('intercept accept outbound connection', async () => {
      const denyOutboundConnection = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyOutboundConnection
          }
        })
      })
      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: remoteLibp2p.getMultiaddrs()
      })
      await libp2p.dial(remoteLibp2p.peerId)

      expect(denyOutboundConnection.called).to.be.true()
    })

    it('intercept inbound encrypted', async () => {
      const denyInboundEncryptedConnection = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyInboundEncryptedConnection
          }
        })
      })
      await remoteLibp2p.peerStore.patch(libp2p.peerId, {
        multiaddrs: libp2p.getMultiaddrs()
      })
      await remoteLibp2p.dial(libp2p.peerId)

      expect(denyInboundEncryptedConnection.called).to.be.true()
      expect(denyInboundEncryptedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
    })

    it('intercept outbound encrypted', async () => {
      const denyOutboundEncryptedConnection = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyOutboundEncryptedConnection
          }
        })
      })
      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: remoteLibp2p.getMultiaddrs()
      })
      await libp2p.dial(remoteLibp2p.peerId)

      expect(denyOutboundEncryptedConnection.called).to.be.true()
      expect(denyOutboundEncryptedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
    })

    it('intercept inbound upgraded', async () => {
      const denyInboundUpgradedConnection = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyInboundUpgradedConnection
          },
          services: {
            echo: echo()
          }
        })
      })
      await remoteLibp2p.peerStore.patch(libp2p.peerId, {
        multiaddrs: libp2p.getMultiaddrs()
      })
      const connection = await remoteLibp2p.dial(libp2p.peerId)
      const stream = await connection.newStream(ECHO_PROTOCOL)
      const input = [Uint8Array.from([0])]
      const output = await pipe(input, stream, async (source) => all(source))

      expect(denyInboundUpgradedConnection.called).to.be.true()
      expect(denyInboundUpgradedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
      expect(output.map(b => b.subarray())).to.deep.equal(input)
    })

    it('intercept outbound upgraded', async () => {
      const denyOutboundUpgradedConnection = sinon.stub().returns(false)

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionGater: {
            denyOutboundUpgradedConnection
          }
        })
      })
      await libp2p.peerStore.patch(remoteLibp2p.peerId, {
        multiaddrs: remoteLibp2p.getMultiaddrs()
      })
      const connection = await libp2p.dial(remoteLibp2p.peerId)
      const stream = await connection.newStream(ECHO_PROTOCOL)
      const input = [Uint8Array.from([0])]
      const output = await pipe(input, stream, async (source) => all(source))

      expect(denyOutboundUpgradedConnection.called).to.be.true()
      expect(denyOutboundUpgradedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
      expect(output.map(b => b.subarray())).to.deep.equal(input)
    })
  })
})
