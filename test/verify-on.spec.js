/* eslint-env mocha */
'use strict'

const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')

const Broadcast = require('./../src')

describe('With verify on', () => {
  let pA
  let pB
  let swA
  let swB

  before((done) => {
    const mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
    const mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')

    Peer.create((err, peer) => {
      if (err) {
        done(err)
      }

      pA = peer
      pA.multiaddr.add(mh1)

      swA = new Swarm(pA)
      swA.transport.add('tcp', new TCP(), {}, () => {
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
      swB.transport.add('tcp', new TCP(), {}, () => {
        swB.listen(ready)
      })
    })

    let readyCounter = 0

    function ready () {
      readyCounter++
      if (readyCounter < 2) {
        return
      }
      done()
    }
  })

  after((done) => {
    swA.close()
    swB.close()
    done()
  })

  it('Find the other peer', (done) => {
    const peerList = [
      pB.multiaddrs[0].toString() + '/ipfs/' + pB.id.toB58String()
    ]
    const bA = new Broadcast(peerList, {
      verify: true
    }, swA)

    bA.once('peer', (peer) => {
      done()
    })
  })
})
