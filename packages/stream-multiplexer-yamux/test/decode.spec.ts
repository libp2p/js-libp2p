import { expect } from 'aegir/chai'
import all from 'it-all'
import { Uint8ArrayList } from 'uint8arraylist'
import { Decoder } from '../src/decode.js'
import { encodeHeader } from '../src/encode.js'
import { Flag, FrameType, GoAwayCode } from '../src/frame.js'
import type { FrameHeader } from '../src/frame.js'

const frames: Array<{ header: FrameHeader, data?: Uint8Array }> = [
  { header: { type: FrameType.Ping, flag: Flag.SYN, streamID: 0, length: 1 } },
  { header: { type: FrameType.WindowUpdate, flag: Flag.SYN, streamID: 1, length: 1 } },
  { header: { type: FrameType.GoAway, flag: 0, streamID: 0, length: GoAwayCode.NormalTermination } },
  { header: { type: FrameType.Ping, flag: Flag.ACK, streamID: 0, length: 100 } },
  { header: { type: FrameType.WindowUpdate, flag: 0, streamID: 99, length: 1000 } },
  { header: { type: FrameType.GoAway, flag: 0, streamID: 0, length: GoAwayCode.ProtocolError } }
]

const data = (length: number): Uint8Array => Uint8Array.from(Array.from({ length }), (_, i) => i)

const expectEqualBytes = (actual: Uint8Array | Uint8ArrayList, expected: Uint8Array | Uint8ArrayList, reason?: string): void => {
  expect(actual instanceof Uint8Array ? actual : actual.subarray(), reason).to.deep.equal(expected instanceof Uint8Array ? expected : expected.subarray())
}

const expectEqualDataFrame = (actual: { header: FrameHeader, data?: Uint8Array | Uint8ArrayList }, expected: { header: FrameHeader, data?: Uint8Array | Uint8ArrayList }, reason = ''): void => {
  expect(actual.header, reason + ' header').to.deep.equal(expected.header)
  if (actual.data == null && expected.data != null) {
    expect.fail('actual has no data but expected does')
  }
  if (actual.data != null && expected.data == null) {
    expect.fail('actual has data but expected does not')
  }
  if (actual.data != null && expected.data != null) {
    expectEqualBytes(actual.data, expected.data, reason + ' data?: string')
  }
}

const expectEqualDataFrames = (actual: Array<{ header: FrameHeader, data?: Uint8Array | Uint8ArrayList }>, expected: Array<{ header: FrameHeader, data?: Uint8Array | Uint8ArrayList }>): void => {
  if (actual.length !== expected.length) {
    expect.fail('actual')
  }
  for (let i = 0; i < actual.length; i++) {
    expectEqualDataFrame(actual[i], expected[i], String(i))
  }
}

const dataFrame = (length: number): { header: FrameHeader, data: Uint8Array } => ({
  header: { type: FrameType.Data, flag: 0, streamID: 1, length },
  data: data(length)
})

export const randomRanges = (length: number): number[][] => {
  const indices = []
  let i = 0
  let j = 0
  while (i < length) {
    j = i
    i += Math.floor(Math.random() * length)
    indices.push([j, i])
  }
  return indices
}

describe('Decoder internals', () => {
  describe('readHeader', () => {
    const frame = frames[0]
    const d = new Decoder()

    afterEach(() => {
      d['buffer'].consume(d['buffer'].length)
    })

    it('should handle an empty buffer', async () => {
      expect(d['buffer'].length, 'a freshly created decoder should have an empty buffer').to.equal(0)
      expect(all(d.emitFrames(new Uint8Array()))).to.be.empty('an empty buffer should read no header')
    })

    it('should handle buffer length == header length', async () => {
      expect(all(d.emitFrames(encodeHeader(frame.header)))).to.deep.equal([frame])
      expect(d['buffer'].length, 'the buffer should be fully drained').to.equal(0)
    })

    it('should handle buffer length < header length', async () => {
      const upTo = 2

      const buf = encodeHeader(frame.header)

      expect(all(d.emitFrames(buf.slice(0, upTo)))).to.be.empty('an buffer that has insufficient bytes should read no header')
      expect(d['buffer'].length, 'a buffer that has insufficient bytes should not be consumed').to.equal(upTo)

      expect(all(d.emitFrames(buf.slice(upTo)))).to.deep.equal([frame], 'the decoded header should match the input')
      expect(d['buffer'].length, 'the buffer should be fully drained').to.equal(0)
    })

    it('should handle buffer length > header length', async () => {
      const more = 10

      const buf = new Uint8ArrayList(
        encodeHeader(frame.header),
        new Uint8Array(more)
      )

      expect(all(d.emitFrames(buf.subarray()))).to.deep.equal([frame], 'the decoded header should match the input')
      expect(d['buffer'].length, 'the buffer should be partially drained').to.equal(more)
    })
  })
})

describe('Decoder', () => {
  describe('emitFrames', () => {
    let d: Decoder

    beforeEach(() => {
      d = new Decoder()
    })

    it('should emit frames from source chunked by frame', async () => {
      const input = new Uint8ArrayList()
      const expected = []
      for (const [i, frame] of frames.entries()) {
        input.append(encodeHeader(frame.header))
        expected.push(frame)

        // sprinkle in more data frames
        if (i % 2 === 1) {
          const df = dataFrame(i * 100)
          input.append(encodeHeader(df.header))
          input.append(df.data)
          expected.push(df)
        }
      }

      const actual = all(d.emitFrames(input.subarray()))

      expectEqualDataFrames(actual, expected)
    })

    it('should emit frames from source chunked by partial frame', async () => {
      const chunkSize = 5
      const input = new Uint8ArrayList()
      const expected = []
      for (const [i, frame] of frames.entries()) {
        const encoded = encodeHeader(frame.header)
        for (let i = 0; i < encoded.length; i += chunkSize) {
          input.append(encoded.slice(i, i + chunkSize))
        }
        expected.push(frame)

        // sprinkle in more data frames
        if (i % 2 === 1) {
          const df = dataFrame(i * 100)
          const encoded = Uint8Array.from([...encodeHeader(df.header), ...df.data])
          for (let i = 0; i < encoded.length; i += chunkSize) {
            input.append(encoded.slice(i, i + chunkSize))
          }
          expected.push(df)
        }
      }

      const actual = all(d.emitFrames(input.subarray()))

      expectEqualDataFrames(actual, expected)
    })

    it('should emit frames from source chunked by multiple frames', async () => {
      const input = new Uint8ArrayList()
      const expected = []
      for (let i = 0; i < frames.length; i++) {
        const encoded1 = encodeHeader(frames[i].header)
        expected.push(frames[i])

        i++
        const encoded2 = encodeHeader(frames[i].header)
        expected.push(frames[i])

        // sprinkle in more data frames
        const df = dataFrame(i * 100)
        const encoded3 = Uint8Array.from([...encodeHeader(df.header), ...df.data])
        expected.push(df)

        const encodedChunk = new Uint8Array(encoded1.length + encoded2.length + encoded3.length)
        encodedChunk.set(encoded1, 0)
        encodedChunk.set(encoded2, encoded1.length)
        encodedChunk.set(encoded3, encoded1.length + encoded2.length)

        input.append(encodedChunk)
      }

      const actual = all(d.emitFrames(input.subarray()))

      expectEqualDataFrames(actual, expected)
    })

    it('should emit frames from source chunked chaoticly', async () => {
      const input = new Uint8ArrayList()
      const expected = []
      const encodedFrames = []
      for (const [i, frame] of frames.entries()) {
        encodedFrames.push(encodeHeader(frame.header))
        expected.push(frame)

        // sprinkle in more data frames
        if (i % 2 === 1) {
          const df = dataFrame(i * 100)
          encodedFrames.push(encodeHeader(df.header))
          encodedFrames.push(df.data)
          expected.push(df)
        }
      }

      // create a single byte array of all frames to send
      // so that we can chunk them chaoticly
      const encoded = new Uint8Array(encodedFrames.reduce((a, b) => a + b.length, 0))
      let i = 0
      for (const e of encodedFrames) {
        encoded.set(e, i)
        i += e.length
      }

      for (const [i, j] of randomRanges(encoded.length)) {
        input.append(encoded.slice(i, j))
      }

      const actual = all(d.emitFrames(input.subarray()))

      expectEqualDataFrames(actual, expected)
    })
  })
})
