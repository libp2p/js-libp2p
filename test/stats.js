/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const createNode = require('./utils/create-node')

describe('libp2p', () => {
  it('has stats', (done) => {
    createNode('/ip4/127.0.0.1/tcp/0', {
      config: {
        peerDiscovery: {
          mdns: {
            enabled: false
          }
        },
        EXPERIMENTAL: {
          dht: true
        }
      }
    }, (err, node) => {
      expect(err).to.not.exist()
      node.start((err) => {
        expect(err).to.not.exist()
        expect(node.stats).to.exist()
        node.stop(done)
      })
    })
  })
})
