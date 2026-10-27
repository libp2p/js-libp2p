import { generateKeyPair } from '@libp2p/crypto/keys'
import { StreamCloseEvent, TimeoutError, TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { GossipSub } from '../src/gossipsub.ts'
import { StrictNoSign } from '../src/index.ts'
import type { Connection, MessageStreamEvents, PeerStore, Stream, Topology } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

describe('outbound stream recovery', () => {
  const sandbox = sinon.createSandbox()
  let pubsub: GossipSub

  function createStream (): { stream: StubbedInstance<Stream>, close(): void } {
    const events = new TypedEventEmitter<MessageStreamEvents>()
    const stream = stubInterface<Stream>({
      protocol: '/meshsub/1.2.0',
      status: 'open',
      addEventListener: events.addEventListener.bind(events)
    })

    stream.send.returns(true)
    stream.close.resolves()

    return {
      stream,
      close: () => {
        stream.status = 'closed'
        events.dispatchEvent(new StreamCloseEvent(false))
      }
    }
  }

  async function setup (): Promise<{
    peer: Connection['remotePeer']
    connection: StubbedInstance<Connection>
    connectionManager: StubbedInstance<ConnectionManager>
    topology: Topology
    outbound: ReturnType<typeof createStream>
  }> {
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    sandbox.useFakeTimers()
    sandbox.stub(Math, 'random').returns(0.5)
    const outbound = createStream()
    const connection = stubInterface<Connection>({
      remotePeer: peer,
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/9000'),
      direction: 'outbound',
      status: 'open',
      limits: undefined
    })
    connection.newStream.resolves(outbound.stream)
    const connectionManager = stubInterface<ConnectionManager>()
    connectionManager.getConnections.returns([connection])
    const registrar = stubInterface<Registrar>()
    registrar.register.resolves('topology')
    pubsub = new GossipSub({
      privateKey,
      peerId: peerIdFromPrivateKey(privateKey),
      logger: defaultLogger(),
      registrar,
      peerStore: stubInterface<PeerStore>(),
      connectionManager
    }, { globalSignaturePolicy: StrictNoSign, tagMeshPeers: false })
    await pubsub.start()
    pubsub.subscribe('test-topic')

    return { peer, connection, connectionManager, topology: registrar.register.firstCall.args[1], outbound }
  }

  afterEach(async () => {
    await pubsub?.stop()
    sandbox.restore()
  })

  it('retries failed opens and announces existing subscriptions', async () => {
    const { topology, peer, connection, outbound } = await setup()
    connection.newStream.onFirstCall().rejects(new TimeoutError())
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    expect(outbound.stream.send.callCount).to.equal(0)

    await sandbox.clock.tickAsync(5000)
    expect(connection.newStream.callCount).to.equal(2)
    expect(outbound.stream.send.called).to.be.true()
    expect(pubsub.streamsOutbound.has(peer.toString())).to.be.true()
  })

  it('backs off repeated failures and deduplicates connection notifications', async () => {
    const { topology, peer, connection } = await setup()
    connection.newStream.rejects(new TimeoutError())
    topology.onConnect?.(peer, connection)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(500)
    expect(connection.newStream.callCount).to.equal(1)

    await sandbox.clock.tickAsync(60_000)
    expect(connection.newStream.callCount).to.be.greaterThan(2).and.lessThan(10)
  })

  it('deduplicates notifications while an open is in flight', async () => {
    const { topology, peer, connection, outbound } = await setup()
    const deferred = pDefer<Stream>()
    connection.newStream.returns(deferred.promise)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(60_000)
    expect(connection.newStream.callCount).to.equal(1)
    deferred.resolve(outbound.stream)
    await sandbox.clock.tickAsync(0)
    expect(pubsub.streamsOutbound.has(peer.toString())).to.be.true()
  })

  it('reopens closed streams after a delay', async () => {
    const { topology, peer, connection, outbound } = await setup()
    const replacement = createStream()
    connection.newStream.onSecondCall().resolves(replacement.stream)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    outbound.close()
    await sandbox.clock.tickAsync(500)
    expect(connection.newStream.callCount).to.equal(1)
    await sandbox.clock.tickAsync(5000)
    expect(connection.newStream.callCount).to.equal(2)
    expect(replacement.stream.send.called).to.be.true()
  })

  it('retries streams that close before the open completes', async () => {
    const { topology, peer, connection, outbound } = await setup()
    outbound.close()
    const replacement = createStream()
    connection.newStream.onSecondCall().resolves(replacement.stream)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    expect(pubsub.streamsOutbound.has(peer.toString())).to.be.false()
    await sandbox.clock.tickAsync(5000)
    expect(connection.newStream.callCount).to.equal(2)
    expect(replacement.stream.send.called).to.be.true()
  })

  it('backs off streams that repeatedly open and immediately close', async () => {
    const { topology, peer, connection } = await setup()
    connection.newStream.callsFake(async () => {
      const outbound = createStream()
      setTimeout(outbound.close, 1)
      return outbound.stream
    })
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(100)
    expect(connection.newStream.callCount).to.equal(1)
    await sandbox.clock.tickAsync(60_000)
    expect(connection.newStream.callCount).to.be.greaterThan(2).and.lessThan(10)
  })

  it('resets backoff after a stream stays open', async () => {
    const { topology, peer, connection, outbound } = await setup()
    for (let i = 0; i < 5; i++) {
      connection.newStream.onCall(i).rejects(new TimeoutError())
    }
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(120_000)
    expect(connection.newStream.callCount).to.equal(6)
    connection.newStream.resolves(createStream().stream)
    outbound.close()
    await sandbox.clock.tickAsync(2000)
    expect(connection.newStream.callCount).to.equal(7)
  })

  it('tries another open connection after a failure', async () => {
    const { topology, peer, connection, connectionManager, outbound } = await setup()
    const replacement = stubInterface<Connection>({ status: 'open', limits: undefined })
    replacement.newStream.resolves(outbound.stream)
    connectionManager.getConnections.returns([connection, replacement])
    connection.newStream.rejects(new TimeoutError())
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(5000)
    expect(connection.newStream.callCount).to.equal(1)
    expect(replacement.newStream.callCount).to.equal(1)
  })

  it('uses a newly notified connection when retrying', async () => {
    const { topology, peer, connection, connectionManager, outbound } = await setup()
    connection.newStream.rejects(new TimeoutError())
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    const replacement = stubInterface<Connection>({ status: 'open', limits: undefined })
    replacement.newStream.resolves(outbound.stream)
    connectionManager.getConnections.returns([connection, replacement])
    topology.onConnect?.(peer, replacement)
    await sandbox.clock.tickAsync(5000)
    expect(connection.newStream.callCount).to.equal(1)
    expect(replacement.newStream.callCount).to.equal(1)
  })

  it('skips closed and limited connections', async () => {
    const { topology, peer, connection, connectionManager } = await setup()
    const closed = stubInterface<Connection>({ status: 'closed' })
    const limited = stubInterface<Connection>({ status: 'open', limits: { bytes: 1000n } })
    connectionManager.getConnections.returns([closed, limited, connection])
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(5000)
    expect(closed.newStream.callCount).to.equal(0)
    expect(limited.newStream.callCount).to.equal(0)
    expect(connection.newStream.callCount).to.equal(1)
  })

  it('rechecks connections if none are open when an attempt runs', async () => {
    const { topology, peer, connection, connectionManager } = await setup()
    connectionManager.getConnections.returns([])
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    connectionManager.getConnections.returns([connection])
    await sandbox.clock.tickAsync(5000)
    expect(connection.newStream.callCount).to.equal(1)
  })

  ;['disconnect', 'stop'].forEach(action => {
    it(`cancels retries on ${action}`, async () => {
      const { topology, peer, connection } = await setup()
      connection.newStream.rejects(new TimeoutError())
      topology.onConnect?.(peer, connection)
      await sandbox.clock.tickAsync(0)
      if (action === 'disconnect') { topology.onDisconnect?.(peer) } else { await pubsub.stop() }
      await sandbox.clock.tickAsync(60_000)
      expect(connection.newStream.callCount).to.equal(1)
    })

    it(`discards streams that finish opening after ${action}`, async () => {
      const { topology, peer, connection, outbound } = await setup()
      const deferred = pDefer<Stream>()
      connection.newStream.returns(deferred.promise)
      topology.onConnect?.(peer, connection)
      await sandbox.clock.tickAsync(0)
      if (action === 'disconnect') { topology.onDisconnect?.(peer) } else { await pubsub.stop() }
      deferred.resolve(outbound.stream)
      await sandbox.clock.tickAsync(0)
      expect(outbound.stream.abort.callCount).to.equal(1)
      expect(outbound.stream.send.callCount).to.equal(0)
      expect(pubsub.streamsOutbound.has(peer.toString())).to.be.false()
    })
  })

  it('discards an old open without cancelling recovery after reconnection', async () => {
    const { topology, peer, connection, outbound } = await setup()
    const deferred = pDefer<Stream>()
    const replacement = createStream()
    connection.newStream.onFirstCall().returns(deferred.promise)
    connection.newStream.onSecondCall().resolves(replacement.stream)
    topology.onConnect?.(peer, connection)
    await sandbox.clock.tickAsync(0)
    topology.onDisconnect?.(peer)
    topology.onConnect?.(peer, connection)
    deferred.resolve(outbound.stream)
    await sandbox.clock.tickAsync(0)
    expect(outbound.stream.abort.callCount).to.equal(1)
    expect(connection.newStream.callCount).to.equal(2)
    expect(replacement.stream.send.called).to.be.true()
  })
})
