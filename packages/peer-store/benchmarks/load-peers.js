/* eslint-disable no-console */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import Benchmark from 'benchmark'
import { MemoryDatastore } from 'datastore-core'
import { TypedEventEmitter } from 'main-event'
import { persistentPeerStore } from '../dist/src/index.js'

const privateKey = await generateKeyPair('Ed25519')
const peerId = peerIdFromPrivateKey(privateKey)

// simulate roughly full routing table
const peers = 6_000
const toAdd = await Promise.all(
  new Array(peers).fill(0).map(async () => {
    const privateKey = await generateKeyPair('RSA')
    return peerIdFromPrivateKey(privateKey)
  })
)

const datastore = new MemoryDatastore()
const peerStore = persistentPeerStore({
  peerId,
  datastore,
  events: new TypedEventEmitter(),
  logger: defaultLogger()
})

for (const peer of toAdd) {
  await peerStore.save(peer, {
    multiaddrs: [
      multiaddr('/ip4/123.123.123.123/tcp/1234')
    ]
  })
}

const main = function () {
  const bench = new Benchmark('read all', {
    defer: true,
    fn: async function (deferred) {
      await peerStore.all()
      deferred.resolve()
    }
  })
    .on('complete', function (stats) {
      console.log(String(stats.currentTarget))
    })

  bench.run()
}

main()
