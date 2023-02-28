/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createNode, createPeerId } from '../utils/creators/peer.js'
import { mockConnection, mockDuplex, mockMultiaddrConnection, mockUpgrader } from '@libp2p/interface-mocks'
import { createBaseOptions } from '../utils/base-options.browser.js'
import type { Libp2p } from '../../src/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { CustomEvent } from '@libp2p/interfaces/events'
import * as STATUS from '@libp2p/interface-connection/status'
import { stubInterface } from 'sinon-ts'
import type { KeyBook, PeerStore } from '@libp2p/interface-peer-store'
import sinon from 'sinon'
import pWaitFor from 'p-wait-for'
import type { Connection } from '@libp2p/interface-connection'
import delay from 'delay'
import type { Libp2pNode } from '../../src/libp2p.js'
import { codes } from '../../src/errors.js'
import { start } from '@libp2p/interfaces/startable'
import type { Dialer } from '@libp2p/interface-connection-manager'

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
    const upgrader = mockUpgrader()
    const peerStore = stubInterface<PeerStore>()
    peerStore.keyBook = stubInterface<KeyBook>()

    const connectionManager = new DefaultConnectionManager({
      peerId: peerIds[0],
      dialer: stubInterface<Dialer>(),
      upgrader,
      peerStore
    }, {
      maxConnections: 1000,
      minConnections: 50,
      autoDialInterval: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const conn1 = await mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))
    const conn2 = await mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(0)

    // Add connection to the connectionManager
    upgrader.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn1 }))
    upgrader.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn2 }))

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(2)

    await conn2.close()
    upgrader.dispatchEvent(new CustomEvent<Connection>('connectionEnd', { detail: conn2 }))

    expect(connectionManager.getConnections(peerIds[1])).to.have.lengthOf(1)

    expect(conn1).to.have.nested.property('stat.status', STATUS.OPEN)

    await connectionManager.stop()
  })

  it('should close connections on stop', async () => {
    const upgrader = mockUpgrader()
    const peerStore = stubInterface<PeerStore>()
    peerStore.keyBook = stubInterface<KeyBook>()

    const connectionManager = new DefaultConnectionManager({
      peerId: peerIds[0],
      dialer: stubInterface<Dialer>(),
      upgrader,
      peerStore
    }, {
      maxConnections: 1000,
      minConnections: 50,
      autoDialInterval: 1000,
      inboundUpgradeTimeout: 1000
    })

    await start(connectionManager)

    const conn1 = await mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))
    const conn2 = await mockConnection(mockMultiaddrConnection(mockDuplex(), peerIds[1]))

    // Add connection to the connectionManager
    upgrader.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn1 }))
    upgrader.dispatchEvent(new CustomEvent<Connection>('connection', { detail: conn2 }))

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

    await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())
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
      await Promise.all(nodes.map(async (node) => await node.stop()))

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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].getMultiaddrs())
      await libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].getMultiaddrs())

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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].getMultiaddrs())
      await libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].getMultiaddrs())

      await libp2p.start()

      // Wait for peer to connect
      await pWaitFor(() => libp2p.connectionManager.getConnections().length === minConnections)

      // Wait more time to guarantee no other connection happened
      await delay(200)
      expect(libp2p.connectionManager.getConnections().length).to.eql(minConnections)

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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].getMultiaddrs())
      await libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].getMultiaddrs())
      await libp2p.peerStore.protoBook.set(nodes[1].peerId, ['/protocol-min-conns'])

      await libp2p.start()

      // Wait for peer to connect
      await pWaitFor(() => libp2p.connectionManager.getConnections().length === minConnections)

      // Should have connected to the peer with protocols
      expect(libp2p.connectionManager.getConnections(nodes[0].peerId)).to.be.empty()
      expect(libp2p.connectionManager.getConnections(nodes[1].peerId)).to.not.be.empty()

      await libp2p.stop()
    })

    it('should connect to peers in the PeerStore when a peer disconnected', async () => {
      const minConnections = 1
      const autoDialInterval = 1000

      libp2p = await createNode({
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections,
            autoDialInterval
          }
        }
      })

      // Populate PeerStore after starting (discovery)
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].getMultiaddrs())

      // Wait for peer to connect
      const conn = await libp2p.dial(nodes[0].peerId)
      expect(libp2p.connectionManager.getConnections(nodes[0].peerId)).to.not.be.empty()

      await conn.close()
      // Closed
      await pWaitFor(() => libp2p.connectionManager.getConnections().length === 0)
      // Connected
      await pWaitFor(() => libp2p.connectionManager.getConnections().length === 1)

      expect(libp2p.connectionManager.getConnections(nodes[0].peerId)).to.not.be.empty()

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

      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())
      await libp2p.dial(remoteLibp2p.peerId)

      const conns = libp2p.connectionManager.getConnections()
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
      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())

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
      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())
      await libp2p.connectionManager.openConnection(remoteLibp2p.peerId)

      for (const multiaddr of remoteLibp2p.getMultiaddrs()) {
        expect(denyDialMultiaddr.calledWith(remoteLibp2p.peerId, multiaddr)).to.be.true()
      }
    })

    it('intercept multiaddr store during multiaddr dial', async () => {
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

      await libp2p.dial(fullMultiaddr)

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
      await remoteLibp2p.peerStore.addressBook.set(libp2p.peerId, libp2p.getMultiaddrs())
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
      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())
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
      await remoteLibp2p.peerStore.addressBook.set(libp2p.peerId, libp2p.getMultiaddrs())
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
      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())
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
      await remoteLibp2p.peerStore.addressBook.set(libp2p.peerId, libp2p.getMultiaddrs())
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
      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.getMultiaddrs())
      await libp2p.dial(remoteLibp2p.peerId)

      expect(denyOutboundUpgradedConnection.called).to.be.true()
      expect(denyOutboundUpgradedConnection.getCall(0)).to.have.nested.property('args[0].multihash.digest').that.equalBytes(remoteLibp2p.peerId.multihash.digest)
    })
  })

  describe('latency monitor', () => {
    let libp2p: Libp2pNode

    afterEach(async () => {
      if (libp2p != null) {
        await libp2p.stop()
      }
    })

    it('should only start latency monitor if a limit is configured', async () => {
      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          }
        })
      })

      expect(libp2p).to.not.have.nested.property('connectionManager.latencyMonitor')

      await libp2p.stop()

      libp2p = await createNode({
        config: createBaseOptions({
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            maxEventLoopDelay: 10000
          }
        })
      })

      expect(libp2p).to.have.nested.property('connectionManager.latencyMonitor')
    })
  })
})
