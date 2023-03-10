/* eslint-env mocha */
import { expect } from 'aegir/chai'
import which from 'which'
import { execa } from 'execa'
import { toString as uintArrayToString } from 'uint8arrays/to-string'
import { RoutingTable } from '../../src/routing-table/index.js'
import { RoutingTableRefresh } from '../../src/routing-table/refresh.js'
import { createRSAPeerId } from '@libp2p/peer-id-factory'
import {
  convertPeerId
} from '../../src/utils.js'
import { stubInterface } from 'ts-sinon'
import path from 'path'
import { fileURLToPath } from 'url'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'

const dirname = path.dirname(fileURLToPath(import.meta.url))

async function fromGo (targetCpl: number, randPrefix: number, localKadId: string): Promise<Uint8Array> {
  const { stdout } = await execa('./generate-peer', [targetCpl.toString(), randPrefix.toString(), localKadId], {
    cwd: dirname
  })

  const arr = stdout
    .slice(1, stdout.length - 1)
    .split(' ')
    .filter(Boolean)
    .map(i => parseInt(i, 10))

  return Uint8Array.from(arr)
}

describe.skip('generate peers', function () {
  this.timeout(540 * 1000)
  const go = which.sync('go', { nothrow: true })

  if (go == null) {
    it.skip('No golang installation found on this system', () => {})

    return
  }

  let refresh: RoutingTableRefresh

  before(async () => {
    await execa(go, ['build', 'generate-peer.go'], {
      cwd: __dirname
    })
  })

  beforeEach(async () => {
    const id = await createRSAPeerId({ bits: 512 })

    const components = {
      peerId: id,
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>()
    }
    const table = new RoutingTable(components, {
      kBucketSize: 20,
      lan: false,
      protocol: '/ipfs/kad/1.0.0'
    })
    refresh = new RoutingTableRefresh({
      routingTable: table,
      // @ts-expect-error not a full implementation
      peerRouting: {},
      lan: false
    })
  })

  const TEST_CASES = [{
    targetCpl: 2,
    randPrefix: 29381
  }, {
    targetCpl: 12,
    randPrefix: 3821
  }, {
    targetCpl: 5,
    randPrefix: 9493
  }, {
    targetCpl: 9,
    randPrefix: 19209
  }, {
    targetCpl: 1,
    randPrefix: 49898
  }]

  TEST_CASES.forEach(({ targetCpl, randPrefix }) => {
    it(`should generate peers targetCpl ${targetCpl} randPrefix ${randPrefix}`, async () => {
      const peerId = await createRSAPeerId({ bits: 512 })
      const localKadId = await convertPeerId(peerId)

      const goOutput = await fromGo(targetCpl, randPrefix, uintArrayToString(localKadId, 'base64pad'))
      const jsOutput = await refresh._makePeerId(localKadId, randPrefix, targetCpl)

      expect(goOutput).to.deep.equal(jsOutput)
    })
  })
})
