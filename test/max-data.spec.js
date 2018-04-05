/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Prepare = require('./utils/prepare')

const PEER_COUNT = 3

describe('connection manager', function () {
  const prepare = Prepare(PEER_COUNT, {
    maxData: 100,
    minPeers: 1
  })
  before(prepare.create)
  after(prepare.after)

  it('kicks out peer after maxData reached', function (done) {
    this.timeout(10000)

    let totalDisconnects = 0
    prepare.connManagers().forEach((connManager) => {
      let disconnects = 0

      connManager.on('disconnected', () => {
        disconnects++
        expect(disconnects).to.be.most(PEER_COUNT - 2)
        totalDisconnects++
        expect(totalDisconnects).to.be.most((PEER_COUNT - 2) * PEER_COUNT)
        expect()
        if (totalDisconnects === PEER_COUNT) {
          done()
        }
      })
    })

    prepare.tryConnect((err, eachNodeConnections) => {
      expect(err).to.not.exist()
      expect(eachNodeConnections.length).to.be.equal(PEER_COUNT)
      eachNodeConnections.forEach((nodeConnections) => {
        expect(nodeConnections.length).to.equal(PEER_COUNT - 1)
      })
    })
  })
})
