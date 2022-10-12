/* eslint-env mocha */

import tests from '@libp2p/interface-peer-discovery-compliance-tests'
import { bootstrap } from '../src/index.js'
import peerList from './fixtures/default-peers.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

describe('compliance tests', () => {
  tests({
    async setup () {
      const components = {
        peerStore: new PersistentPeerStore({
          peerId: await createEd25519PeerId(),
          datastore: new MemoryDatastore()
        })
      }

      return bootstrap({
        list: peerList,
        timeout: 100
      })(components)
    },
    async teardown () {}
  })
})
