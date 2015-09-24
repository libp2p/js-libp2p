var Lab = require('lab')
// var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var before = lab.before
var after = lab.after
// var expect = Code.expect

var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Peer = require('peer-info')
var Swarm = require('libp2p-swarm')
var tcp = require('libp2p-tcp')

var Broadcast = require('./../src')

var pA
var pB
var swA
var swB

before(function (done) {
  var mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
  pA = new Peer(Id.create(), [])
  swA = new Swarm(pA)
  swA.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, ready)

  var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
  pB = new Peer(Id.create(), [])
  swB = new Swarm(pB)
  swB.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, ready)

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

experiment('With verify on', function () {
  test('Find the other peer', { timeout: 1e3 * 10 }, function (done) {
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
