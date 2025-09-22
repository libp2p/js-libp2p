import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { floodsub } from '../src/index.js'
import { connectionPair } from './fixtures/connection.js'
import type { FloodSub } from '../src/index.js'
import type { PeerId } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

describe('pubsub base life cycle', () => {
  describe('should start and stop properly', () => {
    let pubsub: FloodSub
    let registrar: StubbedInstance<Registrar>

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)

      registrar = stubInterface<Registrar>()
      registrar.register.resolves(`id-${Math.random()}`)

      pubsub = floodsub()({
        peerId,
        privateKey,
        registrar,
        logger: defaultLogger()
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should be able to start and stop', async () => {
      await start(pubsub)
      expect(registrar.handle).to.have.property('calledOnce', true)
      expect(registrar.register).to.have.property('calledOnce', true)

      expect(pubsub.getPeers()).to.be.empty()

      await stop(pubsub)
      expect(registrar.unhandle).to.have.property('calledOnce', true)
      expect(registrar.unregister).to.have.property('calledOnce', true)
    })

    it('starting should not throw if already started', async () => {
      await start(pubsub)
      await start(pubsub)
      expect(registrar.handle).to.have.property('calledOnce', true)
      expect(registrar.register).to.have.property('calledOnce', true)

      await stop(pubsub)
      expect(registrar.unhandle).to.have.property('calledOnce', true)
      expect(registrar.unregister).to.have.property('calledOnce', true)
    })

    it('stopping should not throw if not started', async () => {
      await stop(pubsub)
      expect(registrar.handle).to.have.property('calledOnce', false)
      expect(registrar.unhandle).to.have.property('calledOnce', false)
      expect(registrar.register).to.have.property('calledOnce', false)
      expect(registrar.unregister).to.have.property('calledOnce', false)
    })
  })

  describe('should be able to register two nodes', () => {
    let pubsubA: FloodSub
    let pubsubB: FloodSub
    let peerIdA: PeerId
    let peerIdB: PeerId
    let registrarA: StubbedInstance<Registrar>
    let registrarB: StubbedInstance<Registrar>

    // mount pubsub
    beforeEach(async () => {
      const privateKeyA = await generateKeyPair('Ed25519')
      peerIdA = peerIdFromPrivateKey(privateKeyA)

      const privateKeyB = await generateKeyPair('Ed25519')
      peerIdB = peerIdFromPrivateKey(privateKeyB)

      registrarA = stubInterface<Registrar>()
      registrarB = stubInterface<Registrar>()

      pubsubA = floodsub()({
        peerId: peerIdA,
        privateKey: privateKeyA,
        registrar: registrarA,
        logger: defaultLogger()
      })
      pubsubB = floodsub()({
        peerId: peerIdB,
        privateKey: privateKeyB,
        registrar: registrarB,
        logger: defaultLogger()
      })
    })

    // start pubsub
    beforeEach(async () => {
      await start(pubsubA, pubsubB)

      expect(registrarA.handle.calledWith(pubsubA.protocols[0])).to.be.true()
      expect(registrarB.handle.calledWith(pubsubB.protocols[0])).to.be.true()
    })

    afterEach(async () => {
      sinon.restore()

      await stop(pubsubA, pubsubB)
    })

    it('should handle onConnect as expected', async () => {
      const topologyA = registrarA.register.getCall(0).args[1]
      const handlerB = registrarB.handle.getCall(0).args[1]

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
      }

      const [c0, c1] = await connectionPair(peerIdA, peerIdB)

      // Notify peers of connection
      topologyA.onConnect?.(peerIdB, c0)
      await handlerB(await c1.newStream([pubsubA.protocols[0]]), c1)

      expect(pubsubA.getPeers()).to.have.lengthOf(1)
      expect(pubsubB.getPeers()).to.have.lengthOf(1)
    })

    it('should use the latest connection if onConnect is called more than once', async () => {
      const topologyA = registrarA.register.getCall(0).args[1]
      const handlerB = registrarB.handle.getCall(0).args[1]

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
      }

      // Notify peers of connection
      const [c0, c1] = await connectionPair(peerIdA, peerIdB)
      const [c2] = await connectionPair(peerIdA, peerIdB)

      sinon.spy(c0, 'newStream')

      topologyA.onConnect?.(peerIdB, c0)
      handlerB(await c1.newStream(pubsubA.protocols[0]), c1)
      expect(c0.newStream).to.have.property('callCount', 1)

      // @ts-expect-error _removePeer is a protected method
      sinon.spy(pubsubA, '_removePeer')

      sinon.spy(c2, 'newStream')

      await topologyA?.onConnect?.(peerIdB, c2)
      // newStream invocation takes place in a resolved promise
      expect(c2.newStream).to.have.property('callCount', 1)

      // @ts-expect-error _removePeer is a protected method
      expect(pubsubA._removePeer).to.have.property('callCount', 0)

      // Verify the first stream was closed
      // @ts-expect-error .returnValues is a sinon property
      const { stream: firstStream } = await c0.newStream.returnValues[0]
      try {
        await firstStream.sink(['test'])
      } catch (err: any) {
        expect(err).to.exist()
        return
      }
      expect.fail('original stream should have ended')
    })

    it('should handle newStream errors in onConnect', async () => {
      const topologyA = registrarA.register.getCall(0).args[1]
      const handlerB = registrarB.handle.getCall(0).args[1]

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
      }

      // Notify peers of connection
      const [c0, c1] = await connectionPair(peerIdA, peerIdB)
      const error = new Error('new stream error')
      sinon.stub(c0, 'newStream').throws(error)

      topologyA.onConnect?.(peerIdB, c0)
      handlerB(await c1.newStream(pubsubA.protocols[0]), c1)

      expect(c0.newStream).to.have.property('callCount', 1)
    })

    it('should handle onDisconnect as expected', async () => {
      const topologyA = registrarA.register.getCall(0).args[1]
      const topologyB = registrarB.register.getCall(0).args[1]
      const handlerB = registrarB.handle.getCall(0).args[1]

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
      }

      // Notify peers of connection
      const [c0, c1] = await connectionPair(peerIdA, peerIdB)

      topologyA.onConnect?.(peerIdB, c0)
      await handlerB(await c1.newStream(pubsubA.protocols[0]), c1)

      // Notify peers of disconnect
      topologyA?.onDisconnect?.(peerIdB)
      topologyB?.onDisconnect?.(peerIdA)

      expect(pubsubA.getPeers()).to.be.empty()
      expect(pubsubB.getPeers()).to.be.empty()
    })

    it('should handle onDisconnect for unknown peers', () => {
      const topologyA = registrarA.register.getCall(0).args[1]

      if (topologyA == null) {
        throw new Error(`No handler registered for ${pubsubA.protocols[0]}`)
      }

      expect(pubsubA.getPeers()).to.be.empty()

      // Notice peers of disconnect
      topologyA?.onDisconnect?.(peerIdB)

      expect(pubsubA.getPeers()).to.be.empty()
    })
  })
})
