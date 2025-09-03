import { expect } from 'aegir/chai'
import type { Daemon, DaemonFactory, NodeType, SpawnOptions, TransportType } from '../index.js'

export function connectTests (factory: DaemonFactory): void {
  const nodeTypes: NodeType[] = ['js', 'go']
  const transportTypes: TransportType[] = ['tcp', 'webtransport', 'webrtc-direct']

  for (const typeA of nodeTypes) {
    for (const typeB of nodeTypes) {
      transportTypes.forEach(transport => {
        runConnectTests(
          transport,
          factory,
          { type: typeA, transport, noListen: true },
          { type: typeB, transport }
        )
      })
    }
  }
}

function runConnectTests (name: string, factory: DaemonFactory, optionsA: SpawnOptions, optionsB: SpawnOptions): void {
  describe(`connection.${name}`, () => {
    let daemonA: Daemon
    let daemonB: Daemon
    let skipped: boolean

    // Start Daemons
    before(async function () {
      this.timeout(20 * 1000)

      try {
        daemonA = await factory.spawn(optionsA)
        daemonB = await factory.spawn(optionsB)
      } catch (err: any) {
        if (err.name === 'UnsupportedError') {
          skipped = true
          return
        }

        throw err
      }
    })

    // Stop daemons
    after(async function () {
      await Promise.all(
        [daemonA, daemonB]
          .filter(Boolean)
          .map(async d => { await d.stop() })
      )
    })

    it(`${optionsA.type} peer to ${optionsB.type} peer over ${name}`, async function () {
      this.timeout(10 * 1000)

      if (skipped) {
        return this.skip()
      }

      const identify1 = await daemonA.client.identify()
      const identify2 = await daemonB.client.identify()

      // verify connected peers
      const knownPeersBeforeConnect1 = await daemonA.client.listPeers()
      expect(knownPeersBeforeConnect1).to.have.lengthOf(0)

      const knownPeersBeforeConnect2 = await daemonB.client.listPeers()
      expect(knownPeersBeforeConnect2).to.have.lengthOf(0)

      // connect peers
      await daemonA.client.connect(identify2.peerId, identify2.addrs)

      // daemonA will take some time to get the peers
      await new Promise(resolve => setTimeout(resolve, 1000))

      // verify connected peers
      const knownPeersAfterConnect1 = await daemonA.client.listPeers()
      expect(knownPeersAfterConnect1).to.have.length.greaterThanOrEqual(1)
      expect(knownPeersAfterConnect1[0].toString()).to.equal(identify2.peerId.toString())

      const knownPeersAfterConnect2 = await daemonB.client.listPeers()
      expect(knownPeersAfterConnect2).to.have.length.greaterThanOrEqual(1)
      expect(knownPeersAfterConnect2[0].toString()).to.equal(identify1.peerId.toString())
    })
  })
}
