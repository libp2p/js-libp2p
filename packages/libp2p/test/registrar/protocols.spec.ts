import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { createLibp2p } from '../../src/index.ts'
import type { Components } from '../../src/components.ts'
import type { Libp2p, StreamMiddleware } from '@libp2p/interface'
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

  it('should append protocol middleware while global middleware coexists', () => {
    const first: StreamMiddleware = (stream, connection, next) => next(stream, connection)
    const second: StreamMiddleware = (stream, connection, next) => next(stream, connection)
    const specific: StreamMiddleware = (stream, connection, next) => next(stream, connection)
    const appended: StreamMiddleware = (stream, connection, next) => next(stream, connection)
    const protocol: Parameters<Libp2p['unuse']>[0] = '/middleware-test/1'
    libp2p.use(first)
    libp2p.use(second)
    const registration: Parameters<Libp2p['use']> = [protocol, specific]
    libp2p.use(...registration)
    libp2p.use(protocol, [appended])
    expect(registrar.getMiddleware(protocol)).to.deep.equal([first, second, specific, appended])
    expect(registrar.getProtocols()).to.deep.equal([])

    libp2p.unuse(protocol)
    expect(registrar.getMiddleware(protocol)).to.deep.equal([first, second])
    libp2p.use(protocol, specific)
    libp2p.unuse(first)
    expect(registrar.getMiddleware(protocol)).to.deep.equal([second, specific])
    libp2p.unuse(second)
    expect(registrar.getMiddleware(protocol)).to.deep.equal([specific])
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

  describe('middleware', () => {
    const protocol = '/echo/1.0.0'
    let a: StreamMiddleware
    let b: StreamMiddleware

    beforeEach(() => {
      a = (stream, connection, next) => { next(stream, connection) }
      b = (stream, connection, next) => { next(stream, connection) }
    })

    it('should register and deregister protocol middleware', () => {
      libp2p.use(protocol, a)
      libp2p.use(protocol, [a, b])

      expect(registrar.getMiddleware(protocol)).to.deep.equal([a, b])

      libp2p.unuse(protocol, a)

      expect(registrar.getMiddleware(protocol)).to.deep.equal([b])

      libp2p.use(protocol, a)
      libp2p.unuse(protocol, [a, b])

      expect(registrar.getMiddleware(protocol)).to.be.empty()
    })

    it('should not deregister protocol middleware when passed an empty list', () => {
      libp2p.use(protocol, [a, b])
      libp2p.unuse(protocol, [])

      expect(registrar.getMiddleware(protocol)).to.deep.equal([a, b])
    })

    it('should deregister all protocol middleware', () => {
      libp2p.use(a)
      libp2p.use(protocol, b)
      libp2p.unuse(protocol)

      expect(registrar.getMiddleware(protocol)).to.deep.equal([a])
    })

    it('should register and deregister global middleware', () => {
      libp2p.use(a)
      libp2p.use([a, b])

      expect(registrar.getMiddleware(protocol)).to.deep.equal([a, b])

      libp2p.unuse(a)

      expect(registrar.getMiddleware(protocol)).to.deep.equal([b])

      libp2p.unuse([a, b])

      expect(registrar.getMiddleware(protocol)).to.be.empty()
    })

    it('should reject invalid middleware', () => {
      // @ts-expect-error middleware is required
      expect(() => { libp2p.use(protocol) }).to.throw()
        .with.property('name', 'InvalidParametersError')
      // @ts-expect-error middleware must be functions
      expect(() => { libp2p.use(protocol, [a, undefined]) }).to.throw()
        .with.property('name', 'InvalidParametersError')
      // @ts-expect-error global middleware is a single argument
      expect(() => { libp2p.use(a, b) }).to.throw()
        .with.property('name', 'InvalidParametersError')
      // @ts-expect-error global middleware is a single argument
      expect(() => { libp2p.unuse(a, b) }).to.throw()
        .with.property('name', 'InvalidParametersError')
      // @ts-expect-error middleware is required
      expect(() => { libp2p.use() }).to.throw()
        .with.property('name', 'InvalidParametersError')
      // @ts-expect-error protocol must be a string
      expect(() => { libp2p.use(undefined, a) }).to.throw(/Protocol must be a string/)
        .with.property('name', 'InvalidParametersError')
      // @ts-expect-error protocol must be a string
      expect(() => { libp2p.unuse(undefined, a) }).to.throw(/Protocol must be a string/)
        .with.property('name', 'InvalidParametersError')

      expect(registrar.getMiddleware(protocol)).to.be.empty()

      libp2p.use(protocol, a)

      // @ts-expect-error middleware must be functions
      expect(() => { libp2p.unuse(protocol, [a, undefined]) }).to.throw()
        .with.property('name', 'InvalidParametersError')

      expect(registrar.getMiddleware(protocol)).to.deep.equal([a])
    })
  })
})
