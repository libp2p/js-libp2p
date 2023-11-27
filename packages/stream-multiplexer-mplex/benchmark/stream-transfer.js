import { defaultLogger } from '@libp2p/logger'
import drain from 'it-drain'
import { duplexPair } from 'it-pair/duplex'
import { pipe } from 'it-pipe'
import { Uint8ArrayList } from 'uint8arraylist'
import { mplex } from '../dist/src/index.js'

const DATA_LENGTH = 1024 * 1024 * 1024
const CHUNK_SIZE = 1024 * 1024 / 4
const ITERATIONS = 10

const results = []

for (let i = 0; i < ITERATIONS; i++) {
  const p = duplexPair()
  const muxerA = mplex()({
    logger: defaultLogger()
  }).createStreamMuxer({
    direction: 'outbound'
  })
  const muxerB = mplex()({
    logger: defaultLogger()
  }).createStreamMuxer({
    direction: 'inbound',
    onIncomingStream: (stream) => {
      // echo stream back to itself
      pipe(stream, stream)
    }
  })

  // pipe data through muxers
  pipe(p[0], muxerA, p[0])
  pipe(p[1], muxerB, p[1])

  const stream = await muxerA.newStream()

  const start = Date.now()

  await pipe(
    async function * () {
      for (let i = 0; i < DATA_LENGTH; i += CHUNK_SIZE) {
        yield * new Uint8ArrayList(new Uint8Array(CHUNK_SIZE))
      }
    },
    stream,
    (source) => drain(source)
  )

  const finish = Date.now() - start

  muxerA.close()
  muxerB.close()

  results.push(finish)
}

const megs = DATA_LENGTH / (1024 * 1024)
const secs = (results.reduce((acc, curr) => acc + curr, 0) / results.length) / 1000

console.info((megs / secs).toFixed(2), 'MB/s')
