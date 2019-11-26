'use strict'
/**
 * Converts BufferList messages to Buffers
 * @param {*} source
 * @returns {AsyncGenerator}
 */
const toBuffer = (source) => {
  return (async function * () {
    for await (const chunk of source) {
      yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
    }
  })()
}

module.exports = toBuffer
