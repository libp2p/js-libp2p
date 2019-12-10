'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const pDefer = require('p-defer')

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
    const deferred = pDefer()

    const ping = await nodes[0].ping(nodes[1].peerInfo)

    ping.on('ping', (time) => {
      expect(time).to.be.a('Number')
      ping.stop()
      deferred.resolve()
    })

    ping.start()

    return deferred.promise
  })

  it('ping 5 times from peer1 to peer0', async () => {
    const deferred = pDefer()
    let counter = 0

    const ping = await nodes[1].ping(nodes[0].peerInfo)

    ping.on('ping', (time) => {
      expect(time).to.be.a('Number')

      if (++counter === 5) {
        ping.stop()
        deferred.resolve()
      }
    })

    ping.start()

    return deferred.promise
  })
})
