/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const PeerId = require('peer-id')
const MDNS = require('multicast-dns')
const OS = require('os')
const delay = require('delay')

const Querier = require('../../src/compat/querier')
const { SERVICE_TAG_LOCAL } = require('../../src/compat/constants')

describe('Querier', () => {
  let querier, mdns
  const peerAddrs = [
    '/ip4/127.0.0.1/tcp/20001',
    '/ip4/127.0.0.1/tcp/20002'
  ]
  let peerIds

  before(async () => {
    peerIds = await Promise.all([
      PeerId.create(),
      PeerId.create()
    ])
  })

  afterEach(() => {
    return Promise.all([
      querier && querier.stop(),
      mdns && mdns.destroy()
    ])
  })

  it('should start and stop', async () => {
    const querier = new Querier({ peerId: peerIds[0] })

    await querier.start()
    await querier.stop()
  })

  it('should query on interval', async () => {
    querier = new Querier({ peerId: peerIds[0], queryPeriod: 0, queryInterval: 10 })
    mdns = MDNS()

    let queryCount = 0

    mdns.on('query', event => {
      const questions = event.questions || []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      queryCount++
    })

    await querier.start()
    await delay(100)
    // Should have queried at least twice by now!
    expect(queryCount >= 2).to.be.true()
  })

  it('should not emit peer for responses with non matching service tags', () => {
    return ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`
      const bogusServiceTagLocal = '_ifps-discovery._udp'

      return [{
        name: bogusServiceTagLocal,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }]
    })
  })

  it('should not emit peer for responses with missing TXT record', () => {
    return ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }]
    })
  })

  it('should not emit peer for responses with missing peer ID in TXT record', () => {
    return ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

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
    })
  })

  it('should not emit peer for responses to self', () => {
    return ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[0].toB58String()
      }]
    })
  })

  // TODO: unskip when https://github.com/libp2p/js-peer-id/issues/83 is resolved
  it.skip('should not emit peer for responses with invalid peer ID in TXT record', () => {
    return ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

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
    })
  })

  it('should not emit peer for responses with missing SRV record', () => {
    return ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[1].toB58String()
      }]
    })
  })

  it('should emit peer for responses even if no multiaddrs', () => {
    return ensurePeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[1].toB58String()
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
    })
  })

  it('should emit peer for responses with valid multiaddrs', () => {
    return ensurePeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toB58String()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[1].toB58String()
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
    })
  })

  /**
   * Ensure peerIds[1] are emitted from `querier`
   *
   * @param {Function} getResponse - Given a query, construct a response to test the querier
   */
  async function ensurePeer (getResponse) {
    querier = new Querier({ peerId: peerIds[0] })
    mdns = MDNS()

    mdns.on('query', (event, info) => {
      const questions = event.questions || []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      mdns.respond(getResponse(event, info), info)
    })

    let peerId

    querier.on('peer', ({ id }) => {
      // Ignore non-test peers
      if (!id.isEqual(peerIds[1])) return
      peerId = id
    })

    await querier.start()
    await delay(100)
    if (!peerId) throw new Error('Missing peer')
  }

  /**
   * Ensure none of peerIds are emitted from `querier`
   *
   * @param {Function} getResponse - Given a query, construct a response to test the querier
   */
  async function ensureNoPeer (getResponse) {
    querier = new Querier({ peerId: peerIds[0] })
    mdns = MDNS()

    mdns.on('query', (event, info) => {
      const questions = event.questions || []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      mdns.respond(getResponse(event, info), info)
    })

    let peerId

    querier.on('peer', ({ id }) => {
      // Ignore non-test peers
      if (!id.isEqual(peerIds[0]) && !id.isEqual(peerIds[1])) return
      peerId = id
    })

    await querier.start()
    await delay(100)

    if (!peerId) return
    throw Object.assign(new Error('Unexpected peer'), { peerId })
  }
})
