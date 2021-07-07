'use strict'

const { base64pad } = require('multiformats/bases/base64')

module.exports = {
  publicKey: base64pad.decode(
    'MCAASXjBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQDjXAQQMal4SB2tSnX6NJIPmC69/BT8A8jc7/gDUZNkEhdhYHvc7k7S4vntV/c92nJGxNdop9fKJyevuNMuXhhHAgMBAAE='
  )
}
