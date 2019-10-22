const tests = require('libp2p-interfaces/src/crypto/tests')
const plaintext = require('../../src/insecure/plaintext')

tests({
  setup () {
    return plaintext
  }
})
