'use strict'

module.exports = function getWebCrypto () {
  if (typeof window !== 'undefined') {
    // This is only a shim for interfaces, not for functionality
    require('webcrypto-shim')(window)

    if (window.crypto) {
      return window.crypto
    }
  }

  throw new Error('Please use an environment with crypto support')
}
