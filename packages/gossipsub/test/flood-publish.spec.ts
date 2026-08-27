import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { GossipSub as GossipSubClass } from '../src/gossipsub.ts'
import type { PeerStore } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

// A peer subscribed to the topic but not in the mesh. With default scoring its
// score is 0, above the default publishThreshold of -50, so flood publish selects
// it while regular (mesh-only) publish does not.
const nonMeshPeer = '16Uiu2HAmMkH6ZLen2tbhiuNCTZLLvrZaDgufNdT5MPjtC9Hr9YNA'
const topic = 'test-topic'

async function createGossipsub (floodPublish: boolean): Promise<GossipSubClass> {
  const privateKey = await generateKeyPair('Ed25519')
  const peerId = peerIdFromPrivateKey(privateKey)
  return new GossipSubClass(
    {
      privateKey,
      peerId,
      registrar: stubInterface<Registrar>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>(),
      logger: defaultLogger()
    },
    { floodPublish }
  )
}

describe('per-publish floodPublish', () => {
  // selectPeersToPublish is private, reach it the same way other specs reach internals
  function selectPeers (gossipsub: GossipSubClass, floodPublish?: boolean): Set<string> {
    // a subscribed peer that is not part of the mesh for the topic
    (gossipsub as any).topics.set(topic, new Set([nonMeshPeer]))
    return (gossipsub as any).selectPeersToPublish(topic, floodPublish).tosend
  }

  it('floods to a non-mesh peer when the per-publish opt is true, under a false global', async () => {
    const gossipsub = await createGossipsub(false)
    expect(selectPeers(gossipsub, true)).to.include(nonMeshPeer)
  })

  it('does not flood to a non-mesh peer when no per-publish opt is given, under a false global', async () => {
    const gossipsub = await createGossipsub(false)
    expect(selectPeers(gossipsub, undefined)).to.not.include(nonMeshPeer)
  })

  it('does not flood when the per-publish opt is false, under a true global', async () => {
    const gossipsub = await createGossipsub(true)
    expect(selectPeers(gossipsub, false)).to.not.include(nonMeshPeer)
  })

  it('floods when no per-publish opt is given, under a true global', async () => {
    const gossipsub = await createGossipsub(true)
    expect(selectPeers(gossipsub, undefined)).to.include(nonMeshPeer)
  })
})
