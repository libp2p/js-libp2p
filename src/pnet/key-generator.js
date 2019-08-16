'use strict'

const crypto = require('crypto')
const KEY_LENGTH = 32

/**
 * Generates a PSK that can be used in a libp2p-pnet private network
 * @param {Writer} writer An object containing a `write` method
 * @returns {void}
 */
function generate (writer) {
  const psk = crypto.randomBytes(KEY_LENGTH).toString('hex')
  writer.write('/key/swarm/psk/1.0.0/\n/base16/\n' + psk)
}

module.exports = generate
module.exports.NONCE_LENGTH = 24
module.exports.KEY_LENGTH = KEY_LENGTH

if (require.main === module) {
  generate(process.stdout)
}
