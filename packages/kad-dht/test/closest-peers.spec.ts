import { generateKeyPair } from '@libp2p/crypto/keys'
import { KEEP_ALIVE, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey, peerIdFromString } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { stubInterface } from 'sinon-ts'
import { xor } from 'uint8arrays/xor'
import { xorCompare } from 'uint8arrays/xor-compare'
import { ClosestPeers } from '../src/routing-table/closest-peers.js'
import { convertPeerId } from '../src/utils.js'
import type { RoutingTable } from '../src/routing-table/index.js'
import type { ComponentLogger, PeerId, PeerStore } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

interface ClosestPeersComponents {
  peerId: PeerId
  logger: ComponentLogger
  peerStore: StubbedInstance<PeerStore>
}

describe('closest-peers', () => {
  let closestPeers: ClosestPeers
  let components: ClosestPeersComponents
  let routingTable: RoutingTable
  let peers: Array<{ peerId: PeerId, kadId: Uint8Array, distance: Uint8Array }>

  beforeEach(async () => {
    const nodePeerId = peerIdFromString('12D3KooWNq99a7DtUgvzyiHwvBX4m7TDLmn6nLZvJUzSt72wc1Zu')
    const nodeKadId = await convertPeerId(nodePeerId)

    peers = []

    for (let i = 0; i < 10; i++) {
      const key = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(key)
      const kadId = await convertPeerId(peerId)
      const distance = xor(kadId, nodeKadId)

      peers.push({
        peerId,
        kadId,
        distance
      })
    }

    peers.sort((a, b) => xorCompare(a.distance, b.distance))

    routingTable = stubInterface()

    components = {
      peerId: nodePeerId,
      logger: defaultLogger(),
      peerStore: stubInterface()
    }

    closestPeers = new ClosestPeers(components, {
      logPrefix: '',
      routingTable,
      peerSetSize: 2
    })

    await start(closestPeers)
  })

  afterEach(async () => {
    await stop(closestPeers)
  })

  it('should tag closest peers', async () => {
    closestPeers.onPeerPing(new CustomEvent<PeerId>('peer:ping', { detail: peers[0].peerId }))
    closestPeers.onPeerPing(new CustomEvent<PeerId>('peer:ping', { detail: peers[1].peerId }))
    closestPeers.onPeerPing(new CustomEvent<PeerId>('peer:ping', { detail: peers[2].peerId }))

    // peers are added asynchronously
    await delay(100)

    await closestPeers.updatePeerTags()

    assertTagged(peers[0].peerId, components.peerStore)
    assertTagged(peers[1].peerId, components.peerStore)

    expect(components.peerStore.merge.calledWith(peers[2].peerId)).to.be.false()
  })

  it('should untag previous closest peers', async () => {
    closestPeers.onPeerPing(new CustomEvent<PeerId>('peer:ping', { detail: peers[1].peerId }))
    closestPeers.onPeerPing(new CustomEvent<PeerId>('peer:ping', { detail: peers[2].peerId }))

    // peers are added asynchronously
    await delay(100)
    await closestPeers.updatePeerTags()

    assertTagged(peers[1].peerId, components.peerStore)
    assertTagged(peers[2].peerId, components.peerStore)

    // a new peer is pinged that is closer than the previous ones
    closestPeers.onPeerPing(new CustomEvent<PeerId>('peer:ping', { detail: peers[0].peerId }))

    // peers are added asynchronously
    await delay(100)
    await closestPeers.updatePeerTags()

    // kad-furthest peer should have been untagged
    assertUnTagged(peers[2].peerId, components.peerStore)
  })
})

function assertTagged (peerId: PeerId, peerStore: StubbedInstance<PeerStore>): void {
  expect(peerStore.merge.calledWith(peerId, {
    tags: {
      'kad-close': {
        value: 50
      },
      [KEEP_ALIVE]: {
        value: 1
      }
    }
  })).to.be.true()
}

function assertUnTagged (peerId: PeerId, peerStore: StubbedInstance<PeerStore>): void {
  expect(peerStore.merge.calledWith(peerId, {
    tags: {
      'kad-close': undefined,
      [KEEP_ALIVE]: undefined
    }
  })).to.be.true()
}
