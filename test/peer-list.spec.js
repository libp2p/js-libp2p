/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const PeerList = require('../src/peer-list')

const makePeers = require('./utils').makePeers

describe('PeerList', () => {
  let peers

  before((done) => {
    makePeers(3, (err, p) => {
      if (err) {
        return done(err)
      }
      peers = p
      done()
    })
  })

  it('basics', () => {
    const l = new PeerList()

    expect(l.push(peers[0])).to.eql(true)
    expect(l.push(peers[0])).to.eql(false)
    expect(l).to.have.length(1)
    expect(l.push(peers[1])).to.eql(true)
    expect(l.pop()).to.eql(peers[1])
    expect(l).to.have.length(1)
    expect(l.toArray()).to.eql([peers[0]])
  })
})
