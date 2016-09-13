'use strict'

module.exports = function getWebCrypto () {
  const WebCrypto = require('node-webcrypto-ossl')
  const webCrypto = new WebCrypto()
  return webCrypto
}
