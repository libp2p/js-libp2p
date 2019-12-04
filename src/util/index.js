'use strict'

const AbortController = require('abort-controller')

/**
 * Converts BufferList messages to Buffers
 * @param {*} source
 * @returns {AsyncGenerator}
 */
function toBuffer (source) {
  return (async function * () {
    for await (const chunk of source) {
      yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
    }
  })()
}

module.exports.toBuffer = toBuffer
