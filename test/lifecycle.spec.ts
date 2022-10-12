import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { PubSubBaseProtocol } from '../src/index.js'
import {
  createPeerId,
  PubsubImplementation,
  ConnectionPair,
  MockRegistrar,
  mockIncomingStreamEvent
} from './utils/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Registrar } from '@libp2p/interface-registrar'
import type { PublishResult, PubSubRPC, PubSubRPCMessage } from '@libp2p/interface-pubsub'
import type { Uint8ArrayList } from 'uint8arraylist'

class PubsubProtocol extends PubSubBaseProtocol {
  decodeRpc (bytes: Uint8Array): PubSubRPC {
    throw new Error('Method not implemented.')
  }

  encodeRpc (rpc: PubSubRPC): Uint8Array {
    throw new Error('Method not implemented.')
  }

  decodeMessage (bytes: Uint8Array | Uint8ArrayList): PubSubRPCMessage {
    throw new Error('Method not implemented.')
  }

  encodeMessage (rpc: PubSubRPCMessage): Uint8Array {
    throw new Error('Method not implemented.')
  }

  async publishMessage (): Promise<PublishResult> {
    throw new Error('Method not implemented.')
  }
}

describe('pubsub base lifecycle', () => {
  describe('should start and stop properly', () => {
    let pubsub: PubsubProtocol
    let sinonMockRegistrar: Registrar

    beforeEach(async () => {
      const peerId = await createPeerId()
      // @ts-expect-error incomplete implementation
      sinonMockRegistrar = {
        handle: sinon.stub(),
        unhandle: sinon.stub(),
        register: sinon.stub().returns(`id-${Math.random()}`),
        unregister: sinon.stub()
      }

      pubsub = new PubsubProtocol({
        peerId: peerId,
        registrar: sinonMockRegistrar
      }, {
        multicodecs: ['/pubsub/1.0.0']
      })

      expect(pubsub.peers.size).to.be.eql(0)
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should be able to start and stop', async () => {
      await pubsub.start()
      expect(sinonMockRegistrar.handle).to.have.property('calledOnce', true)
      expect(sinonMockRegistrar.register).to.have.property('calledOnce', true)

      await pubsub.stop()
      expect(sinonMockRegistrar.unhandle).to.have.property('calledOnce', true)
      expect(sinonMockRegistrar.unregister).to.have.property('calledOnce', true)
    })

    it('starting should not throw if already started', async () => {
      await pubsub.start()
      await pubsub.start()
      expect(sinonMockRegistrar.handle).to.have.property('calledOnce', true)
      expect(sinonMockRegistrar.register).to.have.property('calledOnce', true)

      await pubsub.stop()
      expect(sinonMockRegistrar.unhandle).to.have.property('calledOnce', true)
      expect(sinonMockRegistrar.unregister).to.have.property('calledOnce', true)
    })

    it('stopping should not throw if not started', async () => {
      await pubsub.stop()
      expect(sinonMockRegistrar.handle).to.have.property('calledOnce', false)
      expect(sinonMockRegistrar.unhandle).to.have.property('calledOnce', false)
      expect(sinonMockRegistrar.register).to.have.property('calledOnce', false)
      expect(sinonMockRegistrar.unregister).to.have.property('calledOnce', false)
    })
  })

  describe('should be able to register two nodes', () => {
    const protocol = '/pubsub/1.0.0'
    let pubsubA: PubsubImplementation, pubsubB: PubsubImplementation
    let peerIdA: PeerId, peerIdB: PeerId
    let registrarA: MockRegistrar
    let registrarB: MockRegistrar

    // mount pubsub
    beforeEach(async () => {
      peerIdA = await createPeerId()
      peerIdB = await createPeerId()

      registrarA = new MockRegistrar()
      registrarB = new MockRegistrar()

      pubsubA = new PubsubImplementation({
        peerId: peerIdA,
        registrar: registrarA
      }, {
        multicodecs: [protocol]
      })
      pubsubB = new PubsubImplementation({
        peerId: peerIdB,
        registrar: registrarB
      }, {
        multicodecs: [protocol]
      })
    })

    // start pubsub
    beforeEach(async () => {
      await Promise.all([
        pubsubA.start(),
        pubsubB.start()
      ])

      expect(registrarA.getHandler(protocol)).to.be.ok()
      expect(registrarB.getHandler(protocol)).to.be.ok()
    })

    afterEach(async () => {
      sinon.restore()

      await Promise.all([
        pubsubA.stop(),
        pubsubB.stop()
      ])
    })

    it('should handle onConnect as expected', async () => {
      const topologyA = registrarA.getTopologies(protocol)[0]
      const handlerB = registrarB.getHandler(protocol)

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${protocol}`)
      }

      const [c0, c1] = ConnectionPair()

      // Notify peers of connection
      await topologyA.onConnect(peerIdB, c0)
      await handlerB.handler(await mockIncomingStreamEvent(protocol, c1, peerIdA))

      expect(pubsubA.peers.size).to.be.eql(1)
      expect(pubsubB.peers.size).to.be.eql(1)
    })

    it('should use the latest connection if onConnect is called more than once', async () => {
      const topologyA = registrarA.getTopologies(protocol)[0]
      const handlerB = registrarB.getHandler(protocol)

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${protocol}`)
      }

      // Notify peers of connection
      const [c0, c1] = ConnectionPair()
      const [c2] = ConnectionPair()

      sinon.spy(c0, 'newStream')

      await topologyA.onConnect(peerIdB, c0)
      await handlerB.handler(await mockIncomingStreamEvent(protocol, c1, peerIdA))
      expect(c0.newStream).to.have.property('callCount', 1)

      // @ts-expect-error _removePeer is a protected method
      sinon.spy(pubsubA, '_removePeer')

      sinon.spy(c2, 'newStream')

      await topologyA?.onConnect(peerIdB, c2)
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
      const topologyA = registrarA.getTopologies(protocol)[0]
      const handlerB = registrarB.getHandler(protocol)

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${protocol}`)
      }

      // Notify peers of connection
      const [c0, c1] = ConnectionPair()
      const error = new Error('new stream error')
      sinon.stub(c0, 'newStream').throws(error)

      await topologyA.onConnect(peerIdB, c0)
      await handlerB.handler(await mockIncomingStreamEvent(protocol, c1, peerIdA))

      expect(c0.newStream).to.have.property('callCount', 1)
    })

    it('should handle onDisconnect as expected', async () => {
      const topologyA = registrarA.getTopologies(protocol)[0]
      const topologyB = registrarB.getTopologies(protocol)[0]
      const handlerB = registrarB.getHandler(protocol)

      if (topologyA == null || handlerB == null) {
        throw new Error(`No handler registered for ${protocol}`)
      }

      // Notify peers of connection
      const [c0, c1] = ConnectionPair()

      await topologyA.onConnect(peerIdB, c0)
      await handlerB.handler(await mockIncomingStreamEvent(protocol, c1, peerIdA))

      // Notice peers of disconnect
      topologyA?.onDisconnect(peerIdB)
      topologyB?.onDisconnect(peerIdA)

      expect(pubsubA.peers.size).to.be.eql(0)
      expect(pubsubB.peers.size).to.be.eql(0)
    })

    it('should handle onDisconnect for unknown peers', () => {
      const topologyA = registrarA.getTopologies(protocol)[0]

      expect(pubsubA.peers.size).to.be.eql(0)

      // Notice peers of disconnect
      topologyA?.onDisconnect(peerIdB)

      expect(pubsubA.peers.size).to.be.eql(0)
    })
  })
})
