/* eslint-disable no-console */
import { randomBytes } from 'node:crypto'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import Benchmark from 'benchmark'
import { sha256 } from 'multiformats/hashes/sha2'
import { xor as uint8ArrayXor } from 'uint8arrays/xor'
import { xorCompare as uint8ArrayXorCompare } from 'uint8arrays/xor-compare'
import { convertPeerId } from '../dist/src/utils.js'

// Results - splicing is faster:
//  % node ./benchmarks/add-with-kad-id.js
// addWithKadId sort x 285 ops/sec ±1.45% (88 runs sampled)
// addWithKadId splice x 498 ops/sec ±1.36% (91 runs sampled)

// simulate roughly full routing table
const peers = 6_000
const capacity = 20
const originDhtKey = (await sha256.digest(randomBytes(32))).digest
const toAdd = await Promise.all(
  new Array(peers).fill(0).map(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)
    const kadId = await convertPeerId(peerId)

    return {
      peerId,
      kadId
    }
  })
)

const main = function () {
  let peerDistancesOrig
  let peerDistancesNew

  const bench1 = new Benchmark('addWithKadId sort', {
    fn: function () {
      let peerDistances = []

      for (let i = 0; i < toAdd.length; i++) {
        const { peerId, kadId } = toAdd[i]

        if (peerDistances.find(pd => pd.peerId.equals(peerId)) != null) {
          continue
        }

        const el = {
          peerId,
          distance: uint8ArrayXor(originDhtKey, kadId)
        }

        peerDistances.push(el)
        peerDistances.sort((a, b) => uint8ArrayXorCompare(a.distance, b.distance))
        peerDistances = peerDistances.slice(0, capacity)
      }

      peerDistancesOrig = peerDistances
    }
  })
    .on('complete', function (stats) {
      console.log(String(stats.currentTarget))
    })

  bench1.run()

  const bench2 = new Benchmark('addWithKadId splice', {
    fn: function () {
      let peerDistances = []

      for (let i = 0; i < toAdd.length; i++) {
        const { peerId, kadId } = toAdd[i]

        if (peerDistances.find(pd => pd.peerId.equals(peerId)) != null) {
          continue
        }

        const el = {
          peerId,
          distance: uint8ArrayXor(originDhtKey, kadId)
        }

        let added = false

        for (let j = 0; j < peerDistances.length; j++) {
          const distance = uint8ArrayXorCompare(peerDistances[j].distance, el.distance)
          if (distance === 0 || distance === 1) {
            added = true
            peerDistances.splice(j, 0, el)
            break
          }
        }

        if (!added) {
          peerDistances.push(el)
        }

        peerDistances = peerDistances.slice(0, capacity)
      }

      peerDistancesNew = peerDistances
    }
  })
    .on('complete', function (stats) {
      console.log(String(stats.currentTarget))

      // make sure we have the same distance list
      if (peerDistancesOrig.length !== peerDistancesNew.length) {
        throw new Error(`Peer distances not equal (${peerDistancesOrig.length} vs ${peerDistancesNew.length})`)
      }

      for (let i = 0; i < peerDistancesOrig.length; i++) {
        if (!peerDistancesOrig[i].peerId.equals(peerDistancesNew[i].peerId)) {
          throw new Error(`Peer distance ${i} not equal`)
        }
      }
    })

  bench2.run()
}

main()
