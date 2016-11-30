/* eslint-env mocha */
'use strict'

var multiaddr = require('multiaddr')
var Peer = require('peer-info')
var expect = require('chai').expect

var Sonar = require('./../src')

var pA
var pB

describe('Without verify on', function () {
  before(function (done) {
    Peer.create(function (err, peer) {
      if (err) {
        done(err)
      }

      pA = peer
      pA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/4001'))
      ready()
    })

    Peer.create(function (err, peer) {
      if (err) {
        done(err)
      }

      pB = peer
      pB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/4002'))
      ready()
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

  it('Find the other peer', function (done) {
    this.timeout(1e3 * 10)
    var sA = new Sonar(pA, {
      verify: false,
      port: 9095
    })

    var sB = new Sonar(pB, {
      verify: false,
      port: 9095
    })

    sA.once('peer', function (peer) {
      expect(pB.id.toB58String()).to.be.eql(peer.id.toB58String())
      done()
    })

    sB.once('peer', function (peer) {})
  })
})
