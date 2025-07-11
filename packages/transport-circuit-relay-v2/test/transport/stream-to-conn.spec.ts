/* eslint-env mocha */

import { defaultLogger, logger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pair } from 'it-pair'
import { pipe } from 'it-pipe'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { streamToMaConnection } from '../../src/transport/stream-to-conn.js'
import type { StreamMultiaddrConnectionComponents } from '../../src/transport/stream-to-conn.js'
import type { Stream } from '@libp2p/interface'
import type { Duplex, Source } from 'it-stream-types'

function toMuxedStream (stream: Duplex<AsyncGenerator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>, Promise<void>>): Stream {
  const muxedStream: Stream = {
    ...stream,
    close: async () => {},
    closeRead: async () => {},
    closeWrite: async () => {},
    abort: () => {},
    direction: 'outbound',
    timeline: {
      open: Date.now()
    },
    metadata: {},
    id: `muxed-stream-${Math.random()}`,
    status: 'open',
    readStatus: 'ready',
    writeStatus: 'ready',
    log: logger('muxed-stream')
  }

  return muxedStream
}

describe('Convert stream into a multiaddr connection', () => {
  const localAddr = multiaddr('/ip4/101.45.75.219/tcp/6000')
  const remoteAddr = multiaddr('/ip4/100.46.74.201/tcp/6002')
  let components: StreamMultiaddrConnectionComponents

  beforeEach(() => {
    components = {
      logger: defaultLogger()
    }
  })

  it('converts a stream and adds the provided metadata', async () => {
    const stream = pair<any>()

    const maConn = streamToMaConnection(components, {
      stream: toMuxedStream(stream),
      localAddr,
      remoteAddr,
      name: 'stream-to-maconn'
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
    const maConn = streamToMaConnection(components, {
      stream: toMuxedStream(stream),
      localAddr,
      remoteAddr,
      name: 'stream-to-maconn'
    })

    const data = uint8ArrayFromString('hey')
    const streamData = await pipe(
      async function * () {
        yield data
      },
      maConn,
      async (source) => all(source)
    )

    expect(streamData).to.deep.equal([new Uint8ArrayList(data)])
    // underlying stream end closes the connection
    expect(maConn.timeline.close).to.exist()
  })
})
