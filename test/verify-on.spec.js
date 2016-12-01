/* eslint-env mocha */
'use strict'

var multiaddr = require('multiaddr')
var Peer = require('peer-info')
var Swarm = require('libp2p-swarm')
var TCP = require('libp2p-tcp')

var Broadcast = require('./../src')

var pA
var pB
var swA
var swB

describe('With verify on', function () {
  before(function (done) {
    var mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
    var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')

    Peer.create(function (err, peer) {
      if (err) {
        done(err)
      }

      pA = peer
      pA.multiaddr.add(mh1)

      swA = new Swarm(pA)
      swA.transport.add('tcp', new TCP(), {}, function () {
        swA.listen(ready)
      })
    })

    Peer.create(function (err, peer) {
      if (err) {
        done(err)
      }

      pB = peer
      pB.multiaddr.add(mh2)

      swB = new Swarm(pB)
      swB.transport.add('tcp', new TCP(), {}, function () {
        swB.listen(ready)
      })
    })

    var readyCounter = 0

    function ready () {
      readyCounter++
      if (readyCounter < 2) {
        return
      }
      done()
    }
  })

  after(function (done) {
    swA.close()
    swB.close()
    done()
  })

  it('Find the other peer', function (done) {
    this.timeout(1e3 * 10)
    var peerList = [
      pB.multiaddrs[0].toString() + '/ipfs/' + pB.id.toB58String()
    ]
    var bA = new Broadcast(peerList, {
      verify: true
    }, swA)

    bA.once('peer', function (peer) {
      done()
    })
  })
})
