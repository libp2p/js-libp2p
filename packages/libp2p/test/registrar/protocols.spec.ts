import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { createLibp2p } from '../../src/index.js'
import type { Components } from '../../src/components.js'
import type { Libp2p } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'

describe('registrar protocols', () => {
  let libp2p: Libp2p
  let registrar: Registrar

  beforeEach(async () => {
    const deferred = pDefer<Components>()

    libp2p = await createLibp2p({
      services: {
        test: (components: any) => {
          deferred.resolve(components)
        }
      }
    })

    const components = await deferred.promise
    registrar = components.registrar
  })

  afterEach(async () => {
    await libp2p?.stop()
  })

  it('should be able to register and unregister a handler', async () => {
    expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0', '/echo/1.0.1'])

    const echoHandler = (): void => {}
    await libp2p.handle(['/echo/1.0.0', '/echo/1.0.1'], echoHandler)
    expect(registrar.getHandler('/echo/1.0.0')).to.have.property('handler', echoHandler)
    expect(registrar.getHandler('/echo/1.0.1')).to.have.property('handler', echoHandler)

    await libp2p.unhandle(['/echo/1.0.0'])
    expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0'])
    expect(registrar.getHandler('/echo/1.0.1')).to.have.property('handler', echoHandler)

    await expect(libp2p.peerStore.get(libp2p.peerId)).to.eventually.have.deep.property('protocols', [
      '/echo/1.0.1'
    ])
  })

  it('should error if registering two handlers for the same protocol', async () => {
    const echoHandler = (): void => {}
    await libp2p.handle('/echo/1.0.0', echoHandler)

    await expect(libp2p.handle('/echo/1.0.0', echoHandler)).to.eventually.be.rejected
      .with.property('name', 'DuplicateProtocolHandlerError')
  })

  it('should error if registering two handlers for the same protocols', async () => {
    const echoHandler = (): void => {}
    await libp2p.handle('/echo/1.0.0', echoHandler)

    await expect(libp2p.handle(['/echo/2.0.0', '/echo/1.0.0'], echoHandler)).to.eventually.be.rejected
      .with.property('name', 'DuplicateProtocolHandlerError')
  })

  it('should not error if force-registering two handlers for the same protocol', async () => {
    const echoHandler = (): void => {}
    await libp2p.handle('/echo/1.0.0', echoHandler)

    await expect(libp2p.handle('/echo/1.0.0', echoHandler, {
      force: true
    })).to.eventually.be.ok
  })

  it('should not error if force-registering two handlers for the same protocols', async () => {
    const echoHandler = (): void => {}
    await libp2p.handle('/echo/1.0.0', echoHandler)

    await expect(libp2p.handle(['/echo/2.0.0', '/echo/1.0.0'], echoHandler, {
      force: true
    })).to.eventually.be.ok
  })
})
