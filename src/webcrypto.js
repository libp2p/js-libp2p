/* global self */

'use strict'

module.exports = () => {
  // This is only a shim for interfaces, not for functionality
  if (typeof self !== 'undefined') {
    require('webcrypto-shim')(self)

    if (self.crypto) {
      return self.crypto
    }
  }

  throw new Error('Please use an environment with crypto support')
}
