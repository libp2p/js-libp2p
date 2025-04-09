/* eslint-env mocha */
import path from 'path'
import { fileURLToPath } from 'url'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { execa } from 'execa'
import { stubInterface } from 'sinon-ts'
import { toString as uintArrayToString } from 'uint8arrays/to-string'
import which from 'which'
import { RoutingTable } from '../../src/routing-table/index.js'
import { RoutingTableRefresh } from '../../src/routing-table/refresh.js'
import {
  convertPeerId
} from '../../src/utils.js'
import type { Network } from '../../src/network.js'
import type { PeerStore } from '@libp2p/interface'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { Ping } from '@libp2p/ping'

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
    const key = await generateKeyPair('RSA', 512)
    const id = peerIdFromPrivateKey(key)

    const components = {
      peerId: id,
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>(),
      logger: defaultLogger(),
      ping: stubInterface<Ping>()
    }
    const table = new RoutingTable(components, {
      kBucketSize: 20,
      logPrefix: '',
      metricsPrefix: '',
      protocol: '/ipfs/kad/1.0.0',
      network: stubInterface<Network>()
    })
    refresh = new RoutingTableRefresh({
      logger: defaultLogger()
    }, {
      routingTable: table,
      // @ts-expect-error not a full implementation
      peerRouting: {},
      logPrefix: ''
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
      const key = await generateKeyPair('RSA', 512)
      const peerId = peerIdFromPrivateKey(key)
      const localKadId = await convertPeerId(peerId)

      const goOutput = await fromGo(targetCpl, randPrefix, uintArrayToString(localKadId, 'base64pad'))
      const jsOutput = await refresh._makePeerId(localKadId, randPrefix, targetCpl)

      expect(goOutput).to.deep.equal(jsOutput)
    })
  })
})
