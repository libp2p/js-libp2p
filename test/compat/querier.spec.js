/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerInfo = require('peer-info')
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
  let peerInfos

  before(async () => {
    peerInfos = await Promise.all([
      PeerInfo.create(),
      PeerInfo.create()
    ])

    peerInfos.forEach((peer, index) => {
      peer.multiaddrs.add(peerAddrs[index])
    })
  })

  afterEach(() => {
    return Promise.all([
      querier && querier.stop(),
      mdns && mdns.destroy()
    ])
  })

  it('should start and stop', async () => {
    const querier = new Querier(peerInfos[0].id)

    await querier.start()
    await querier.stop()
  })

  it('should query on interval', async () => {
    querier = new Querier(peerInfos[0].id, { queryPeriod: 0, queryInterval: 10 })
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
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`
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
      const peerServiceTagLocal = `${peerInfos[1].id.toB58String()}.${SERVICE_TAG_LOCAL}`

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
    })
  })

  it('should not emit peer for responses to self', () => {
    return ensureNoPeer(event => {
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
    })
  })

  // TODO: unskip when https://github.com/libp2p/js-peer-id/issues/83 is resolved
  it.skip('should not emit peer for responses with invalid peer ID in TXT record', () => {
    return ensureNoPeer(event => {
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
    })
  })

  it('should not emit peer for responses with missing SRV record', () => {
    return ensureNoPeer(event => {
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
    })
  })

  it('should emit peer for responses even if no multiaddrs', () => {
    return ensurePeer(event => {
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
    })
  })

  it('should emit peer for responses with valid multiaddrs', () => {
    return ensurePeer(event => {
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
    })
  })

  /**
   * Ensure peerInfos[1] are emitted from `querier`
   * @param {Function} getResponse Given a query, construct a response to test the querier
   */
  async function ensurePeer (getResponse) {
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

    await querier.start()
    await delay(100)
    if (!peerInfo) throw new Error('Missing peer')
  }

  /**
   * Ensure none of peerInfos are emitted from `querier`
   * @param {Function} getResponse Given a query, construct a response to test the querier
   */
  async function ensureNoPeer (getResponse) {
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

    await querier.start()
    await delay(100)

    if (!peerInfo) return
    throw Object.assign(new Error('Unexpected peer'), { peerInfo })
  }
})
