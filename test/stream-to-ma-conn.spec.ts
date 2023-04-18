/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pair } from 'it-pair'
import { pipe } from 'it-pipe'
import { multiaddr } from '@multiformats/multiaddr'
import { streamToMaConnection } from '../src/stream-to-ma-conn.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import all from 'it-all'
import type { Stream } from '@libp2p/interface-connection'
import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

function toMuxedStream (stream: Duplex<AsyncGenerator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>, Promise<void>>): Stream {
  const muxedStream: Stream = {
    ...stream,
    close: () => {},
    closeRead: () => {},
    closeWrite: () => {},
    abort: () => {},
    reset: () => {},
    stat: {
      direction: 'outbound',
      timeline: {
        open: Date.now()
      }
    },
    metadata: {},
    id: `muxed-stream-${Math.random()}`
  }

  return muxedStream
}

describe('Convert stream into a multiaddr connection', () => {
  const localAddr = multiaddr('/ip4/101.45.75.219/tcp/6000')
  const remoteAddr = multiaddr('/ip4/100.46.74.201/tcp/6002')

  it('converts a stream and adds the provided metadata', async () => {
    const stream = pair<any>()

    const maConn = streamToMaConnection({
      stream: toMuxedStream(stream),
      localAddr,
      remoteAddr
    })

    expect(maConn).to.exist()
    expect(maConn.sink).to.exist()
    expect(maConn.source).to.exist()
    expect(maConn.remoteAddr).to.eql(remoteAddr)
    expect(maConn.timeline).to.exist()
    expect(maConn.timeline.open).to.exist()
    expect(maConn.timeline.close).to.not.exist()

    await maConn.close()
    expect(maConn.timeline.close).to.exist()
  })

  it('can stream data over the multiaddr connection', async () => {
    const stream = pair<any>()
    const maConn = streamToMaConnection({
      stream: toMuxedStream(stream),
      localAddr,
      remoteAddr
    })

    const data = uint8ArrayFromString('hey')
    const streamData = await pipe(
      [data],
      maConn,
      async (source) => await all(source)
    )

    expect(streamData).to.eql([data])
    // underlying stream end closes the connection
    expect(maConn.timeline.close).to.exist()
  })
})
