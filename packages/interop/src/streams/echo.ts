/* eslint-env mocha */

import { lpStream } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { echoHandler } from '../relay/util.ts'
import type { Daemon, DaemonFactory, SpawnOptions } from '../index.js'

export function echoStreamTests (name: string, factory: DaemonFactory, optionsA: SpawnOptions, optionsB: SpawnOptions): void {
  describe(name, () => {
    let daemonA: Daemon
    let daemonB: Daemon

    // Start Daemons
    before(async function () {
      this.timeout(20 * 1000)

      daemonA = await factory.spawn(optionsA)
      daemonB = await factory.spawn(optionsB)

      // connect them
      const identify0 = await daemonA.client.identify()

      await daemonB.client.connect(identify0.peerId, identify0.addrs)

      // jsDaemon1 will take some time to get the peers
      await new Promise(resolve => setTimeout(resolve, 1000))
    })

    // Stop daemons
    after(async function () {
      await Promise.all(
        [daemonA, daemonB]
          .filter(Boolean)
          .map(async d => d.stop())
      )
    })

    it(`${optionsA.type} sender to ${optionsB.type} listener`, async function () {
      this.timeout(10 * 1000)

      const receivingIdentity = await daemonB.client.identify()

      await daemonB.client.registerStreamHandler(echoHandler.protocol, echoHandler.handler)

      const stream = await daemonA.client.openStream(receivingIdentity.peerId, echoHandler.protocol)

      // send some data, read the response
      const input = uint8ArrayFromString('test')
      const lp = lpStream(stream)
      await lp.write(input)
      const output = await lp.read()

      expect(output?.subarray()).to.equalBytes(input)
    })
  })
}
