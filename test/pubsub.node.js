/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const waterfall = require('async/waterfall')
const _times = require('lodash.times')

const createNode = require('./utils/create-node')

function startTwo (callback) {
  const tasks = _times(2, () => (cb) => {
    createNode('/ip4/0.0.0.0/tcp/0', {
      config: {
        peerDiscovery: {
          mdns: {
            enabled: false
          }
        },
        EXPERIMENTAL: {
          pubsub: true
        }
      }
    }, (err, node) => {
      expect(err).to.not.exist()
      node.start((err) => cb(err, node))
    })
  })

  parallel(tasks, (err, nodes) => {
    expect(err).to.not.exist()

    nodes[0].dial(nodes[1].peerInfo, (err) => callback(err, nodes))
  })
}

function stopTwo (nodes, callback) {
  parallel([
    (cb) => nodes[0].stop(cb),
    (cb) => nodes[1].stop(cb)
  ], callback)
}

// There is a vast test suite on PubSub through js-ipfs
// https://github.com/ipfs/interface-ipfs-core/blob/master/js/src/pubsub.js
// and libp2p-floodsub itself
// https://github.com/libp2p/js-libp2p-floodsub/tree/master/test
// TODO: consider if all or some of those should come here
describe('.pubsub', () => {
  describe('.pubsub on (default)', (done) => {
    it('start two nodes and send one message, then unsubscribe', (done) => {
      const data = Buffer.from('test')
      const handler = (msg, nodes, cb) => {
        expect(msg.data).to.eql(data)
        cb(null, nodes)
      }
      waterfall([
        (cb) => startTwo(cb),
        (nodes, cb) => {
          nodes[0].pubsub.subscribe('pubsub', (msg, nodes, cb) => handler, (err) => {
              expect(err).to.not.exist()
              setTimeout(() => nodes[1].pubsub.publish('pubsub', data, (err) => {
                expect(err).to.not.exist()
              }), 500)
              setTimeout(() => nodes[0].pubsub.unsubscribe('pubsub', handler, (err) => {
                expect(err).to.not.exist()
                console.log("\tunsubscribed!")
                done()
              }), 600)
            }
          )
        },
        (nodes, cb) => stopTwo(nodes, cb)
      ], done)
    })
  })

  describe('.pubsub off', () => {
    it('fail to use pubsub if disabled', (done) => {
      createNode('/ip4/0.0.0.0/tcp/0', {
        config: {
          peerDiscovery: {
            mdns: {
              enabled: false
            }
          },
          EXPERIMENTAL: {
            pubsub: false
          }
        }
      }, (err, node) => {
        expect(err).to.not.exist()
        expect(node.pubsub).to.not.exist()
        done()
      })
    })
  })
})
