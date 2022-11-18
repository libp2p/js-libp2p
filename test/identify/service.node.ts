/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createLibp2pNode } from '../../src/libp2p.js'
import { createBaseOptions } from '../utils/base-options.js'
import pWaitFor from 'p-wait-for'
import type { Libp2pNode } from '../../src/libp2p.js'

describe('identify', () => {
  let libp2p: Libp2pNode
  let remoteLibp2p: Libp2pNode

  beforeEach(async () => {
    libp2p = await createLibp2pNode(createBaseOptions({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      }
    }))
    remoteLibp2p = await createLibp2pNode(createBaseOptions({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      }
    }))
  })

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }
  })

  it('should run identify automatically for outbound connections', async () => {
    await libp2p.start()
    await remoteLibp2p.start()

    if (libp2p.identifyService == null) {
      throw new Error('Identity service was not configured')
    }

    const identityServiceIdentifySpy = sinon.spy(libp2p.identifyService, 'identify')

    const connection = await libp2p.dial(remoteLibp2p.getMultiaddrs()[0])
    expect(connection).to.exist()

    // Wait for identify to run on the new connection
    await pWaitFor(() => identityServiceIdentifySpy.calledWith(connection))

    // The connection should have no open streams
    await pWaitFor(() => connection.streams.length === 0)
    await connection.close()
  })

  it('should run identify automatically for inbound connections', async () => {
    await libp2p.start()
    await remoteLibp2p.start()

    if (libp2p.identifyService == null) {
      throw new Error('Identity service was not configured')
    }

    const identityServiceIdentifySpy = sinon.spy(libp2p.identifyService, 'identify')

    const connection = await remoteLibp2p.dial(libp2p.getMultiaddrs()[0])
    expect(connection).to.exist()

    // Wait for identify to run on the new connection
    await pWaitFor(() => identityServiceIdentifySpy.calledWith(sinon.match(conn => {
      return conn.remotePeer.toString() === remoteLibp2p.peerId.toString()
    })))

    // The connection should have no open streams
    await pWaitFor(() => connection.streams.length === 0)
    await connection.close()
  })
})
