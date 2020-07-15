'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')

const delay = require('delay')
const pWaitFor = require('p-wait-for')

const peerUtils = require('../utils/creators/peer')
const mockConnection = require('../utils/mockConnection')
const baseOptions = require('../utils/base-options.browser')

const listenMultiaddr = '/ip4/127.0.0.1/tcp/15002/ws'

describe('Connection Manager', () => {
  let libp2p

  beforeEach(async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        addresses: {
          listen: [listenMultiaddr]
        },
        modules: baseOptions.modules
      }
    })
  })

  afterEach(() => libp2p.stop())

  it('should filter connections on disconnect, removing the closed one', async () => {
    const [localPeer, remotePeer] = await peerUtils.createPeerId({ number: 2 })

    const conn1 = await mockConnection({ localPeer, remotePeer })
    const conn2 = await mockConnection({ localPeer, remotePeer })

    const id = remotePeer.toB58String()

    // Add connection to the connectionManager
    libp2p.connectionManager.onConnect(conn1)
    libp2p.connectionManager.onConnect(conn2)

    expect(libp2p.connectionManager.connections.get(id).length).to.eql(2)

    conn2._stat.status = 'closed'
    libp2p.connectionManager.onDisconnect(conn2)

    const peerConnections = libp2p.connectionManager.connections.get(id)
    expect(peerConnections.length).to.eql(1)
    expect(peerConnections[0]._stat.status).to.eql('open')
  })

  it('should add connection on dial and remove on node stop', async () => {
    const [remoteLibp2p] = await peerUtils.createPeer({
      config: {
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15003/ws']
        },
        modules: baseOptions.modules
      }
    })

    // Spy on emit for easy verification
    sinon.spy(libp2p.connectionManager, 'emit')
    sinon.spy(remoteLibp2p.connectionManager, 'emit')

    libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.multiaddrs)
    await libp2p.dial(remoteLibp2p.peerId)

    // check connect event
    expect(libp2p.connectionManager.emit.callCount).to.equal(1)
    const [event, connection] = libp2p.connectionManager.emit.getCall(0).args
    expect(event).to.equal('peer:connect')
    expect(connection.remotePeer.equals(remoteLibp2p.peerId)).to.equal(true)

    const libp2pConn = libp2p.connectionManager.get(remoteLibp2p.peerId)
    expect(libp2pConn).to.exist()

    const remoteConn = remoteLibp2p.connectionManager.get(libp2p.peerId)
    expect(remoteConn).to.exist()

    await remoteLibp2p.stop()
    expect(remoteLibp2p.connectionManager.size).to.eql(0)
  })
})

describe('libp2p.connections', () => {
  it('libp2p.connections gets the connectionManager conns', async () => {
    const [libp2p] = await peerUtils.createPeer({
      config: {
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15003/ws']
        },
        modules: baseOptions.modules
      }
    })
    const [remoteLibp2p] = await peerUtils.createPeer({
      config: {
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15004/ws']
        },
        modules: baseOptions.modules
      }
    })

    libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.multiaddrs)
    await libp2p.dial(remoteLibp2p.peerId)

    expect(libp2p.connections.size).to.eql(1)

    await libp2p.stop()
    await remoteLibp2p.stop()
  })

  describe('proactive connections', () => {
    let nodes = []

    beforeEach(async () => {
      nodes = await peerUtils.createPeer({
        number: 2,
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          }
        }
      })
    })

    afterEach(async () => {
      await Promise.all(nodes.map((node) => node.stop()))
      sinon.reset()
    })

    it('should connect to all the peers stored in the PeerStore, if their number is below minConnections', async () => {
      const [libp2p] = await peerUtils.createPeer({
        fixture: false,
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
      libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
      libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)

      await libp2p.start()

      // Wait for peers to connect
      await pWaitFor(() => libp2p.connectionManager.size === 2)

      await libp2p.stop()
    })

    it('should connect to all the peers stored in the PeerStore until reaching the minConnections', async () => {
      const minConnections = 1
      const [libp2p] = await peerUtils.createPeer({
        fixture: false,
        started: false,
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections
          }
        }
      })

      // Populate PeerStore before starting
      libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
      libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)

      await libp2p.start()

      // Wait for peer to connect
      await pWaitFor(() => libp2p.connectionManager.size === minConnections)

      // Wait more time to guarantee no other connection happened
      await delay(200)
      expect(libp2p.connectionManager.size).to.eql(minConnections)

      await libp2p.stop()
    })

    it('should connect to all the peers stored in the PeerStore until reaching the minConnections sorted', async () => {
      const minConnections = 1
      const [libp2p] = await peerUtils.createPeer({
        fixture: false,
        started: false,
        config: {
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0/ws']
          },
          connectionManager: {
            minConnections
          }
        }
      })

      // Populate PeerStore before starting
      libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
      libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)
      libp2p.peerStore.protoBook.set(nodes[1].peerId, ['/protocol-min-conns'])

      await libp2p.start()

      // Wait for peer to connect
      await pWaitFor(() => libp2p.connectionManager.size === minConnections)

      // Should have connected to the peer with protocols
      expect(libp2p.connectionManager.get(nodes[0].peerId)).to.not.exist()
      expect(libp2p.connectionManager.get(nodes[1].peerId)).to.exist()

      await libp2p.stop()
    })

    it('should connect to peers in the PeerStore when a peer disconnected', async () => {
      const minConnections = 1
      const autoDialInterval = 1000

      const [libp2p] = await peerUtils.createPeer({
        fixture: false,
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
      libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)

      // Wait for peer to connect
      const conn = await libp2p.dial(nodes[0].peerId)
      expect(libp2p.connectionManager.get(nodes[0].peerId)).to.exist()

      await conn.close()
      // Closed
      await pWaitFor(() => libp2p.connectionManager.size === 0)
      // Connected
      await pWaitFor(() => libp2p.connectionManager.size === 1)

      expect(libp2p.connectionManager.get(nodes[0].peerId)).to.exist()

      await libp2p.stop()
    })
  })
})
