'use strict'

module.exports = {
  webpack: {
    node: {
      // needed by random-bytes
      crypto: true,

      // needed by cipher-base
      stream: true,

      // needed by core-util-is
      Buffer: true
    }
  }
}
