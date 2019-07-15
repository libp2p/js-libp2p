/* eslint-env mocha */
'use strict'

const Bootstrap = require('../src')
const peerList = require('./default-peers')
const partialValidPeerList = require('./some-invalid-peers')
const { expect } = require('chai')
const mafmt = require('mafmt')

describe('bootstrap', () => {
  it('find the other peer', function () {
    this.timeout(5 * 1000)
    const r = new Bootstrap({
      list: peerList,
      interval: 2000
    })

    const p = new Promise((resolve) => r.once('peer', resolve))
    r.start()
    return p
  })

  it('not fail on malformed peers in peer list', function () {
    this.timeout(5 * 1000)

    const r = new Bootstrap({
      list: partialValidPeerList,
      interval: 2000
    })

    const p = new Promise((resolve) => {
      r.once('peer', (peer) => {
        const peerList = peer.multiaddrs.toArray()
        expect(peerList.length).to.eq(1)
        expect(mafmt.IPFS.matches(peerList[0].toString())).equals(true)
        resolve()
      })
    })

    r.start()

    return p
  })

  it('stop emitting events when stop() called', async function () {
    const interval = 100
    const r = new Bootstrap({
      list: peerList,
      interval
    })

    let emitted = []
    r.on('peer', p => emitted.push(p))

    // Should fire emit event for each peer in list on start,
    // so wait 50 milliseconds then check
    const p = new Promise((resolve) => setTimeout(resolve, 50))
    r.start()
    await p
    expect(emitted).to.have.length(peerList.length)

    // After stop is called, no more peers should be emitted
    emitted = []
    r.stop()
    await new Promise((resolve) => setTimeout(resolve, interval))
    expect(emitted).to.have.length(0)
  })
})
