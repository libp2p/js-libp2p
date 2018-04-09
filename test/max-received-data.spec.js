/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Prepare = require('./utils/prepare')

const PEER_COUNT = 3

describe('maxReceivedData', function () {
  const prepare = Prepare(PEER_COUNT, {
    maxReceivedData: 50,
    minPeers: 1
  })
  before(prepare.create)
  after(prepare.after)

  it('kicks out peer after maxReceivedData reached', function (done) {
    this.timeout(10000)

    let disconnects = 0
    const manager = prepare.connManagers()[0]
    manager.on('disconnected', () => {
      disconnects++
      expect(disconnects).to.be.most(PEER_COUNT - 2)
      done()
    })

    prepare.tryConnectAll((err, eachNodeConnections) => {
      expect(err).to.not.exist()
    })
  })
})
