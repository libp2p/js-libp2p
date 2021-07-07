/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')

const LimitedPeerList = require('../src/peer-list/limited-peer-list')
const createPeerId = require('./utils/create-peer-id')

describe('LimitedPeerList', () => {
  let peers

  before(async () => {
    peers = await createPeerId(5)
  })

  it('basics', () => {
    const l = new LimitedPeerList(4)

    expect(l.push({ id: peers[0] })).to.eql(true)
    expect(l.push({ id: peers[0] })).to.eql(false)
    expect(l.push({ id: peers[1] })).to.eql(true)
    expect(l.push({ id: peers[2] })).to.eql(true)
    expect(l.push({ id: peers[3] })).to.eql(true)
    expect(l.push({ id: peers[4] })).to.eql(false)

    expect(l).to.have.length(4)
    expect(l.pop()).to.eql({ id: peers[3] })
    expect(l).to.have.length(3)
    expect(l.push({ id: peers[4] })).to.eql(true)
    expect(l.toArray()).to.eql([
      { id: peers[0] },
      { id: peers[1] },
      { id: peers[2] },
      { id: peers[4] }
    ])
  })
})
