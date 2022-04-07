/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createNode } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.browser.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import type { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { mockConnection, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { CustomEvent } from '@libp2p/interfaces'

describe('Connection Manager', () => {
  let libp2p: Libp2pNode

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should be able to create without metrics', async () => {
    libp2p = await createNode({
      config: createBaseOptions(),
      started: false
    })

    const spy = sinon.spy(libp2p.components.getConnectionManager() as DefaultConnectionManager, 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.components.getMetrics()).to.not.exist()
  })

  it('should be able to create with metrics', async () => {
    libp2p = await createNode({
      config: createBaseOptions({
        metrics: {
          enabled: true
        }
      }),
      started: false
    })

    const spy = sinon.spy(libp2p.components.getConnectionManager() as DefaultConnectionManager, 'start')

    await libp2p.start()
    expect(spy).to.have.property('callCount', 1)
    expect(libp2p.components.getMetrics()).to.exist()
  })

  it('should close lowest value peer connection when the maximum has been reached', async () => {
    const max = 5
    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max,
          minConnections: 2
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    const connectionManagerMaybeDisconnectOneSpy = sinon.spy(connectionManager, '_maybeDisconnectOne')

    // Add 1 too many connections
    const spies = new Map<number, sinon.SinonSpy<[], Promise<void>>>()
    await Promise.all([...new Array(max + 1)].map(async (_, index) => {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
      const spy = sinon.spy(connection, 'close')
      // The connections have the same remote id, give them random ones
      // so that we can verify the correct connection was closed
      // sinon.stub(connection.remotePeer, 'toString').returns(index)
      const value = Math.random()
      spies.set(value, spy)
      connectionManager.setPeerValue(connection.remotePeer, value)
      await connectionManager.onConnect(new CustomEvent('connection', { detail: connection }))
    }))

    // get the lowest value
    const lowest = Array.from(spies.keys()).sort((a, b) => {
      if (a > b) {
        return 1
      }

      if (a < b) {
        return -1
      }

      return 0
    })[0]
    const lowestSpy = spies.get(lowest)

    expect(connectionManagerMaybeDisconnectOneSpy.callCount).to.equal(1)
    expect(lowestSpy).to.have.property('callCount', 1)
  })

  it('should close connection when the maximum has been reached even without peer values', async () => {
    const max = 5
    libp2p = await createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: max,
          minConnections: 0
        }
      }),
      started: false
    })

    await libp2p.start()

    const connectionManager = libp2p.components.getConnectionManager() as DefaultConnectionManager
    const connectionManagerMaybeDisconnectOneSpy = sinon.spy(connectionManager, '_maybeDisconnectOne')

    // Add 1 too many connections
    const spy = sinon.spy()
    await Promise.all([...new Array(max + 1)].map(async () => {
      const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
      sinon.stub(connection, 'close').callsFake(async () => spy()) // eslint-disable-line
      await connectionManager.onConnect(new CustomEvent('connection', { detail: connection }))
    }))

    expect(connectionManagerMaybeDisconnectOneSpy.callCount).to.equal(1)
    expect(spy).to.have.property('callCount', 1)
  })

  it('should fail if the connection manager has mismatched connection limit options', async () => {
    await expect(createNode({
      config: createBaseOptions({
        connectionManager: {
          maxConnections: 5,
          minConnections: 6
        }
      }),
      started: false
    })).to.eventually.rejected('maxConnections must be greater')
  })
})
