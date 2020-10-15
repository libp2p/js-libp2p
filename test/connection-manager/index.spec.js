'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const peerUtils = require('../utils/creators/peer')
const mockConnection = require('../utils/mockConnection')
const baseOptions = require('../utils/base-options.browser')

describe('Connection Manager', () => {
  let libp2p

  afterEach(async () => {
    sinon.restore()
    libp2p && await libp2p.stop()
  })

  it('should be able to create without metrics', async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        modules: baseOptions.modules
      },
      started: false
    })

    const spy = sinon.spy(libp2p.connectionManager, 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.connectionManager._metrics).to.not.exist()
  })

  it('should be able to create with metrics', async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        modules: baseOptions.modules,
        metrics: {
          enabled: true
        }
      },
      started: false
    })

    const spy = sinon.spy(libp2p.connectionManager, 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.connectionManager._libp2p.metrics).to.exist()
  })

  it('should close lowest value peer connection when the maximum has been reached', async () => {
    const max = 5
    ;[libp2p] = await peerUtils.createPeer({
      config: {
        modules: baseOptions.modules,
        connectionManager: {
          maxConnections: max,
          minConnections: 2
        }
      },
      started: false
    })

    await libp2p.start()

    sinon.spy(libp2p.connectionManager, '_maybeDisconnectOne')

    // Add 1 too many connections
    const spies = new Map()
    await Promise.all([...new Array(max + 1)].map(async (_, index) => {
      const connection = await mockConnection()
      const spy = sinon.spy(connection, 'close')
      // The connections have the same remote id, give them random ones
      // so that we can verify the correct connection was closed
      sinon.stub(connection.remotePeer, 'toB58String').returns(index)
      const value = Math.random()
      spies.set(value, spy)
      libp2p.connectionManager.setPeerValue(connection.remotePeer, value)
      libp2p.connectionManager.onConnect(connection)
    }))

    // get the lowest value
    const lowest = Array.from(spies.keys()).sort()[0]
    const lowestSpy = spies.get(lowest)

    expect(libp2p.connectionManager._maybeDisconnectOne).to.have.property('callCount', 1)
    expect(lowestSpy).to.have.property('callCount', 1)
  })

  it('should close connection when the maximum has been reached even without peer values', async () => {
    const max = 5
    ;[libp2p] = await peerUtils.createPeer({
      config: {
        modules: baseOptions.modules,
        connectionManager: {
          maxConnections: max,
          minConnections: 0
        }
      },
      started: false
    })

    await libp2p.start()

    sinon.spy(libp2p.connectionManager, '_maybeDisconnectOne')

    // Add 1 too many connections
    const spy = sinon.spy()
    await Promise.all([...new Array(max + 1)].map(async () => {
      const connection = await mockConnection()
      sinon.stub(connection, 'close').callsFake(() => spy()) // eslint-disable-line
      libp2p.connectionManager.onConnect(connection)
    }))

    expect(libp2p.connectionManager._maybeDisconnectOne).to.have.property('callCount', 1)
    expect(spy).to.have.property('callCount', 1)
  })

  it('should fail if the connection manager has mismatched connection limit options', async () => {
    await expect(peerUtils.createPeer({
      config: {
        modules: baseOptions.modules,
        connectionManager: {
          maxConnections: 5,
          minConnections: 6
        }
      },
      started: false
    })).to.eventually.rejected('maxConnections must be greater')
  })
})
