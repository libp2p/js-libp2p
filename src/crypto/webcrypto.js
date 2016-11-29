'use strict'

module.exports = function getWebCrypto () {
  try {
    const WebCrypto = require('node-webcrypto-ossl')
    const webCrypto = new WebCrypto()
    return webCrypto
  } catch (err) {
    // fallback to other things
  }
}
