/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const createNode = require('./utils/create-node')
const tryEcho = require('./utils/try-echo')
const echo = require('./utils/echo')

const {
  getPeerRelay
} = require('./utils/constants')

function setupNodeWithRelay (addrs, options = {}) {
  options = {
    config: {
      relay: {
        enabled: true
      },
      ...options.config
    },
    ...options
  }

  return new Promise((resolve) => {
    createNode(addrs, options, (err, node) => {
      expect(err).to.not.exist()

      node.handle(echo.multicodec, echo)
      node.start((err) => {
        expect(err).to.not.exist()
        resolve(node)
      })
    })
  })
}

describe('circuit relay', () => {
  let browserNode1
  let browserNode2
  let peerRelay

  before('get peer relay', async () => {
    peerRelay = await new Promise(resolve => {
      getPeerRelay((err, peer) => {
        expect(err).to.not.exist()
        resolve(peer)
      })
    })
  })

  before('create the browser nodes', async () => {
    [browserNode1, browserNode2] = await Promise.all([
      setupNodeWithRelay([]),
      setupNodeWithRelay([])
    ])
  })

  before('connect to the relay node', async () => {
    await Promise.all(
      [browserNode1, browserNode2].map((node) => {
        return new Promise(resolve => {
          node.dialProtocol(peerRelay, (err) => {
            expect(err).to.not.exist()
            resolve()
          })
        })
      })
    )
  })

  before('give time for HOP support to be determined', async () => {
    await new Promise(resolve => {
      setTimeout(resolve, 1e3)
    })
  })

  after(async () => {
    await Promise.all(
      [browserNode1, browserNode2].map((node) => {
        return new Promise((resolve) => {
          node.stop(resolve)
        })
      })
    )
  })

  it('should be able to echo over relay', (done) => {
    browserNode1.dialProtocol(browserNode2.peerInfo, echo.multicodec, (err, conn) => {
      expect(err).to.not.exist()
      expect(conn).to.exist()

      tryEcho(conn, done)
    })
  })
})
