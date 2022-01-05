/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
// @ts-expect-error no types
import pair from 'it-pair'
import pipe from 'it-pipe'
import { collect } from 'streaming-iterables'
import { Multiaddr } from '@multiformats/multiaddr'
import { streamToMaConnection } from '../src/stream-to-ma-conn.js'

describe('Convert stream into a multiaddr connection', () => {
  const localAddr = new Multiaddr('/ip4/101.45.75.219/tcp/6000')
  const remoteAddr = new Multiaddr('/ip4/100.46.74.201/tcp/6002')

  it('converts a stream and adds the provided metadata', async () => {
    const stream = pair()

    const maConn = streamToMaConnection({
      stream,
      localAddr,
      remoteAddr
    })

    expect(maConn).to.exist()
    expect(maConn.sink).to.exist()
    expect(maConn.source).to.exist()
    expect(maConn.localAddr).to.eql(localAddr)
    expect(maConn.remoteAddr).to.eql(remoteAddr)
    expect(maConn.timeline).to.exist()
    expect(maConn.timeline.open).to.exist()
    expect(maConn.timeline.close).to.not.exist()

    await maConn.close()
    expect(maConn.timeline.close).to.exist()
  })

  it('can stream data over the multiaddr connection', async () => {
    const stream = pair()
    const maConn = streamToMaConnection({
      stream,
      localAddr,
      remoteAddr
    })

    const data = 'hey'
    const streamData = await pipe(
      [data],
      maConn,
      collect
    )

    expect(streamData).to.eql([data])
    // underlying stream end closes the connection
    expect(maConn.timeline.close).to.exist()
  })
})
