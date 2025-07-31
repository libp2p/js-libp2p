/* eslint-env mocha */

import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { streamPair } from '@libp2p/test-utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import last from 'it-last'
import { stubInterface } from 'sinon-ts'
import { Perf } from '../src/perf-service.js'
import type { ComponentLogger, Connection } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedPerfComponents {
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
  logger: ComponentLogger
}

export function createComponents (): StubbedPerfComponents {
  return {
    registrar: stubInterface<Registrar>(),
    connectionManager: stubInterface<ConnectionManager>(),
    logger: defaultLogger()
  }
}

describe('perf', () => {
  let localComponents: StubbedPerfComponents
  let remoteComponents: StubbedPerfComponents

  beforeEach(async () => {
    localComponents = createComponents()
    remoteComponents = createComponents()

    await Promise.all([
      start(localComponents),
      start(remoteComponents)
    ])
  })

  afterEach(async () => {
    await Promise.all([
      stop(localComponents),
      stop(remoteComponents)
    ])
  })

  it('should run perf', async () => {
    const client = new Perf(localComponents)
    const server = new Perf(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const ma = multiaddr('/ip4/0.0.0.0')
    const streams = await streamPair()

    const aToB = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    aToB.newStream.resolves(streams[0])
    localComponents.connectionManager.openConnection.withArgs(ma, {
      force: true
    }).resolves(aToB)
    localComponents.connectionManager.getConnections.returns([])

    const bToA = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    void server.handleMessage(streams[1], bToA)

    // Run Perf
    const finalResult = await last(client.measurePerformance(ma, 1024, 1024))

    expect(finalResult).to.have.property('type', 'final')
    expect(finalResult).to.have.property('uploadBytes', 1024)

    expect(localComponents.connectionManager.openConnection.getCall(0).args[1]?.force).to.be.true('did not open new connection')
  })

  it('should reuse existing connection', async () => {
    const client = new Perf(localComponents)
    const server = new Perf(remoteComponents)

    await start(client)
    await start(server)

    // simulate connection between nodes
    const ma = multiaddr('/ip4/0.0.0.0')
    const streams = await streamPair()

    const aToB = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    aToB.newStream.resolves(streams[0])
    localComponents.connectionManager.openConnection.resolves(aToB)
    localComponents.connectionManager.getConnections.returns([])

    const bToA = stubInterface<Connection>({
      log: defaultLogger().forComponent('connection')
    })
    void server.handleMessage(streams[1], bToA)

    // Run Perf
    const finalResult = await last(client.measurePerformance(ma, 1024, 1024, {
      reuseExistingConnection: true
    }))

    expect(finalResult).to.have.property('type', 'final')
    expect(finalResult).to.have.property('uploadBytes', 1024)

    expect(localComponents.connectionManager.openConnection.getCall(0).args[1]?.force).to.be.false('did not reuse existing connection')
  })
})
