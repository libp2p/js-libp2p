'use strict'

/**
 * Converts BufferList messages to Uint8Arrays
 *
 * @param {*} source
 * @returns {AsyncGenerator}
 */
const toBuffer = (source) => {
  return (async function * () {
    for await (const chunk of source) {
      yield chunk instanceof Uint8Array ? chunk : chunk.slice()
    }
  })()
}

module.exports = toBuffer
