/* eslint-env mocha */
'use strict'

const util = require('util')
const garbage = [Buffer.from('00010203040506070809', 'hex'), {}, null, false, undefined, true, 1, 0, Buffer.from(''), 'aGVsbG93b3JsZA==', 'helloworld', '']

function doTests (fncName, fnc, num, skipBuffersAndStrings) {
  if (!num) {
    num = 1
  }

  garbage.forEach((garbage) => {
    if (skipBuffersAndStrings && (Buffer.isBuffer(garbage) || (typeof garbage) === 'string')) {
      // skip this garbage because it's a buffer or a string and we were told do do that
      return
    }
    const args = []
    for (let i = 0; i < num; i++) {
      args.push(garbage)
    }
    it(fncName + '(' + args.map(garbage => util.inspect(garbage)).join(', ') + ')', async () => {
      try {
        await fnc.apply(null, args)
      } catch (err) {
        return // expected
      }
      throw new Error('Expected error to be thrown')
    })
  })
}

module.exports = { doTests }
