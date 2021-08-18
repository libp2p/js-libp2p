/* eslint-env mocha */
'use strict'

const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const util = require('util')
const garbage = [uint8ArrayFromString('00010203040506070809', 'base16'), {}, null, false, undefined, true, 1, 0, uint8ArrayFromString(''), 'aGVsbG93b3JsZA==', 'helloworld', '']

function doTests (fncName, fnc, num, skipBuffersAndStrings) {
  if (!num) {
    num = 1
  }

  garbage.forEach((garbage) => {
    if (skipBuffersAndStrings && (garbage instanceof Uint8Array || (typeof garbage) === 'string')) {
      // skip this garbage because it's a Uint8Array or a String and we were told do do that
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
