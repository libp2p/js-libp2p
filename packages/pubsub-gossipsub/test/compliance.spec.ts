import type { Libp2pEvents } from '@libp2p/interface'
import tests from '@libp2p/interface-compliance-tests/pubsub'
import { EventEmitter } from '@libp2p/interface/events'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import { GossipSub } from '../src/index.js'

describe.skip('interface compliance', function () {
  this.timeout(3000)

  tests({
    async setup(args) {
      if (args == null) {
        throw new Error('PubSubOptions is required')
      }

      const pubsub = new GossipSub(
        {
          ...args.components,
          peerStore: new PersistentPeerStore({
            peerId: args.components.peerId,
            datastore: new MemoryDatastore(),
            events: new EventEmitter<Libp2pEvents>()
          })
        },
        {
          ...args.init,
          // libp2p-interfaces-compliance-tests in test 'can subscribe and unsubscribe correctly' publishes to no peers
          // Disable check to allow passing tests
          allowPublishToZeroPeers: true
        }
      )

      return pubsub
    },

    async teardown() {
      //
    }
  })
})
