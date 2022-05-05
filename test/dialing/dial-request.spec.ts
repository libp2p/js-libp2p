/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import sinon from 'sinon'
import { AbortError } from '@libp2p/interfaces/errors'
import pDefer from 'p-defer'
import delay from 'delay'
import { DialAction, DialRequest } from '../../src/connection-manager/dialer/dial-request.js'
import { mockConnection, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { Multiaddr } from '@multiformats/multiaddr'
import { Dialer } from '../../src/connection-manager/dialer/index.js'
const error = new Error('dial failure')

describe('Dial Request', () => {
  it('should end when a single multiaddr dials succeeds', async () => {
    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
    const deferredConn = pDefer<void>()
    const actions: Record<string, () => Promise<any>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => await Promise.reject(error),
      '/ip4/127.0.0.1/tcp/1232': async () => await Promise.resolve(connection),
      '/ip4/127.0.0.1/tcp/1233': async () => deferredConn.promise
    }
    const dialAction: DialAction = async (num) => await actions[num.toString()]()
    const controller = new AbortController()
    const dialer = new Dialer({
      maxParallelDials: 2
    })
    const dialerReleaseTokenSpy = sinon.spy(dialer, 'releaseToken')
    const dialRequest = new DialRequest({
      addrs: Object.keys(actions).map(str => new Multiaddr(str)),
      dialer,
      dialAction
    })

    // Make sure that dial attempt comes back before terminating last dial action
    expect(await dialRequest.run({ signal: controller.signal })).to.equal(connection)

    // End dial attempt
    deferredConn.reject()

    expect(dialerReleaseTokenSpy.callCount).to.equal(2)
  })

  it('should release tokens when all addr dials have started', async () => {
    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
    const firstDials = pDefer()
    const deferred = pDefer()
    const actions: Record<string, () => Promise<any>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => await firstDials.promise,
      '/ip4/127.0.0.1/tcp/1232': async () => await firstDials.promise,
      '/ip4/127.0.0.1/tcp/1233': async () => await deferred.promise
    }
    const dialAction: DialAction = async (num) => await actions[num.toString()]()
    const controller = new AbortController()
    const dialer = new Dialer({
      maxParallelDials: 2
    })
    const dialerReleaseTokenSpy = sinon.spy(dialer, 'releaseToken')
    const dialRequest = new DialRequest({
      addrs: Object.keys(actions).map(str => new Multiaddr(str)),
      dialer,
      dialAction
    })

    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1231')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1232')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1233')

    void dialRequest.run({ signal: controller.signal })
    // Let the first dials run
    await delay(0)

    // Finish the first 2 dials
    firstDials.reject(error)
    await delay(0)

    // Only 1 dial should remain, so 1 token should have been released
    expect(actions['/ip4/127.0.0.1/tcp/1231']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1232']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1233']).to.have.property('callCount', 1)
    expect(dialerReleaseTokenSpy.callCount).to.equal(1)

    // Finish the dial and release the 2nd token
    deferred.resolve(connection)
    await delay(0)
    expect(dialerReleaseTokenSpy.callCount).to.equal(2)
  })

  it('should throw an AggregateError if all dials fail', async () => {
    const actions: Record<string, () => Promise<any>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => await Promise.reject(error),
      '/ip4/127.0.0.1/tcp/1232': async () => await Promise.reject(error),
      '/ip4/127.0.0.1/tcp/1233': async () => await Promise.reject(error)
    }
    const dialAction: DialAction = async (num) => await actions[num.toString()]()
    const addrs = Object.keys(actions)
    const controller = new AbortController()
    const dialer = new Dialer({
      maxParallelDials: 2
    })
    const dialerReleaseTokenSpy = sinon.spy(dialer, 'releaseToken')
    const dialerGetTokensSpy = sinon.spy(dialer, 'getTokens')
    const dialRequest = new DialRequest({
      addrs: Object.keys(actions).map(str => new Multiaddr(str)),
      dialer,
      dialAction
    })

    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1231')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1232')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1233')

    try {
      await dialRequest.run({ signal: controller.signal })
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AggregateError')
    }

    expect(actions['/ip4/127.0.0.1/tcp/1231']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1232']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1233']).to.have.property('callCount', 1)

    expect(dialerGetTokensSpy.calledWith(addrs.length)).to.equal(true)
    expect(dialerReleaseTokenSpy.callCount).to.equal(2)
  })

  it('should handle a large number of addrs', async () => {
    const reject = sinon.stub().callsFake(async () => await Promise.reject(error))
    const actions: Record<string, () => Promise<any>> = {}
    const addrs = [...new Array(25)].map((_, index) => `/ip4/127.0.0.1/tcp/12${index + 1}`)
    addrs.forEach(addr => {
      actions[addr] = reject
    })

    const dialAction: DialAction = async (num) => await actions[num.toString()]()
    const controller = new AbortController()
    const dialer = new Dialer({
      maxParallelDials: 2
    })
    const dialerReleaseTokenSpy = sinon.spy(dialer, 'releaseToken')
    const dialRequest = new DialRequest({
      addrs: Object.keys(actions).map(str => new Multiaddr(str)),
      dialer,
      dialAction
    })

    try {
      await dialRequest.run({ signal: controller.signal })
      expect.fail('Should have thrown')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AggregateError')
    }

    expect(reject).to.have.property('callCount', addrs.length)
    expect(dialerReleaseTokenSpy.callCount).to.equal(2)
  })

  it('should abort all dials when its signal is aborted', async () => {
    const deferToAbort = async (args: { signal: AbortSignal }) => {
      const { signal } = args

      if (signal.aborted) {
        throw new Error('already aborted')
      }

      const deferred = pDefer<any>()
      const onAbort = () => {
        deferred.reject(new AbortError())
        signal.removeEventListener('abort', onAbort)
      }
      signal.addEventListener('abort', onAbort)
      return await deferred.promise
    }

    const actions: Record<string, (...args: any[]) => Promise<any>> = {
      '/ip4/127.0.0.1/tcp/1231': deferToAbort,
      '/ip4/127.0.0.1/tcp/1232': deferToAbort,
      '/ip4/127.0.0.1/tcp/1233': deferToAbort
    }
    const dialAction: DialAction = async (num) => await actions[num.toString()]()
    const addrs = Object.keys(actions)
    const controller = new AbortController()
    const dialer = new Dialer({
      maxParallelDials: 2
    })
    const dialerReleaseTokenSpy = sinon.spy(dialer, 'releaseToken')
    const dialerGetTokensSpy = sinon.spy(dialer, 'getTokens')
    const dialRequest = new DialRequest({
      addrs: Object.keys(actions).map(str => new Multiaddr(str)),
      dialer,
      dialAction
    })

    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1231')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1232')
    sinon.spy(actions, '/ip4/127.0.0.1/tcp/1233')

    try {
      setTimeout(() => controller.abort(), 100)
      await dialRequest.run({ signal: controller.signal })
      expect.fail('dial should have failed')
    } catch (err: any) {
      expect(err).to.have.property('name', 'AggregateError')
    }

    expect(actions['/ip4/127.0.0.1/tcp/1231']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1232']).to.have.property('callCount', 1)
    expect(actions['/ip4/127.0.0.1/tcp/1233']).to.have.property('callCount', 1)

    expect(dialerGetTokensSpy.calledWith(addrs.length)).to.equal(true)
    expect(dialerReleaseTokenSpy.callCount).to.equal(2)
  })

  it('should abort other dials when one succeeds', async () => {
    const connection = mockConnection(mockMultiaddrConnection(mockDuplex(), await createEd25519PeerId()))
    const actions: Record<string, () => Promise<any>> = {
      '/ip4/127.0.0.1/tcp/1231': async () => {
        await delay(100)
      },
      '/ip4/127.0.0.1/tcp/1232': async () => {
        // Successful dial takes longer to establish
        await delay(1000)

        return connection
      },

      '/ip4/127.0.0.1/tcp/1233': async () => {
        await delay(100) 
      }
    }
  
    const signals: Record<string, AbortSignal | undefined> = {}

    const dialRequest = new DialRequest({
      addrs: Object.keys(actions).map(str => new Multiaddr(str)),
      dialer: new DefaultDialer(new Components(), {
        maxParallelDials: 3
      }),
      dialAction: async (ma, opts) => {
        signals[ma.toString()] = opts.signal
        return await actions[ma.toString()]()
      }
    })
  
    await expect(dialRequest.run()).to.eventually.equal(connection)

    // Dial attempt finished without connection
    expect(signals['/ip4/127.0.0.1/tcp/1231']).to.have.property('aborted', false)
    // Dial attempt led to connection
    expect(signals['/ip4/127.0.0.1/tcp/1232']).to.have.property('aborted', false)
    // Dial attempt finished without connection
    expect(signals['/ip4/127.0.0.1/tcp/1233']).to.have.property('aborted', false)
  })
})
