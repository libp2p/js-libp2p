/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/pubsub'
import { floodsub } from '../src/index.js'

describe('interface compliance', () => {
  tests({
    async setup (args) {
      if (args == null) {
        throw new Error('PubSubOptions is required')
      }

      const pubsub = floodsub(args.init)(args.components)

      return pubsub
    },
    async teardown () {

    }
  })
})
