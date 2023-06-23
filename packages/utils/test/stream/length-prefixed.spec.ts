import { expect } from 'aegir/chai'
import { concat } from 'uint8arrays/concat'
import { lengthPrefixed } from '../../src/stream/length-prefixed.js'
import { pair } from '../../src/stream/pair.js'

describe('length-prefixed', () => {
  it('should decode length prefixed data', async () => {
    const stream = pair()
    const lpStream = lengthPrefixed(stream)

    const input = Uint8Array.from([0, 1, 2, 3, 4, 5])

    await lpStream.write(input)

    const output = await lpStream.read()

    expect(output.subarray()).to.equalBytes(input)
  })

  it('should decode length prefixed data suffixed by more data', async () => {
    const stream = pair()
    const lpStream = lengthPrefixed(stream)

    const input = Uint8Array.from([0, 1, 2, 3, 4, 5])

    const writer = stream.writable.getWriter()
    await writer.ready
    await writer.write(concat([
      [6],
      [0, 1, 2, 3, 4, 5],
      [6, 7, 8, 9]
    ]))
    writer.releaseLock()

    const output = await lpStream.read()

    expect(output.subarray()).to.equalBytes(input)
  })

  it('should make subsequent data available on the original stream', async () => {
    const stream = pair()
    const lpStream = lengthPrefixed(stream)

    const input = Uint8Array.from([0, 1, 2, 3, 4, 5])

    const writer = stream.writable.getWriter()
    await writer.ready
    await writer.write(concat([
      [6],
      [0, 1, 2, 3, 4, 5],
      [6, 7, 8, 9]
    ]))
    writer.releaseLock()

    const output = await lpStream.read()
    expect(output.subarray()).to.equalBytes(input)

    const s = lpStream.unwrap()
    const reader = s.readable.getReader()
    const result = await reader.read()

    expect(result.done).to.be.false()
    expect(result.value).to.equalBytes(Uint8Array.from([6, 7, 8, 9]))
  })

  it('should decode length prefixed data across multiple buffers', async () => {
    const stream = pair()
    const lpStream = lengthPrefixed(stream)

    const input = Uint8Array.from([0, 1, 2, 3, 4, 5])

    const writer = stream.writable.getWriter()
    await writer.ready
    await writer.write(concat([
      [6],
      [0, 1, 2],
      [3],
      [4, 5]
    ]))
    writer.releaseLock()

    const output = await lpStream.read()

    expect(output.subarray()).to.equalBytes(input)
  })
})
