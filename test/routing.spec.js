/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerId = require('peer-id')
const map = require('async/map')
const each = require('async/each')
const series = require('async/series')
const range = require('lodash.range')
const random = require('lodash.random')

const RoutingTable = require('../src/routing')
const kadUtils = require('../src/utils')

function createPeerId (n, callback) {
  map(range(n), (i, cb) => PeerId.create({ bits: 512 }, cb), callback)
}

describe('Routing Table', () => {
  let table

  beforeEach(function (done) {
    this.timeout(20 * 1000)

    PeerId.create({ bits: 512 }, (err, id) => {
      expect(err).to.not.exist()
      table = new RoutingTable(id, 20)
      done()
    })
  })

  it('add', function (done) {
    this.timeout(20 * 1000)

    createPeerId(20, (err, ids) => {
      expect(err).to.not.exist()

      series([
        (cb) => each(range(1000), (n, cb) => {
          table.add(ids[random(ids.length - 1)], cb)
        }, cb),
        (cb) => each(range(20), (n, cb) => {
          const id = ids[random(ids.length - 1)]

          kadUtils.convertPeerId(id, (err, key) => {
            expect(err).to.not.exist()
            expect(table.closestPeers(key, 5).length)
              .to.be.above(0)
            cb()
          })
        }, cb)
      ], done)
    })
  })

  it('remove', function (done) {
    this.timeout(20 * 1000)

    createPeerId(10, (err, peers) => {
      expect(err).to.not.exist()

      let k
      series([
        (cb) => each(peers, (peer, cbEach) => table.add(peer, cbEach), cb),
        (cb) => {
          const id = peers[2]
          kadUtils.convertPeerId(id, (err, key) => {
            expect(err).to.not.exist()
            k = key
            expect(table.closestPeers(key, 10)).to.have.length(10)
            cb()
          })
        },
        (cb) => table.remove(peers[5], cb),
        (cb) => {
          expect(table.closestPeers(k, 10)).to.have.length(9)
          expect(table.size).to.be.eql(9)
          cb()
        }
      ], done)
    })
  })

  it('closestPeer', function (done) {
    this.timeout(10 * 1000)

    createPeerId(4, (err, peers) => {
      expect(err).to.not.exist()
      series([
        (cb) => each(peers, (peer, cb) => table.add(peer, cb), cb),
        (cb) => {
          const id = peers[2]
          kadUtils.convertPeerId(id, (err, key) => {
            expect(err).to.not.exist()
            expect(table.closestPeer(key)).to.eql(id)
            cb()
          })
        }
      ], done)
    })
  })

  it('closestPeers', function (done) {
    this.timeout(20 * 1000)

    createPeerId(18, (err, peers) => {
      expect(err).to.not.exist()
      series([
        (cb) => each(peers, (peer, cb) => table.add(peer, cb), cb),
        (cb) => {
          const id = peers[2]
          kadUtils.convertPeerId(id, (err, key) => {
            expect(err).to.not.exist()
            expect(table.closestPeers(key, 15)).to.have.length(15)
            cb()
          })
        }
      ], done)
    })
  })
})
