/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Swarm = require('libp2p-swarm')
const Id = require('peer-id')
const Peer = require('peer-info')

const Node = require('../src')

describe('libp2p', () => {
  it('can be instantiated', () => {
    const peer = new Peer(Id.create(), [])
    const swarm = new Swarm(peer)
    const node = new Node(swarm)

    expect(node.swarm).to.be.eql(swarm)
  })
})
