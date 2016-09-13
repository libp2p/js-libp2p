'use strict'

module.exports = function getWebCrypto () {
  if (typeof window !== 'undefined') {
    require('webcrypto-shim')

    if (window.crypto) {
      return window.crypto
    }
  }

  throw new Error('Please use an environment with crypto support')
}
