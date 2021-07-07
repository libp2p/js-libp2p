/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')

const PeerList = require('../src/peer-list')

const createPeerId = require('./utils/create-peer-id')

describe('PeerList', () => {
  let peers

  before(async () => {
    peers = await createPeerId(3)
  })

  it('basics', () => {
    const l = new PeerList()

    expect(l.push({ id: peers[0] })).to.eql(true)
    expect(l.push({ id: peers[0] })).to.eql(false)
    expect(l).to.have.length(1)
    expect(l.push({ id: peers[1] })).to.eql(true)
    expect(l.pop()).to.eql({ id: peers[1] })
    expect(l).to.have.length(1)
    expect(l.toArray()).to.eql([{ id: peers[0] }])
  })
})
