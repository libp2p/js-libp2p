/* eslint-env mocha */
'use strict'

const Id = require('ipfs-peer-id')
const Peer = require('ipfs-peer')
const Swarm = require('ipfs-swarm')
const multiaddr = require('multiaddr')

const Ping = require('./../src')

let swarmA
let swarmB
let peerB

describe('ping', () => {
  beforeEach((done) => {
    swarmA = new Swarm()
    swarmB = new Swarm()

    swarmB.listen(8101, () => {
      peerB = new Peer(Id.create(), [
        multiaddr('/ip4/127.0.0.1/tcp/' + swarmB.port)
      ])
      done()
    })
  })

  afterEach(() => {
    swarmB.closeListener()
  })

  it('ECHO', (done) => {
    Ping.pingEcho(swarmB)

    var p = new Ping(swarmA, peerB)

    p.on('ping', (time) => {
      p.stop()
      done()
    })
  })
})
