'use strict'

const path = require('path')

module.exports = {
  webpack: {
    resolve: {
      alias: {
        'node-forge': path.resolve(__dirname, 'vendor/forge.bundle.js')
      }
    }
  }
}
