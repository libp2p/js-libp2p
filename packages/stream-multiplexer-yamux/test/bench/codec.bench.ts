import { itBench } from '@dapplion/benchmark'
import { decodeHeader } from '../../src/decode.js'
import { encodeHeader } from '../../src/encode.js'
import { Flag, FrameType } from '../../src/frame.js'
import { decodeHeaderNaive, encodeHeaderNaive } from '../codec.util.js'
import type { FrameHeader } from '../../src/frame.js'

describe('codec benchmark', () => {
  for (const { encode, name } of [
    { encode: encodeHeader, name: 'encodeFrameHeader' },
    { encode: encodeHeaderNaive, name: 'encodeFrameHeaderNaive' }
  ]) {
    itBench<FrameHeader, undefined>({
      id: `frame header - ${name}`,
      timeoutBench: 100000000,
      beforeEach: () => {
        return {
          type: FrameType.WindowUpdate,
          flag: Flag.ACK,
          streamID: 0xffffffff,
          length: 0xffffffff
        }
      },
      fn: (header) => {
        encode(header)
      }
    })
  }

  for (const { decode, name } of [
    { decode: decodeHeader, name: 'decodeHeader' },
    { decode: decodeHeaderNaive, name: 'decodeHeaderNaive' }
  ]) {
    itBench<Uint8Array, undefined>({
      id: `frame header ${name}`,
      beforeEach: () => {
        const header = new Uint8Array(12)
        for (let i = 1; i < 12; i++) {
          header[i] = 255
        }
        return header
      },
      fn: (header) => {
        decode(header)
      }
    })
  }
})
