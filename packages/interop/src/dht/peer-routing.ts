/* eslint-env mocha */

import { expect } from 'aegir/chai'
import pRetry from 'p-retry'
import type { Daemon, DaemonFactory, NodeType, SpawnOptions } from '../index.js'
import type { PeerInfo } from '@libp2p/interface'

export function peerRoutingTests (factory: DaemonFactory): void {
  const nodeTypes: NodeType[] = ['js', 'go']

  for (const typeA of nodeTypes) {
    for (const typeB of nodeTypes) {
      runPeerRoutingTests(
        factory,
        { type: typeA, dht: true },
        { type: typeB, dht: true }
      )
    }
  }
}

function runPeerRoutingTests (factory: DaemonFactory, optionsA: SpawnOptions, optionsB: SpawnOptions): void {
  describe('dht.peerRouting', () => {
    let daemonA: Daemon
    let daemonB: Daemon
    let daemonC: Daemon

    // Start Daemons
    before(async function () {
      this.timeout(20 * 1000)

      daemonA = await factory.spawn(optionsA)
      daemonB = await factory.spawn(optionsB)
      daemonC = await factory.spawn(optionsB)
    })

    // Stop daemons
    after(async function () {
      await Promise.all(
        [daemonA, daemonB, daemonC]
          .filter(Boolean)
          .map(async d => { await d.stop() })
      )
    })

    it(`${optionsA.type} peer to ${optionsB.type} peer`, async function () {
      const identify1 = await daemonB.client.identify()
      const identify2 = await daemonC.client.identify()

      // peers need at least one peer in their routing table or they fail with:
      // connect 0 => 1
      await daemonA.client.connect(identify1.peerId, identify1.addrs)

      // connect 0 => 2
      await daemonA.client.connect(identify2.peerId, identify2.addrs)

      // peer 1 find peer 2, retry up to 10 times to allow the routing table to refresh
      const peerData: PeerInfo = await pRetry(async () => daemonB.client.dht.findPeer(identify2.peerId), { retries: 10 })

      expect(identify2.addrs.map(ma => ma.toString())).to.include.deep.members(peerData.multiaddrs.map(ma => ma.toString()))
    })
  })
}
