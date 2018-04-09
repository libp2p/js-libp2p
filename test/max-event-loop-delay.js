/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Prepare = require('./utils/prepare')

const PEER_COUNT = 3

describe('maxEventLoopDelay', function () {
  const prepare = Prepare(PEER_COUNT, {
    pollInterval: 1000,
    maxEventLoopDelay: 10,
    minPeers: 1
  })
  before(prepare.create)
  after(prepare.after)

  it('kicks out peer after maxEventLoopDelay reached', function (done) {
    this.timeout(10000)
    let stopped = false

    let totalDisconnects = 0
    prepare.connManagers().forEach((connManager) => {
      connManager.on('disconnected', () => {
        totalDisconnects++
        expect(totalDisconnects).to.be.most((PEER_COUNT - 2) * PEER_COUNT)
        if (totalDisconnects === PEER_COUNT) {
          stopped = true
          done()
        }
      })
    })

    prepare.tryConnectAll((err) => {
      expect(err).to.not.exist()
      makeDelay()
    })

    function makeDelay () {
      let sum = 0
      for (let i = 0; i < 1000000; i++) {
        sum += Math.random()
      }
      debug(sum)

      if (!stopped) {
        setTimeout(makeDelay, 0)
      }
    }
  })
})

function debug (what) {
  if (what === 0) {
    // never true but the compiler doesn't know that
    console.log('WHAT')
  }
}
