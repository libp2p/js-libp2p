'use strict'

/* eslint-env mocha */

const tests = require('libp2p-interfaces-compliance-tests/src/peer-discovery')

const Bootstrap = require('../src')
const peerList = require('./default-peers')

describe('compliance tests', () => {
  tests({
    setup () {
      const bootstrap = new Bootstrap({
        list: peerList,
        interval: 2000
      })

      return bootstrap
    }
  })
})
