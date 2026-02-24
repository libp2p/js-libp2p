import { defaultLogger } from '@libp2p/logger'
import { streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { streamToMaConnection } from '../../src/transport/stream-to-conn.js'

describe('Convert stream into a multiaddr connection', () => {
  const localAddr = multiaddr('/ip4/101.45.75.219/tcp/6000')
  const remoteAddr = multiaddr('/ip4/100.46.74.201/tcp/6002')

  it('converts a stream and adds the provided metadata', async () => {
    const [outgoing, incoming] = await streamPair()
    const maConn = streamToMaConnection({
      stream: outgoing,
      localAddr,
      remoteAddr,
      log: defaultLogger().forComponent('stream-to-maconn')
    })

    expect(maConn).to.exist()
    expect(maConn.send).to.exist()
    expect(maConn.remoteAddr).to.eql(remoteAddr)
    expect(maConn).to.have.property('status', 'open')

    await Promise.all([
      pEvent(maConn, 'close'),
      incoming.close(),
      maConn.close()
    ])

    expect(maConn).to.have.property('status', 'closed')
  })

  it('can stream data over the multiaddr connection', async () => {
    const [outgoing, incoming] = await streamPair()
    const maConn = streamToMaConnection({
      stream: outgoing,
      localAddr,
      remoteAddr,
      log: defaultLogger().forComponent('stream-to-maconn')
    })

    const streamDataPromise = all(incoming)

    const data = uint8ArrayFromString('hey')
    maConn.send(data)

    const [streamData] = await Promise.all([
      streamDataPromise,
      pEvent(maConn, 'close'),
      incoming.close(),
      maConn.close()
    ])

    expect(new Uint8ArrayList(...streamData).subarray()).to.equalBytes(data)
    // underlying stream end closes the connection
    expect(maConn).to.have.property('status', 'closed')
  })
})
