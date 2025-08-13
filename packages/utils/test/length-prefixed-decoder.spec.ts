import { expect } from 'aegir/chai'
import all from 'it-all'
import { encode } from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import { LengthPrefixedDecoder } from '../src/length-prefixed-decoder.ts'

describe('length-prefixed-decoder', () => {
  it('should decode', () => {
    const buf1 = Uint8Array.from([0, 1, 2, 3, 4])
    const buf2 = Uint8Array.from([5, 6, 7, 8, 9])

    const input = [
      encode(buf1.byteLength),
      buf1,
      encode(buf2.byteLength),
      buf2
    ]

    const decoder = new LengthPrefixedDecoder()
    const result = all(decoder.decode(new Uint8ArrayList(...input)))

    expect(result).to.deep.equal([
      new Uint8ArrayList(buf1),
      new Uint8ArrayList(buf2)
    ])
  })
})
