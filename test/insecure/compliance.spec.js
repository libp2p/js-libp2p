'use strict'
/* eslint-env mocha */

const tests = require('libp2p-interfaces/src/crypto/tests')
const plaintext = require('../../src/insecure/plaintext')

describe('plaintext compliance', () => {
  tests({
    setup () {
      return plaintext
    }
  })
})
