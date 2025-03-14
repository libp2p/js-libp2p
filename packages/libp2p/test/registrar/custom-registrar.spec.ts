/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'

describe('custom registrar functionality', () => {
  let libp2p: Libp2p
  let customRegistrar: {
    handle: sinon.SinonStub<any, Promise<void>>
    unhandle: sinon.SinonStub<any, Promise<void>>
    getProtocols: sinon.SinonStub<any, string[]>
    register: sinon.SinonStub<any, Promise<string>>
    unregister: sinon.SinonStub<any, void>
    getHandler: sinon.SinonStub<any, { handler(): void, options: Record<string, unknown> }>
    getTopologies: sinon.SinonStub<any, any[]>
  }

  beforeEach(async (): Promise<void> => {
    customRegistrar = {
      handle: sinon.stub().resolves(),
      unhandle: sinon.stub().resolves(),
      getProtocols: sinon.stub().returns(['/custom/1.0.0']),
      register: sinon.stub().resolves('custom-topology-id'),
      unregister: sinon.stub(),
      getHandler: sinon.stub().returns({ handler: (): void => {}, options: {} }),
      getTopologies: sinon.stub().returns([])
    }

    libp2p = await createLibp2p({
      registrar: (_components) => customRegistrar as unknown as Registrar
    })
  })

  afterEach(async (): Promise<void> => {
    await libp2p?.stop()
    sinon.restore()
  })

  it('should reflect custom getProtocols implementation', (): void => {
    const protocols: string[] = libp2p.getProtocols()
    expect(protocols).to.deep.equal(['/custom/1.0.0'])
    expect(customRegistrar.getProtocols.callCount).to.equal(1)
  })

  it('should call custom registrar handle method when registering a protocol handler', async (): Promise<void> => {
    const testHandler = (): void => {}
    await libp2p.handle('/custom/1.0.0', testHandler)
    expect(customRegistrar.handle.callCount).to.equal(1)
    expect(customRegistrar.handle.firstCall.args).to.deep.equal(['/custom/1.0.0', testHandler, undefined])
  })

  it('should call custom registrar unhandle method when unregistering a protocol handler', async (): Promise<void> => {
    await libp2p.unhandle('/custom/1.0.0')
    expect(customRegistrar.unhandle.callCount).to.equal(1)
    expect(customRegistrar.unhandle.firstCall.args).to.deep.equal(['/custom/1.0.0'])
  })

  it('should use custom registrar register method for topologies', async (): Promise<void> => {
    const topology = {
      onConnect: (): void => {},
      onDisconnect: (): void => {}
    }
    const topologyId: string = await libp2p.register('/custom/1.0.0', topology)
    expect(topologyId).to.equal('custom-topology-id')
    expect(customRegistrar.register.callCount).to.equal(1)
    expect(customRegistrar.register.firstCall.args).to.deep.equal(['/custom/1.0.0', topology])
  })

  it('should call custom registrar unregister method for topologies', (): void => {
    libp2p.unregister('custom-topology-id')
    expect(customRegistrar.unregister.callCount).to.equal(1)
    expect(customRegistrar.unregister.firstCall.args).to.deep.equal(['custom-topology-id'])
  })
})
