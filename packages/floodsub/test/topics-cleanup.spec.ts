import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { FloodSub } from '../src/floodsub.ts'
import { StrictNoSign } from '../src/index.ts'
import { PeerStreams } from '../src/peer-streams.ts'
import type { PeerId } from '@libp2p/interface'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

describe('topics cleanup', () => {
  let pubsub: FloodSub
  let registrar: StubbedInstance<Registrar>

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    registrar = stubInterface()

    pubsub = new FloodSub({
      peerId: peerIdFromPrivateKey(privateKey),
      privateKey,
      registrar,
      logger: defaultLogger()
    }, {
      globalSignaturePolicy: StrictNoSign
    })

    await start(pubsub)
  })

  afterEach(async () => {
    sinon.restore()
    await stop(pubsub)
  })

  it('drops the topic entry when a peer unsubscribes and none remain', async () => {
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    pubsub.processRpcSubOpt(peer, { subscribe: true, topic: 't1' })
    expect(pubsub.topics.has('t1')).to.be.true()

    pubsub.processRpcSubOpt(peer, { subscribe: false, topic: 't1' })
    expect(pubsub.topics.has('t1'), 'empty topic set left behind after unsubscribe').to.be.false()
  })

  it('does not create a topic entry when a peer unsubscribes from an unknown topic', async () => {
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // otherwise an attacker could mint an empty PeerSet per unsubscribe without
    // ever subscribing
    pubsub.processRpcSubOpt(peer, { subscribe: false, topic: 'never-seen' })

    expect(pubsub.topics.has('never-seen'), 'phantom topic set created on unsubscribe').to.be.false()
  })

  it('drops now-empty topic sets when a peer is removed', async () => {
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // _removePeer only acts on peers present in the peer map
    pubsub.peers.set(peer, new PeerStreams(peer))
    pubsub.processRpcSubOpt(peer, { subscribe: true, topic: 't1' })
    expect(pubsub.topics.get('t1')?.size).to.equal(1)

    ;(pubsub as unknown as { _removePeer(peerId: PeerId): void })._removePeer(peer)

    expect(pubsub.topics.has('t1'), 'empty topic set left behind after peer removal').to.be.false()
  })

  it('clears the topics map on stop', async () => {
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    pubsub.processRpcSubOpt(peer, { subscribe: true, topic: 't1' })
    pubsub.processRpcSubOpt(peer, { subscribe: true, topic: 't2' })
    expect(pubsub.topics.size).to.equal(2)

    await stop(pubsub)

    expect(pubsub.topics.size, 'topics not cleared on stop').to.equal(0)
  })
})
