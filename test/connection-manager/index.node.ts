/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createNode, createPeerId } from '../utils/creators/peer.js'
import { mockConnection, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-mocks'
import { createBaseOptions } from '../utils/base-options.browser.js'
import type { Libp2p } from '../../src/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { EventEmitter } from '@libp2p/interfaces/events'
import * as STATUS from '@libp2p/interface-connection/status'
import { stubInterface } from 'sinon-ts'
import type { PeerStore } from '@libp2p/interface-peer-store'
import sinon from 'sinon'
import pWaitFor from 'p-wait-for'
import delay from 'delay'
import type { Libp2pNode } from '../../src/libp2p.js'
import { codes } from '../../src/errors.js'
import { start } from '@libp2p/interfaces/startable'
import type { TransportManager } from '@libp2p/interface-transport'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import { defaultComponents } from '../../src/components.js'

describe('Connection Manager', () => {
  let libp2p: Libp2p
  let peerIds: PeerId[]

  before(async () => {
    peerIds = await Promise.all([
      createPeerId(),
      createPeerId()
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
      events: new EventEmitter()
    })
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      minConnections: 50,
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

    expect(conn1).to.have.nested.property('stat.status', STATUS.OPEN)

    await connectionManager.stop()
  })

  it('should close connections on stop', async () => {
    const peerStore = stubInterface<PeerStore>()
    const components = defaultComponents({
      peerId: peerIds[0],
      peerStore,
      transportManager: stubInterface<TransportManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new EventEmitter()
    })
    const connectionManager = new DefaultConnectionManager(components, {
      maxConnections: 1000,
      minConnections: 50,
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
      createPeerId(),
      createPeerId()
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

    it('should connect to all the peers stored in the PeerStore, if their number is below minConnections', async () => {
      libp2p = await createNode({
        started: false,
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections: 3
          }
        }
      })

      // Populate PeerStore before starting
      await libp2p.peerStore.patch(nodes[0].peerId, {
        multiaddrs: nodes[0].getMultiaddrs()
      })
      await libp2p.peerStore.patch(nodes[1].peerId, {
        multiaddrs: nodes[1].getMultiaddrs()
      })

      await libp2p.start()

      // Wait for peers to connect
      await pWaitFor(() => libp2p.getConnections().length === 2)

      await libp2p.stop()
    })

    it('should connect to all the peers stored in the PeerStore until reaching the minConnections', async () => {
      const minConnections = 1
      libp2p = await createNode({
        started: false,
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections,
            maxConnections: 1
          }
        }
      })

      // Populate PeerStore before starting
      await libp2p.peerStore.patch(nodes[0].peerId, {
        multiaddrs: nodes[0].getMultiaddrs()
      })
      await libp2p.peerStore.patch(nodes[1].peerId, {
        multiaddrs: nodes[1].getMultiaddrs()
      })

      await libp2p.start()

      // Wait for peer to connect
      await pWaitFor(() => libp2p.components.connectionManager.getConnections().length === minConnections)

      // Wait more time to guarantee no other connection happened
      await delay(200)
      expect(libp2p.components.connectionManager.getConnections().length).to.eql(minConnections)

      await libp2p.stop()
    })

    // flaky
    it.skip('should connect to all the peers stored in the PeerStore until reaching the minConnections sorted', async () => {
      const minConnections = 1
      libp2p = await createNode({
        started: false,
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections,
            maxConnections: 1
          }
        }
      })

      // Populate PeerStore before starting
      await libp2p.peerStore.patch(nodes[0].peerId, {
        multiaddrs: nodes[0].getMultiaddrs()
      })
      await libp2p.peerStore.patch(nodes[1].peerId, {
        multiaddrs: nodes[1].getMultiaddrs(),
        protocols: ['/protocol-min-conns']
      })

      await libp2p.start()

      // Wait for peer to connect
      await pWaitFor(() => libp2p.components.connectionManager.getConnections().length === minConnections)

      // Should have connected to the peer with protocols
      expect(libp2p.components.connectionManager.getConnections(nodes[0].peerId)).to.be.empty()
      expect(libp2p.components.connectionManager.getConnections(nodes[1].peerId)).to.not.be.empty()

      await libp2p.stop()
    })

    it('should connect to peers in the PeerStore when a peer disconnected', async () => {
      const minConnections = 1

      libp2p = await createNode({
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections
          }
        }
      })

      // Populate PeerStore after starting (discovery)
      await libp2p.peerStore.patch(nodes[0].peerId, {
        multiaddrs: nodes[0].getMultiaddrs()
      })

      // Wait for peer to connect
      const conn = await libp2p.dial(nodes[0].peerId)
      expect(libp2p.components.connectionManager.getConnections(nodes[0].peerId)).to.not.be.empty()

      await conn.close()
      // Closed
      await pWaitFor(() => libp2p.components.connectionManager.getConnections().length === 0)
      // Connected
      await pWaitFor(() => libp2p.components.connectionManager.getConnections().length === 1)

      expect(libp2p.components.connectionManager.getConnections(nodes[0].peerId)).to.not.be.empty()

      await libp2p.stop()
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
      expect(conn.stat.status).to.eql(STATUS.CLOSED)

      await remoteLibp2p.stop()
    })
  })

  describe('connection gater', () => {
    let libp2p: Libp2pNode
    let remoteLibp2p: Libp2pNode

    beforeEach(async () => {
      remoteLibp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[1],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
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
        .to.eventually.be.rejected().with.property('code', codes.ERR_PEER_DIAL_INTERCEPTED)
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
      await libp2p.components.connectionManager.openConnection(remoteLibp2p.peerId)

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

      expect(filterMultiaddrForPeer.callCount).to.equal(2)

      const args = filterMultiaddrForPeer.getCall(1).args
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
          }
        })
      })
      await remoteLibp2p.peerStore.patch(libp2p.peerId, {
        multiaddrs: libp2p.getMultiaddrs()
      })
      await remoteLibp2p.dial(libp2p.peerId)

      expect(denyInboundUpgradedConnection.called).to.be.true()
      expect(denyInboundUpgradedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
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
      await libp2p.dial(remoteLibp2p.peerId)

      expect(denyOutboundUpgradedConnection.called).to.be.true()
      expect(denyOutboundUpgradedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
    })
  })
})
