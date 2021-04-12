/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const pair = require('it-pair')
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const { Multiaddr } = require('multiaddr')

const streamToMaConn = require('../src/stream-to-ma-conn')

describe('Convert stream into a multiaddr connection', () => {
  it('converts a stream and adds the provided metadata', () => {
    const stream = pair()
    const localAddr = new Multiaddr('/ip4/101.45.75.219/tcp/6000')
    const remoteAddr = new Multiaddr('/ip4/100.46.74.201/tcp/6002')

    const maConn = streamToMaConn({
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

    maConn.close()
    expect(maConn.timeline.close).to.exist()
  })

  it('can stream data over the multiaddr connection', async () => {
    const stream = pair()
    const maConn = streamToMaConn({ stream })

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
