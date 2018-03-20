/* eslint-env mocha */
'use strict'

const Railing = require('../src')
const peerList = require('./default-peers')
const partialValidPeerList = require('./some-invalid-peers')
const {expect} = require('chai')
const mafmt = require('mafmt')

describe('railing', () => {
  it('find the other peer', function (done) {
    this.timeout(5 * 1000)
    const r = new Railing({
      list: peerList,
      interval: 2000
    })

    r.once('peer', (peer) => done())
    r.start(() => {})
  })

  it('not fail on malformed peers in peer list', function (done) {
    this.timeout(5 * 1000)

    const r = new Railing({
      list: partialValidPeerList,
      interval: 2000
    })

    r.start(() => { })

    r.on('peer', (peer) => {
      const peerList = peer.multiaddrs.toArray()
      expect(peerList.length).to.eq(1)
      expect(mafmt.IPFS.matches(peerList[0].toString()))
      done()
    })
  })
})
