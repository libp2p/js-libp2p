/* eslint-env mocha */

import tests from '@libp2p/interface-pubsub-compliance-tests'
import { FloodSub } from '../src/index.js'

describe('interface compliance', () => {
  tests({
    async setup (args) {
      if (args == null) {
        throw new Error('PubSubOptions is required')
      }

      const pubsub = new FloodSub(args.components, args.init)

      return pubsub
    },
    async teardown () {

    }
  })
})
