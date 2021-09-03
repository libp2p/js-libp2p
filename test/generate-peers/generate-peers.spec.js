/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const which = require('which')
const execa = require('execa')
const { toString: uintArrayToString } = require('uint8arrays/to-string')
const PeerId = require('peer-id')
const RoutingTable = require('../../src/routing-table')
const {
  convertPeerId
} = require('../../src/utils')

async function fromGo (targetCpl, randPrefix, localKadId) {
  const { stdout } = await execa('./generate-peer', [targetCpl, randPrefix, localKadId], {
    cwd: __dirname
  })

  const arr = stdout
    .slice(1, stdout.length - 1)
    .split(' ')
    .filter(Boolean)
    .map(i => parseInt(i, 10))

  return Uint8Array.from(arr)
}

describe('generate peers', function () {
  const go = which.sync('go', { nothrow: true })

  if (!go) {
    it.skip('No golang installation found on this system', () => {})

    return
  }

  let routingTable

  before(async () => {
    await execa(go, ['build', 'generate-peer.go'], {
      cwd: __dirname
    })
  })

  beforeEach(async function () {
    this.timeout(20 * 1000)
    const id = await PeerId.create({ bits: 512 })

    routingTable = new RoutingTable(id, 20)
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

  TEST_CASES.forEach(({ targetCpl, randPrefix }, index) => {
    it(`should generate peers targetCpl ${targetCpl} randPrefix ${randPrefix}`, async () => {
      const peerId = await PeerId.create({ bits: 512 })
      const localKadId = await convertPeerId(peerId)

      const goOutput = await fromGo(targetCpl, randPrefix, uintArrayToString(localKadId, 'base64pad'))
      const jsOutput = await routingTable._makePeerId(localKadId, randPrefix, targetCpl)

      expect(goOutput).to.deep.equal(jsOutput)
    })
  })
})
