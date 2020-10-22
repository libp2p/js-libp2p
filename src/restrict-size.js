'use strict'

const MAX_MSG_SIZE = 1 << 20 // 1MB

/**
 * Creates an iterable transform that restricts message sizes to
 * the given maximum size.
 *
 * @param {number} [max] - The maximum message size. Defaults to 1MB
 * @returns {*} An iterable transform.
 */
module.exports = max => {
  max = max || MAX_MSG_SIZE

  const checkSize = msg => {
    if (msg.data && msg.data.length > max) {
      throw Object.assign(new Error('message size too large!'), { code: 'ERR_MSG_TOO_BIG' })
    }
  }

  return source => {
    return (async function * restrictSize () {
      for await (const msg of source) {
        if (Array.isArray(msg)) {
          msg.forEach(checkSize)
        } else {
          checkSize(msg)
        }
        yield msg
      }
    })()
  }
}

module.exports.MAX_MSG_SIZE = MAX_MSG_SIZE
