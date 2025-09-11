/* eslint-env mocha */

import { expect } from 'aegir/chai'
import delay from 'delay'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Daemon, DaemonFactory, NodeType, SpawnOptions } from '../index.js'

const record = {
  key: uint8ArrayConcat([
    uint8ArrayFromString('/pk/'),
    uint8ArrayFromString('muft89xjpybos8eas1vaq2xrbsx2vkll7is4ocy7pia5fsjlt3c2', 'base36')
  ]),
  value: uint8ArrayFromString('080012a60230820122300d06092a864886f70d01010105000382010f003082010a0282010100c2588f998971dac9e3eef76a311bf9159505aff69ea3b664c55a36aa28ee08de1127228a4d431bb9c0840240c75f6e98a0843a78d945491a3ea5e1f7cee2bc71383510db5290702383975b7bffae9fb40c84cc1220fb4a7db862fffb0de42f8fd8fb33a17deb20f30e2d0f194791fe69355a392f77df35f101e08a2fc95b2c018768938814fcb52482f899f5e90a1905e8abbcdbb1647ad80a5b0417e1ce8320d64197a6ba3848926375c63adebabdf6eb82109bcadfee13b62bf922bbb6f74c1a26c9bc6122d1436787e0e6de3c152b1959701092abef84599f73eaedb2fcef9f87293e1bbe8e0fef3f1a7fd2e8b94c7e633f88473644a63cb948e4d25c54490203010001', 'hex')
}

export function contentFetchingTests (factory: DaemonFactory): void {
  const nodeTypes: NodeType[] = ['js', 'go']

  for (const typeA of nodeTypes) {
    for (const typeB of nodeTypes) {
      runContentFetchingTests(
        factory,
        { type: typeA, dht: true },
        { type: typeB, dht: true }
      )
    }
  }
}

function runContentFetchingTests (factory: DaemonFactory, optionsA: SpawnOptions, optionsB: SpawnOptions): void {
  describe('dht.contentFetching', () => {
    let nodes: Daemon[]

    // Start Daemons
    before(async function () {
      this.timeout(20 * 1000)

      nodes = await Promise.all([
        factory.spawn(optionsA),
        ...new Array(3).fill(0).map(async () => factory.spawn(optionsB))
      ])

      const identify = await Promise.all(
        nodes.map(async node => node.client.identify())
      )

      // connect them all
      for (let i = 0; i < nodes.length; i++) {
        for (let k = 0; k < nodes.length; k++) {
          if (i === k) {
            continue
          }

          const a = nodes[i]
          const b = identify[k]

          await a.client.connect(b.peerId, b.addrs)
        }
      }

      // wait for identify
      await delay(1000)

      // ensure they can all find each other
      for (let i = 0; i < nodes.length; i++) {
        for (let k = 0; k < nodes.length; k++) {
          if (i === k) {
            continue
          }

          const a = nodes[i]
          const b = identify[k]

          await expect(a.client.dht.findPeer(b.peerId)).to.eventually.be.ok()
        }
      }
    })

    // Stop daemons
    after(async function () {
      await Promise.all(
        (nodes ?? [])
          .filter(Boolean)
          .map(async d => { await d.stop() })
      )
    })

    it(`${optionsA.type} peer to ${optionsB.type} peer`, async function () {
      this.timeout(10 * 1000)

      await nodes[0].client.dht.put(record.key, record.value)

      const data = await nodes[1].client.dht.get(record.key)
      expect(data).to.equalBytes(record.value)
    })
  })
}
