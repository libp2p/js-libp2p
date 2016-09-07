/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const Peer = require('peer-info')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const multiaddr = require('multiaddr')
const parallel = require('run-parallel')

const Ping = require('./../src')

let swarmA
let swarmB
let peerA
let peerB

describe('ping', () => {
  beforeEach((done) => {
    peerA = new Peer()
    peerB = new Peer()

    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/8101'))

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)

    swarmA.transport.add('tcp', new TCP())
    swarmB.transport.add('tcp', new TCP())

    swarmB.transport.listen('tcp', {}, null, done)
  })

  afterEach((done) => {
    parallel([
      (cb) => swarmA.close(cb),
      (cb) => swarmB.close(cb)
    ], done)
  })

  it('ECHO', (done) => {
    Ping.attach(swarmB)

    var p = new Ping(swarmA, peerB)

    p.on('error', (err) => {
      throw err
    })

    p.on('ping', (time) => {
      expect(time).to.be.a('Number')
      p.stop()
      Ping.detach(swarmB)
      done()
    })
  })
})
