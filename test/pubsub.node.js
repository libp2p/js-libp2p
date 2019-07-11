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

const Floodsub = require('libp2p-floodsub')
const mergeOptions = require('merge-options')

const { codes } = require('../src/errors')
const createNode = require('./utils/create-node')

function startTwo (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  const tasks = _times(2, () => (cb) => {
    createNode('/ip4/0.0.0.0/tcp/0', mergeOptions({
      config: {
        peerDiscovery: {
          mdns: {
            enabled: false
          }
        },
        pubsub: {
          enabled: true
        }
      }
    }, options), (err, node) => {
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

describe('.pubsub', () => {
  describe('.pubsub on (default)', () => {
    it('start two nodes and send one message, then unsubscribe', (done) => {
      // Check the final series error, and the publish handler
      expect(2).checks(done)

      let nodes
      const data = 'test'
      const handler = (msg) => {
        // verify the data is correct and mark the expect
        expect(msg.data.toString()).to.eql(data).mark()
      }

      series([
        // Start the nodes
        (cb) => startTwo((err, _nodes) => {
          nodes = _nodes
          cb(err)
        }),
        // subscribe on the first
        (cb) => nodes[0].pubsub.subscribe('pubsub', handler, null, cb),
        // Wait a moment before publishing
        (cb) => setTimeout(cb, 500),
        // publish on the second
        (cb) => nodes[1].pubsub.publish('pubsub', data, cb),
        // Wait a moment before unsubscribing
        (cb) => setTimeout(cb, 500),
        // unsubscribe on the first
        (cb) => nodes[0].pubsub.unsubscribe('pubsub', handler, cb),
        // Stop both nodes
        (cb) => stopTwo(nodes, cb)
      ], (err) => {
        // Verify there was no error, and mark the expect
        expect(err).to.not.exist().mark()
      })
    })
    it('start two nodes and send one message, then unsubscribe without handler', (done) => {
      // Check the final series error, and the publish handler
      expect(3).checks(done)

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
        (cb) => nodes[0].pubsub.subscribe('pubsub', handler, {}, cb),
        // Wait a moment before publishing
        (cb) => setTimeout(cb, 500),
        // publish on the second
        (cb) => nodes[1].pubsub.publish('pubsub', data, cb),
        // ls subscripts
        (cb) => nodes[1].pubsub.ls(cb),
        // get subscribed peers
        (cb) => nodes[1].pubsub.peers('pubsub', cb),
        // Wait a moment before unsubscribing
        (cb) => setTimeout(cb, 500),
        // unsubscribe from all
        (cb) => nodes[0].pubsub.unsubscribe('pubsub', null, cb),
        // Verify unsubscribed
        (cb) => {
          nodes[0].pubsub.ls((err, topics) => {
            expect(topics.length).to.eql(0).mark()
            cb(err)
          })
        },
        // Stop both nodes
        (cb) => stopTwo(nodes, cb)
      ], (err) => {
        // Verify there was no error, and mark the expect
        expect(err).to.not.exist().mark()
      })
    })
    it('publish should fail if data is not a buffer nor a string', (done) => {
      createNode('/ip4/0.0.0.0/tcp/0', {
        config: {
          peerDiscovery: {
            mdns: {
              enabled: false
            }
          },
          pubsub: {
            enabled: true
          }
        }
      }, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()

          node.pubsub.publish('pubsub', 10, (err) => {
            expect(err).to.exist()
            expect(err.code).to.equal('ERR_DATA_IS_NOT_VALID')

            done()
          })
        })
      })
    })
  })

  describe('.pubsub on using floodsub', () => {
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
        (cb) => startTwo({
          modules: {
            pubsub: Floodsub
          }
        }, (err, _nodes) => {
          nodes = _nodes
          cb(err)
        }),
        // subscribe on the first
        (cb) => nodes[0].pubsub.subscribe('pubsub', handler, cb),
        // Wait a moment before publishing
        (cb) => setTimeout(cb, 500),
        // publish on the second
        (cb) => nodes[1].pubsub.publish('pubsub', data, cb),
        // Wait a moment before unsubscribing
        (cb) => setTimeout(cb, 500),
        // unsubscribe on the first
        (cb) => nodes[0].pubsub.unsubscribe('pubsub', handler, cb),
        // Stop both nodes
        (cb) => stopTwo(nodes, cb)
      ], (err) => {
        // Verify there was no error, and mark the expect
        expect(err).to.not.exist().mark()
      })
    })
    it('start two nodes and send one message, then unsubscribe without handler', (done) => {
      // Check the final series error, and the publish handler
      expect(3).checks(done)

      let nodes
      const data = Buffer.from('test')
      const handler = (msg) => {
        // verify the data is correct and mark the expect
        expect(msg.data).to.eql(data).mark()
      }

      series([
        // Start the nodes
        (cb) => startTwo({
          modules: {
            pubsub: Floodsub
          }
        }, (err, _nodes) => {
          nodes = _nodes
          cb(err)
        }),
        // subscribe on the first
        (cb) => nodes[0].pubsub.subscribe('pubsub', handler, cb),
        // Wait a moment before publishing
        (cb) => setTimeout(cb, 500),
        // publish on the second
        (cb) => nodes[1].pubsub.publish('pubsub', data, cb),
        // Wait a moment before unsubscribing
        (cb) => setTimeout(cb, 500),
        // unsubscribe on the first
        (cb) => {
          nodes[0].pubsub.unsubscribe('pubsub')
          // Wait a moment to make sure the ubsubscribe-from-all worked
          setTimeout(cb, 500)
        },
        // Verify unsubscribed
        (cb) => {
          nodes[0].pubsub.ls((err, topics) => {
            expect(topics.length).to.eql(0).mark()
            cb(err)
          })
        },
        // Stop both nodes
        (cb) => stopTwo(nodes, cb)
      ], (err) => {
        // Verify there was no error, and mark the expect
        expect(err).to.not.exist().mark()
      })
    })
    it('publish should fail if data is not a buffer', (done) => {
      createNode('/ip4/0.0.0.0/tcp/0', {
        config: {
          peerDiscovery: {
            mdns: {
              enabled: false
            }
          },
          pubsub: {
            enabled: true
          }
        },
        modules: {
          pubsub: Floodsub
        }
      }, (err, node) => {
        expect(err).to.not.exist()

        node.start((err) => {
          expect(err).to.not.exist()

          node.pubsub.publish('pubsub', 10, (err) => {
            expect(err).to.exist()
            expect(err.code).to.equal('ERR_DATA_IS_NOT_VALID')

            done()
          })
        })
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
          }
        }
      }, (err, node) => {
        expect(err).to.not.exist()
        expect(node.pubsub).to.not.exist()
        done()
      })
    })
  })

  describe('.pubsub on and node not started', () => {
    let libp2pNode

    before(function (done) {
      createNode('/ip4/0.0.0.0/tcp/0', {
        config: {
          peerDiscovery: {
            mdns: {
              enabled: false
            }
          },
          pubsub: {
            enabled: true
          }
        }
      }, (err, node) => {
        expect(err).to.not.exist()

        libp2pNode = node
        done()
      })
    })

    it('fail to subscribe if node not started yet', (done) => {
      libp2pNode.pubsub.subscribe('pubsub', () => { }, (err) => {
        expect(err).to.exist()
        expect(err.code).to.equal(codes.PUBSUB_NOT_STARTED)

        done()
      })
    })

    it('fail to unsubscribe if node not started yet', (done) => {
      libp2pNode.pubsub.unsubscribe('pubsub', () => { }, (err) => {
        expect(err).to.exist()
        expect(err.code).to.equal(codes.PUBSUB_NOT_STARTED)

        done()
      })
    })

    it('fail to publish if node not started yet', (done) => {
      libp2pNode.pubsub.publish('pubsub', Buffer.from('data'), (err) => {
        expect(err).to.exist()
        expect(err.code).to.equal(codes.PUBSUB_NOT_STARTED)

        done()
      })
    })

    it('fail to ls if node not started yet', (done) => {
      libp2pNode.pubsub.ls((err) => {
        expect(err).to.exist()
        expect(err.code).to.equal(codes.PUBSUB_NOT_STARTED)

        done()
      })
    })

    it('fail to get subscribed peers to a topic if node not started yet', (done) => {
      libp2pNode.pubsub.peers('pubsub', (err) => {
        expect(err).to.exist()
        expect(err.code).to.equal(codes.PUBSUB_NOT_STARTED)

        done()
      })
    })
  })
})
