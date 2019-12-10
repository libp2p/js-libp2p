'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')

const { randomBytes } = require('libp2p-crypto')
const pipe = require('it-pipe')
const concat = require('it-concat')
const delay = require('delay')

const { MULTIADDRS_WEBSOCKETS: remoteAddrs } = require('../fixtures/browser')
const { createPeer } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options.browser')

describe('libp2p.metrics', () => {
  let libp2p

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })

  it('should disable metrics by default', async () => {
    [libp2p] = await createPeer({
      config: {
        modules: baseOptions.modules
      }
    })

    expect(libp2p.metrics).to.not.exist()
  })

  it('should start/stop metrics on startup/shutdown when enabled', async () => {
    const config = { ...baseOptions }
    config.metrics = {
      enabled: true
    }
    ;[libp2p] = await createPeer({ config })

    expect(libp2p.metrics).to.exist()
    sinon.spy(libp2p.metrics, 'start')
    sinon.spy(libp2p.metrics, 'stop')

    await libp2p.start()
    expect(libp2p.metrics.start).to.have.property('callCount', 1)

    await libp2p.stop()
    expect(libp2p.metrics.stop).to.have.property('callCount', 1)
  })

  it('should record metrics on connections and streams when enabled', async () => {
    const config = { ...baseOptions }
    config.metrics = {
      enabled: true,
      computeThrottleMaxQueueSize: 1, // compute after every message
      movingAverageIntervals: [10]
    }
    ;[libp2p] = await createPeer({ config })

    await libp2p.start()
    const connection = await libp2p.dial(remoteAddrs[0])
    const { stream } = await connection.newStream('/echo/1.0.0')

    const bytes = randomBytes(512)
    const result = await pipe(
      [bytes],
      stream,
      concat
    )

    // Flush the call stack
    await delay(0)

    expect(result).to.have.length(bytes.length)
    // Protocol stats should equal the echo size
    const protocolStats = libp2p.metrics.forProtocol('/echo/1.0.0').toJSON()
    expect(Number(protocolStats.dataReceived)).to.equal(bytes.length)
    expect(Number(protocolStats.dataSent)).to.equal(bytes.length)

    // A lot more traffic will be sent over the wire for the peer
    const peerStats = libp2p.metrics.forPeer(connection.remotePeer).toJSON()
    expect(Number(peerStats.dataReceived)).to.be.at.least(bytes.length)
    await libp2p.stop()
  })
})
