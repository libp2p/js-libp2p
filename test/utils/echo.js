/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')

function echo (protocol, conn) {
  pull(conn, conn)
}

module.exports = echo
