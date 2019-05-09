/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerInfo = require('peer-info')
const parallel = require('async/parallel')
const map = require('async/map')
const MDNS = require('multicast-dns')
const OS = require('os')

const Querier = require('../../src/compat/querier')
const { SERVICE_TAG_LOCAL } = require('../../src/compat/constants')

describe('Querier', () => {
  let querier, mdns
  const peerAddrs = [
    '/ip4/127.0.0.1/tcp/20001',
    '/ip4/127.0.0.1/tcp/20002'
  ]
  let peerInfos

  before(done => {
    map(peerAddrs, (addr, cb) => {
      PeerInfo.create((err, info) => {
        expect(err).to.not.exist()
        info.multiaddrs.add(addr)
        cb(null, info)
      })
    }, (err, infos) => {
      expect(err).to.not.exist()
      peerInfos = infos
      done()
    })
  })

  afterEach(done => {
    parallel([
      cb => querier ? querier.stop(cb) : cb(),
      cb => mdns ? mdns.destroy(cb) : cb()
    ], err => {
      querier = mdns = null
      done(err)
    })
  })

  it('should start and stop', done => {
    const querier = new Querier(peerInfos[0].id)

    querier.start(err => {
      expect(err).to.not.exist()
      querier.stop(err => {
        expect(err).to.not.exist()
        done()
      })
    })
  })

  it('should query on interval', done => {
    querier = new Querier(peerInfos[0].id, { queryPeriod: 0, queryInterval: 10 })
    mdns = MDNS()

    let queryCount = 0

    mdns.on('query', event => {
      const questions = event.questions || []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      queryCount++
    })

    querier.start(err => expect(err).to.not.exist())

    setTimeout(() => {
      // Should have queried at least twice by now!
      expect(queryCount >= 2).to.be.true()
      done()
    }, 100)
  })

  it('should not emit peer for responses with non matching service tags', done => {
    ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`
      const bogusServiceTagLocal = '_ifps-discovery._udp'

      return [{
        name: bogusServiceTagLocal,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }]
    }, done)
  })

  it('should not emit peer for responses with missing TXT record', done => {
    ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }]
    }, done)
  })

  it('should not emit peer for responses with missing peer ID in TXT record', done => {
    ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }, {
        name: peerServiceTagLocal,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: [] // undefined peer ID
      }]
    }, done)
  })

  it('should not emit peer for responses to self', done => {
    ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }, {
        name: peerServiceTagLocal,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: peerInfos[0].id.toB58String()
      }]
    }, done)
  })

  // TODO: unskip when https://github.com/libp2p/js-peer-id/issues/83 is resolved
  it.skip('should not emit peer for responses with invalid peer ID in TXT record', done => {
    ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }, {
        name: peerServiceTagLocal,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: '🤪'
      }]
    }, done)
  })

  it('should not emit peer for responses with missing SRV record', done => {
    ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }, {
        name: peerServiceTagLocal,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: peerInfos[1].id.toB58String()
      }]
    }, done)
  })

  it('should emit peer for responses even if no multiaddrs', done => {
    ensurePeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }, {
        name: peerServiceTagLocal,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: peerInfos[1].id.toB58String()
      }, {
        name: peerServiceTagLocal,
        type: 'SRV',
        class: 'IN',
        ttl: 120,
        data: {
          priority: 10,
          weight: 1,
          port: parseInt(peerAddrs[1].split().pop()),
          target: OS.hostname()
        }
      }]
    }, done)
  })

  it('should emit peer for responses with valid multiaddrs', done => {
    ensurePeer(event => {
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }, {
        name: peerServiceTagLocal,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: peerInfos[1].id.toB58String()
      }, {
        name: peerServiceTagLocal,
        type: 'SRV',
        class: 'IN',
        ttl: 120,
        data: {
          priority: 10,
          weight: 1,
          port: parseInt(peerAddrs[1].split().pop()),
          target: OS.hostname()
        }
      }, {
        name: OS.hostname(),
        type: peerAddrs[1].startsWith('/ip4') ? 'A' : 'AAAA',
        class: 'IN',
        ttl: 120,
        data: peerAddrs[1].split('/')[2]
      }]
    }, done)
  })

  /**
   * Ensure peerInfos[1] are emitted from `querier`
   * @param {Function} getResponse Given a query, construct a response to test the querier
   * @param {Function} callback Callback called when test finishes
   */
  function ensurePeer (getResponse, callback) {
    querier = new Querier(peerInfos[0].id)
    mdns = MDNS()

    mdns.on('query', (event, info) => {
      const questions = event.questions || []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      mdns.respond(getResponse(event, info), info)
    })

    let peerInfo

    querier.on('peer', info => {
      // Ignore non-test peers
      if (!info.id.isEqual(peerInfos[1].id)) return
      peerInfo = info
    })

    querier.start(err => {
      if (err) return callback(err)
      setTimeout(() => {
        callback(peerInfo ? null : new Error('Missing peer'))
      }, 100)
    })
  }

  /**
   * Ensure none of peerInfos are emitted from `querier`
   * @param {Function} getResponse Given a query, construct a response to test the querier
   * @param {Function} callback Callback called when test finishes
   */
  function ensureNoPeer (getResponse, callback) {
    querier = new Querier(peerInfos[0].id)
    mdns = MDNS()

    mdns.on('query', (event, info) => {
      const questions = event.questions || []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      mdns.respond(getResponse(event, info), info)
    })

    let peerInfo

    querier.on('peer', info => {
      // Ignore non-test peers
      if (!info.id.isEqual(peerInfos[0].id) && !info.id.isEqual(peerInfos[1].id)) return
      peerInfo = info
    })

    querier.start(err => {
      if (err) return callback(err)
      setTimeout(() => {
        if (!peerInfo) return callback()
        callback(Object.assign(new Error('Unexpected peer'), { peerInfo }))
      }, 100)
    })
  }
})
