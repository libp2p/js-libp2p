'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const pTimes = require('p-times')

const peerUtils = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')

describe('ping', () => {
  let nodes

  beforeEach(async () => {
    nodes = await peerUtils.createPeer({
      number: 2,
      config: baseOptions
    })
  })

  it('ping once from peer0 to peer1', async () => {
    const latency = await nodes[0].ping(nodes[1].peerInfo)

    expect(latency).to.be.a('Number')
  })

  it('ping several times for getting an average', async () => {
    const latencies = await pTimes(5, () => nodes[1].ping(nodes[0].peerInfo))

    const averageLatency = latencies.reduce((p, c) => p + c, 0) / latencies.length
    expect(averageLatency).to.be.a('Number')
  })
})
