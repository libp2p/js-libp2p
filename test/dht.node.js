/* eslint-env mocha */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const createNode = require('./utils/create-node')

describe('.dht', () => {
  describe('enabled', () => {
    let nodeA

    before(function (done) {
      createNode('/ip4/0.0.0.0/tcp/0', {
        config: {
          EXPERIMENTAL: {
            dht: true
          }
        }
      }, (err, node) => {
        expect(err).to.not.exist()
        nodeA = node

        // Rewrite validators
        nodeA._dht.validators.v = {
          func (key, publicKey, callback) {
            setImmediate(callback)
          },
          sign: false
        }

        // Rewrite selectors
        nodeA._dht.selectors.v = () => 0

        // Start
        nodeA.start(done)
      })
    })

    after((done) => {
      nodeA.stop(done)
    })

    it('should be able to dht.put a value to the DHT', (done) => {
      const key = Buffer.from('key')
      const value = Buffer.from('value')

      nodeA.dht.put(key, value, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('should be able to dht.get a value from the DHT with options', (done) => {
      const key = Buffer.from('/v/hello')
      const value = Buffer.from('world')

      nodeA.dht.put(key, value, (err) => {
        expect(err).to.not.exist()

        nodeA.dht.get(key, { maxTimeout: 3000 }, (err, res) => {
          expect(err).to.not.exist()
          expect(res).to.eql(value)
          done()
        })
      })
    })

    it('should be able to dht.get a value from the DHT with no options defined', (done) => {
      const key = Buffer.from('/v/hello')
      const value = Buffer.from('world')

      nodeA.dht.put(key, value, (err) => {
        expect(err).to.not.exist()

        nodeA.dht.get(key, (err, res) => {
          expect(err).to.not.exist()
          expect(res).to.eql(value)
          done()
        })
      })
    })

    it('should be able to dht.getMany a value from the DHT with options', (done) => {
      const key = Buffer.from('/v/hello')
      const value = Buffer.from('world')

      nodeA.dht.put(key, value, (err) => {
        expect(err).to.not.exist()

        nodeA.dht.getMany(key, 1, { maxTimeout: 3000 }, (err, res) => {
          expect(err).to.not.exist()
          expect(res).to.exist()
          done()
        })
      })
    })

    it('should be able to dht.getMany a value from the DHT with no options defined', (done) => {
      const key = Buffer.from('/v/hello')
      const value = Buffer.from('world')

      nodeA.dht.put(key, value, (err) => {
        expect(err).to.not.exist()

        nodeA.dht.getMany(key, 1, (err, res) => {
          expect(err).to.not.exist()
          expect(res).to.exist()
          done()
        })
      })
    })
  })

  describe('disabled', () => {
    let nodeA

    before(function (done) {
      createNode('/ip4/0.0.0.0/tcp/0', {
        config: {
          EXPERIMENTAL: {
            dht: false
          }
        }
      }, (err, node) => {
        expect(err).to.not.exist()
        nodeA = node
        nodeA.start(done)
      })
    })

    after((done) => {
      nodeA.stop(done)
    })

    it('should receive an error on dht.put if the dht is disabled', (done) => {
      const key = Buffer.from('key')
      const value = Buffer.from('value')

      nodeA.dht.put(key, value, (err) => {
        expect(err).to.exist()
        done()
      })
    })

    it('should receive an error on dht.get if the dht is disabled', (done) => {
      const key = Buffer.from('key')

      nodeA.dht.get(key, (err) => {
        expect(err).to.exist()
        done()
      })
    })

    it('should receive an error on dht.getMany if the dht is disabled', (done) => {
      const key = Buffer.from('key')

      nodeA.dht.getMany(key, 10, (err) => {
        expect(err).to.exist()
        done()
      })
    })
  })
})
