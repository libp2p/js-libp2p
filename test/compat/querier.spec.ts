/* eslint-env mocha */
import { expect } from 'aegir/utils/chai.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import MDNS, { QueryPacket } from 'multicast-dns'
import OS from 'os'
import delay from 'delay'
import { Querier } from '../../src/compat/querier.js'
import { SERVICE_TAG_LOCAL } from '../../src/compat/constants.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { RemoteInfo } from 'dgram'
import type { Answer } from 'dns-packet'
import { Components } from '@libp2p/interfaces/components'

describe('Querier', () => {
  let querier: Querier
  let mdns: MDNS.MulticastDNS
  const peerAddrs = [
    '/ip4/127.0.0.1/tcp/20001',
    '/ip4/127.0.0.1/tcp/20002'
  ]
  let peerIds: PeerId[]

  before(async () => {
    peerIds = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId()
    ])
  })

  afterEach(async () => {
    return await Promise.all([
      querier?.stop(),
      mdns?.destroy()
    ])
  })

  it('should start and stop', async () => {
    querier = new Querier()
    querier.init(new Components({ peerId: peerIds[0] }))

    await querier.start()
    await querier.stop()
  })

  it('should query on interval', async () => {
    querier = new Querier({ queryPeriod: 0, queryInterval: 10 })
    querier.init(new Components({ peerId: peerIds[0] }))

    mdns = MDNS()

    let queryCount = 0

    mdns.on('query', event => {
      const questions = event.questions ?? []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      queryCount++
    })

    await querier.start()
    await delay(100)
    // Should have queried at least twice by now!
    expect(queryCount >= 2).to.be.true()
  })

  it('should not emit peer for responses with non matching service tags', async () => {
    return await ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`
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

  it('should not emit peer for responses with missing TXT record', async () => {
    return await ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

      return [{
        name: SERVICE_TAG_LOCAL,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerServiceTagLocal
      }]
    })
  })

  it('should not emit peer for responses with missing peer ID in TXT record', async () => {
    return await ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

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

  it('should not emit peer for responses to self', async () => {
    return await ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[0].toString()
      }]
    })
  })

  // TODO: unskip when https://github.com/libp2p/js-peer-id/issues/83 is resolved
  it('should not emit peer for responses with invalid peer ID in TXT record', async () => {
    return await ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

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

  it('should not emit peer for responses with missing SRV record', async () => {
    return await ensureNoPeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[1].toString()
      }]
    })
  })

  it('should emit peer for responses even if no multiaddrs', async () => {
    return await ensurePeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[1].toString()
      }, {
        name: peerServiceTagLocal,
        type: 'SRV',
        class: 'IN',
        ttl: 120,
        data: {
          priority: 10,
          weight: 1,
          port: parseInt(peerAddrs[1].split('').pop() ?? '0'),
          target: OS.hostname()
        }
      }]
    })
  })

  it('should emit peer for responses with valid multiaddrs', async () => {
    return await ensurePeer(event => {
      const peerServiceTagLocal = `${peerIds[1].toString()}.${SERVICE_TAG_LOCAL}`

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
        data: peerIds[1].toString()
      }, {
        name: peerServiceTagLocal,
        type: 'SRV',
        class: 'IN',
        ttl: 120,
        data: {
          priority: 10,
          weight: 1,
          port: parseInt(peerAddrs[1].split('').pop() ?? '0'),
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
  async function ensurePeer (getResponse: (event: QueryPacket, info: RemoteInfo) => Answer[]) {
    const querier = new Querier()
    querier.init(new Components({ peerId: peerIds[0] }))
    mdns = MDNS()

    mdns.on('query', (event, info) => {
      const questions = event.questions ?? []
      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) return
      mdns.respond(getResponse(event, info), info)
    })

    let peerId

    querier.addEventListener('peer', (evt) => {
      const { id } = evt.detail

      // Ignore non-test peers
      if (!peerIds[1].equals(id)) {
        return
      }
      peerId = id
    })

    await querier.start()
    await delay(100)
    await querier.stop()

    if (peerId == null) {
      throw new Error('Missing peer')
    }
  }

  /**
   * Ensure none of peerIds are emitted from `querier`
   *
   * @param {Function} getResponse - Given a query, construct a response to test the querier
   */
  async function ensureNoPeer (getResponse: (event: QueryPacket, info: RemoteInfo) => Answer[]) {
    const querier = new Querier()
    querier.init(new Components({ peerId: peerIds[0] }))
    mdns = MDNS()

    mdns.on('query', (event, info) => {
      const questions = event.questions ?? []

      if (!questions.some(q => q.name === SERVICE_TAG_LOCAL)) {
        return
      }

      mdns.respond(getResponse(event, info), info)
    })

    let peerId

    querier.addEventListener('peer', (evt) => {
      const { id } = evt.detail

      // Ignore non-test peers
      if (!peerIds[0].equals(id) && !peerIds[1].equals(id)) {
        return
      }

      peerId = id
    })

    await querier.start()
    await delay(100)
    await querier.stop()

    if (peerId == null) {
      return
    }

    throw Object.assign(new Error('Unexpected peer'), { peerId })
  }
})
