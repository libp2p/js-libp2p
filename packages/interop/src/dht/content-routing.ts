/* eslint-env mocha */

import { expect } from 'aegir/chai'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import type { Daemon, DaemonFactory, NodeType, SpawnOptions } from '../index.js'
import type { IdentifyResult } from '@libp2p/daemon-client'

export function contentRoutingTests (factory: DaemonFactory): void {
  const nodeTypes: NodeType[] = ['js', 'go']

  for (const typeA of nodeTypes) {
    for (const typeB of nodeTypes) {
      if (typeA === 'go' && typeB === 'go') {
        // skip go<->go as it never seems to populate the routing tables
        continue
      }

      runContentRoutingTests(
        factory,
        { type: typeA, dht: true },
        { type: typeB, dht: true }
      )
    }
  }
}

function runContentRoutingTests (factory: DaemonFactory, optionsA: SpawnOptions, optionsB: SpawnOptions): void {
  describe('dht.contentRouting', () => {
    let daemonA: Daemon
    let daemonB: Daemon
    let daemonC: Daemon
    let identify: IdentifyResult[]

    // Start Daemons
    before(async function () {
      this.timeout(20 * 1000)

      daemonA = await factory.spawn(optionsA)
      daemonB = await factory.spawn(optionsB)
      daemonC = await factory.spawn(optionsB)

      identify = await Promise.all([
        daemonA.client.identify(),
        daemonB.client.identify(),
        daemonC.client.identify()
      ])

      await daemonA.client.connect(identify[1].peerId, identify[1].addrs)
      await daemonA.client.connect(identify[2].peerId, identify[2].addrs)

      // get the peers in the table
      await new Promise(resolve => setTimeout(resolve, 1000))
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
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp39')

      await daemonA.client.dht.provide(cid)

      const providers = await all(daemonB.client.dht.findProviders(cid, 1))

      expect(providers).to.exist()
      expect(providers.length).to.be.greaterThan(0)
    })
  })
}
