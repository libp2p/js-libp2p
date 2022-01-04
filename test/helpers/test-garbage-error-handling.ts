/* eslint-env mocha */
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import util from 'util'

const garbage = [uint8ArrayFromString('00010203040506070809', 'base16'), {}, null, false, undefined, true, 1, 0, uint8ArrayFromString(''), 'aGVsbG93b3JsZA==', 'helloworld', '']

export function testGarbage (fncName: string, fnc: (...args: Uint8Array[]) => Promise<any>, num?: number, skipBuffersAndStrings?: boolean) {
  const count = num ?? 1

  garbage.forEach((garbage) => {
    if (skipBuffersAndStrings === true && (garbage instanceof Uint8Array || (typeof garbage) === 'string')) {
      // skip this garbage because it's a Uint8Array or a String and we were told do do that
      return
    }
    const args: any[] = []
    for (let i = 0; i < count; i++) {
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
