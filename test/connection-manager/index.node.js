'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { CLOSED } = require('libp2p-interfaces/src/connection/status')

const delay = require('delay')
const pWaitFor = require('p-wait-for')

const peerUtils = require('../utils/creators/peer')
const mockConnection = require('../utils/mockConnection')
const baseOptions = require('../utils/base-options.browser')
const { codes } = require('../../src/errors')
const { Multiaddr } = require('multiaddr')

const listenMultiaddr = '/ip4/127.0.0.1/tcp/15002/ws'

describe('Connection Manager', () => {
  let libp2p
  let peerIds

  before(async () => {
    peerIds = await peerUtils.createPeerId({ number: 2 })
  })

  beforeEach(async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        peerId: peerIds[0],
        addresses: {
          listen: [listenMultiaddr]
        },
        modules: baseOptions.modules
      }
    })
  })

  afterEach(() => libp2p.stop())

  it('should filter connections on disconnect, removing the closed one', async () => {
    const conn1 = await mockConnection({ localPeer: peerIds[0], remotePeer: peerIds[1] })
    const conn2 = await mockConnection({ localPeer: peerIds[0], remotePeer: peerIds[1] })

    const id = peerIds[1].toB58String()

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
        peerId: peerIds[1],
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15003/ws']
        },
        modules: baseOptions.modules
      }
    })

    // Spy on emit for easy verification
    sinon.spy(libp2p.connectionManager, 'emit')
    sinon.spy(remoteLibp2p.connectionManager, 'emit')

    await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.multiaddrs)
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
  let peerIds

  before(async () => {
    peerIds = await peerUtils.createPeerId({ number: 2 })
  })

  it('libp2p.connections gets the connectionManager conns', async () => {
    const [libp2p] = await peerUtils.createPeer({
      config: {
        peerId: peerIds[0],
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15003/ws']
        },
        modules: baseOptions.modules
      }
    })
    const [remoteLibp2p] = await peerUtils.createPeer({
      config: {
        peerId: peerIds[1],
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/15004/ws']
        },
        modules: baseOptions.modules
      }
    })

    await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.multiaddrs)
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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
      await libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)

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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
      await libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)

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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)
      await libp2p.peerStore.addressBook.set(nodes[1].peerId, nodes[1].multiaddrs)
      await libp2p.peerStore.protoBook.set(nodes[1].peerId, ['/protocol-min-conns'])

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
      await libp2p.peerStore.addressBook.set(nodes[0].peerId, nodes[0].multiaddrs)

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

    it('should be closed status once immediately stopping', async () => {
      const [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/15003/ws']
          },
          modules: baseOptions.modules
        }
      })
      const [remoteLibp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[1],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/15004/ws']
          },
          modules: baseOptions.modules
        }
      })

      await libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.multiaddrs)
      await libp2p.dial(remoteLibp2p.peerId)

      const totalConns = Array.from(libp2p.connections.values())
      expect(totalConns.length).to.eql(1)
      const conns = totalConns[0]
      expect(conns.length).to.eql(1)
      const conn = conns[0]

      await libp2p.stop()
      expect(conn.stat.status).to.eql(CLOSED)

      await remoteLibp2p.stop()
    })
  })

  describe('connection gater', () => {
    let libp2p
    let remoteLibp2p
    let port = 15004

    beforeEach(async () => {
      [remoteLibp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[1],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules
        }
      })
    })

    afterEach(async () => {
      remoteLibp2p && await remoteLibp2p.stop()
      libp2p && await libp2p.stop()
    })

    it('intercept peer dial', async () => {
      [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules,
          connectionManager: {
            gater: {
              interceptPeerDial: async (peer) => {
                return peer.toB58String() === remoteLibp2p.peerId.toB58String()
              }
            }
          }
        }
      })
      try {
        await libp2p.dial(remoteLibp2p.peerId)
      } catch (e) {
        expect(e.code).to.equal(codes.ERR_PEER_DIAL_INTERCEPTED)
      }
    })

    it.only('intercept addr dial', async () => {
      const testAddr = new Multiaddr('/ip4/99.99.99.88/tcp/12345/ws/p2p/' + remoteLibp2p.peerId.toB58String())
      [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules,
          connectionManager: {
            gater: {
              interceptAddrDial: async (peerId, maddr) => {
                return peerId.toB58String() === remoteLibp2p.peerId.toB58String() && maddr.toString() === testAddr.toString()
              }
            }
          }
        }
      })
      libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, [
        ...remoteLibp2p.multiaddrs,
        testAddr
      ])
      const { addrs } = await libp2p.dialer._createCancellableDialTarget(remoteLibp2p.peerId)
      expect(addrs.length > 0 && addrs.filter(i => i.toString() === testAddr.toString()).length === 0).to.equal(true)
    })

    it('intercept accept', async () => {
      [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules,
          connectionManager: {
            gater: {
              interceptAccept: async (maConn) => {
                return maConn.remoteAddr.toString().indexOf('127.0.0.1') >= 0
              }
            }
          }
        }
      })
      remoteLibp2p.peerStore.addressBook.set(libp2p.peerId, libp2p.multiaddrs)
      const upgradeInbound = libp2p.upgrader.upgradeInbound.bind(libp2p.upgrader)
      libp2p.upgrader.upgradeInbound = async function (maConn) {
        try {
          return await upgradeInbound(maConn)
        } catch (e) {
          expect(e.toString().indexOf('interceptAccept') >= 0 && e.code === codes.ERR_CONNECTION_INTERCEPTED).to.equal(true)
        }
      }
      try {
        await remoteLibp2p.dial(libp2p.peerId)
      } catch (e) {
      }
    })

    it('intercept secured (inbound)', async () => {
      [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules,
          connectionManager: {
            gater: {
              interceptSecured: async (type, remotePeer, encryptedConn) => {
                return remotePeer.toB58String() === remoteLibp2p.peerId.toB58String() && type === 'inbound'
              }
            }
          }
        }
      })
      remoteLibp2p.peerStore.addressBook.set(libp2p.peerId, libp2p.multiaddrs)
      const upgradeInbound = libp2p.upgrader.upgradeInbound.bind(libp2p.upgrader)
      libp2p.upgrader.upgradeInbound = async function (maConn) {
        try {
          return await upgradeInbound(maConn)
        } catch (e) {
          expect(e.toString().indexOf('interceptSecured') >= 0 && e.code === codes.ERR_CONNECTION_INTERCEPTED).to.equal(true)
        }
      }
      try {
        remoteLibp2p.dial(libp2p.peerId)
      } catch (e) {
      }
    })

    it('intercept secured (outbound)', async () => {
      [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules,
          connectionManager: {
            gater: {
              interceptSecured: async (type, remotePeer, encryptedConn) => {
                return remotePeer.toB58String() === remoteLibp2p.peerId.toB58String() && type === 'outbound'
              }
            }
          }
        }
      })
      libp2p.peerStore.addressBook.set(remoteLibp2p.peerId, remoteLibp2p.multiaddrs)
      try {
        await libp2p.dial(remoteLibp2p.peerId)
      } catch (e) {
        expect(e.toString().indexOf('interceptSecured') >= 0).to.equal(true)
      }
    })

    it('intercept upgraded', async () => {
      [libp2p] = await peerUtils.createPeer({
        config: {
          peerId: peerIds[0],
          addresses: {
            listen: ['/ip4/127.0.0.1/tcp/' + (port++) + '/ws']
          },
          modules: baseOptions.modules,
          connectionManager: {
            gater: {
              interceptUpgraded: async (upgradedConn) => {
                return true
              }
            }
          }
        }
      })
      remoteLibp2p.peerStore.addressBook.set(libp2p.peerId, libp2p.multiaddrs)
      const upgradeInbound = libp2p.upgrader.upgradeInbound.bind(libp2p.upgrader)
      libp2p.upgrader.upgradeInbound = async function (maConn) {
        try {
          return await upgradeInbound(maConn)
        } catch (e) {
          expect(e.toString().indexOf('interceptUpgraded') >= 0 && e.code === codes.ERR_CONNECTION_INTERCEPTED).to.equal(true)
        }
      }
      try {
        remoteLibp2p.dial(libp2p.peerId)
      } catch (e) {
      }
    })
  })
})
