/* eslint-disable @typescript-eslint/dot-notation */
import { expect } from 'aegir/chai'
import { type Pushable, pushable } from 'it-pushable'
import { ERR_DECODE_IN_PROGRESS } from '../src/constants.js'
import { Decoder } from '../src/decode.js'
import { encodeHeader } from '../src/encode.js'
import { Flag, type FrameHeader, FrameType, GoAwayCode } from '../src/frame.js'
import { timeout } from './util.js'
import type { Uint8ArrayList } from 'uint8arraylist'

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
    const p = pushable()
    const d = new Decoder(p)

    afterEach(() => {
      d['buffer'].consume(d['buffer'].length)
    })

    it('should handle an empty buffer', async () => {
      expect(d['buffer'].length, 'a freshly created decoder should have an empty buffer').to.equal(0)
      expect(d['readHeader'](), 'an empty buffer should read no header').to.equal(undefined)
    })

    it('should handle buffer length == header length', async () => {
      d['buffer'].append(encodeHeader(frame.header))

      expect(d['readHeader'](), 'the decoded header should match the input').to.deep.equal(frame.header)
      expect(d['buffer'].length, 'the buffer should be fully drained').to.equal(0)
    })

    it('should handle buffer length < header length', async () => {
      const upTo = 2

      d['buffer'].append(encodeHeader(frame.header).slice(0, upTo))

      expect(d['readHeader'](), 'an buffer that has insufficient bytes should read no header').to.equal(undefined)
      expect(d['buffer'].length, 'a buffer that has insufficient bytes should not be consumed').to.equal(upTo)

      d['buffer'].append(encodeHeader(frame.header).slice(upTo))

      expect(d['readHeader'](), 'the decoded header should match the input').to.deep.equal(frame.header)
      expect(d['buffer'].length, 'the buffer should be fully drained').to.equal(0)
    })

    it('should handle buffer length > header length', async () => {
      const more = 10

      d['buffer'].append(encodeHeader(frame.header))
      d['buffer'].append(new Uint8Array(more))

      expect(d['readHeader'](), 'the decoded header should match the input').to.deep.equal(frame.header)
      expect(d['buffer'].length, 'the buffer should be partially drained').to.equal(more)
    })
  })

  describe('readBytes', () => {
    const p = pushable()
    const d = new Decoder(p)

    afterEach(() => {
      d['buffer'].consume(d['buffer'].length)
    })

    it('should handle buffer length == requested length', async () => {
      const requested = 10

      d['buffer'].append(data(requested))

      let actual
      try {
        actual = await Promise.race([timeout(1), d['readBytes'](requested)])
      } catch (e) {
        expect.fail('readBytes timed out')
      }

      expectEqualBytes(actual as Uint8ArrayList, data(requested), 'read bytes should equal input')
      expect(d['buffer'].length, 'buffer should be drained').to.deep.equal(0)
    })

    it('should handle buffer length > requested length', async () => {
      const requested = 10

      d['buffer'].append(data(requested * 2))

      let actual
      try {
        actual = await Promise.race([timeout(1), d['readBytes'](requested)])
      } catch (e) {
        expect.fail('readBytes timed out')
      }

      expectEqualBytes(actual as Uint8ArrayList, data(requested), 'read bytes should equal input')
      expect(d['buffer'].length, 'buffer should be partially drained').to.deep.equal(requested)
    })

    it('should handle buffer length < requested length, data available', async () => {
      const requested = 10

      p.push(data(requested))

      let actual
      try {
        actual = await Promise.race([timeout(10), d['readBytes'](requested)])
      } catch (e) {
        expect.fail('readBytes timed out')
      }

      expectEqualBytes(actual as Uint8ArrayList, data(requested), 'read bytes should equal input')
      expect(d['buffer'].length, 'buffer should be drained').to.deep.equal(0)
    })

    it('should handle buffer length < requested length, data not available', async () => {
      const requested = 10

      p.push(data(requested - 1))

      try {
        await Promise.race([timeout(10), d['readBytes'](requested)])
        expect.fail('readBytes should not resolve until the source + buffer have enough bytes')
      } catch (e) {
      }
    })
  })
})

describe('Decoder', () => {
  describe('emitFrames', () => {
    let p: Pushable<Uint8Array>
    let d: Decoder

    beforeEach(() => {
      p = pushable()
      d = new Decoder(p)
    })

    it('should emit frames from source chunked by frame', async () => {
      const expected = []
      for (const [i, frame] of frames.entries()) {
        p.push(encodeHeader(frame.header))
        expected.push(frame)

        // sprinkle in more data frames
        if (i % 2 === 1) {
          const df = dataFrame(i * 100)
          p.push(encodeHeader(df.header))
          p.push(df.data)
          expected.push(df)
        }
      }
      p.end()

      const actual = []
      for await (const frame of d.emitFrames()) {
        if (frame.readData === undefined) {
          actual.push(frame)
        } else {
          actual.push({ header: frame.header, data: await frame.readData() })
        }
      }

      expectEqualDataFrames(actual, expected)
    })

    it('should emit frames from source chunked by partial frame', async () => {
      const chunkSize = 5
      const expected = []
      for (const [i, frame] of frames.entries()) {
        const encoded = encodeHeader(frame.header)
        for (let i = 0; i < encoded.length; i += chunkSize) {
          p.push(encoded.slice(i, i + chunkSize))
        }
        expected.push(frame)

        // sprinkle in more data frames
        if (i % 2 === 1) {
          const df = dataFrame(i * 100)
          const encoded = Uint8Array.from([...encodeHeader(df.header), ...df.data])
          for (let i = 0; i < encoded.length; i += chunkSize) {
            p.push(encoded.slice(i, i + chunkSize))
          }
          expected.push(df)
        }
      }
      p.end()

      const actual = []
      for await (const frame of d.emitFrames()) {
        if (frame.readData === undefined) {
          actual.push(frame)
        } else {
          actual.push({ header: frame.header, data: await frame.readData() })
        }
      }

      expect(p.readableLength).to.equal(0)
      expectEqualDataFrames(actual, expected)
    })

    it('should emit frames from source chunked by multiple frames', async () => {
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

        p.push(encodedChunk)
      }
      p.end()

      const actual = []
      for await (const frame of d.emitFrames()) {
        if (frame.readData === undefined) {
          actual.push(frame)
        } else {
          actual.push({ header: frame.header, data: await frame.readData() })
        }
      }

      expectEqualDataFrames(actual, expected)
    })

    it('should emit frames from source chunked chaoticly', async () => {
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
        p.push(encoded.slice(i, j))
      }
      p.end()

      const actual = []
      for await (const frame of d.emitFrames()) {
        if (frame.readData === undefined) {
          actual.push(frame)
        } else {
          actual.push({ header: frame.header, data: await frame.readData() })
        }
      }

      expectEqualDataFrames(actual, expected)
    })

    it('should error decoding frame while another decode is in progress', async () => {
      const df1 = dataFrame(100)
      p.push(encodeHeader(df1.header))
      p.push(df1.data)
      const df2 = dataFrame(100)
      p.push(encodeHeader(df2.header))
      p.push(df2.data)

      try {
        for await (const frame of d.emitFrames()) {
          void frame
        }
        expect.fail('decoding another frame before the first is finished should error')
      } catch (e) {
        expect((e as { code: string }).code).to.equal(ERR_DECODE_IN_PROGRESS)
      }
    })
  })
})
