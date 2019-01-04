/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')
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
      // Check the final series error, and the publish handler
      expect(2).checks(done)

      let nodes
      const data = Buffer.from('test')
      const handler = (msg) => {
        // verify the data is correct and mark the expect
        expect(msg.data).to.eql(data).mark()
      }

      series([
        // Start the nodes
        (cb) => startTwo((err, _nodes) => {
          nodes = _nodes
          cb(err)
        }),
        // subscribe on the first
        (cb) => nodes[0].pubsub.subscribe('pubsub', handler, cb),
        // Wait a moment before publishing
        (cb) => setTimeout(cb, 500),
        // publish on the second
        (cb) => nodes[1].pubsub.publish('pubsub', data, cb),
        // unsubscribe on the first
        (cb) => nodes[0].pubsub.unsubscribe('pubsub', handler, cb),
        // Stop both nodes
        (cb) => stopTwo(nodes, cb)
      ], (err) => {
        // Verify there was no error, and mark the expect
        expect(err).to.not.exist().mark()
      })
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
