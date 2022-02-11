/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import MDNS from 'multicast-dns'
import delay from 'delay'
import pDefer from 'p-defer'
import { Responder } from '../../src/compat/responder.js'
import { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } from '../../src/compat/constants.js'
import { base58btc } from 'multiformats/bases/base58'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { ResponsePacket } from 'multicast-dns'

describe('Responder', () => {
  let responder: Responder
  let mdns: MDNS.MulticastDNS
  const peerAddrs = [
    new Multiaddr('/ip4/127.0.0.1/tcp/20001'),
    new Multiaddr('/ip4/127.0.0.1/tcp/20002')
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
      responder?.stop(),
      mdns?.destroy()
    ])
  })

  it('should start and stop', async () => {
    const responder = new Responder({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })

    await responder.start()
    await responder.stop()
  })

  it('should not respond to a query if no TCP addresses', async () => {
    const peerId = await createEd25519PeerId()
    responder = new Responder({
      peerId,
      multiaddrs: []
    })
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    await responder.start()

    let response

    mdns.on('response', event => {
      if (isResponseFrom(event, peerId)) {
        response = event
      }
    })

    mdns.query({
      id: 1, // id > 0 for unicast response
      questions: [{ name: SERVICE_TAG_LOCAL, type: 'PTR', class: 'IN' }]
    }, {
      address: MULTICAST_IP,
      port: MULTICAST_PORT
    })

    await delay(100)
    expect(response).to.not.exist()
  })

  it('should not respond to a query with non matching service tag', async () => {
    responder = new Responder({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    await responder.start()

    let response

    mdns.on('response', event => {
      if (isResponseFrom(event, peerIds[0])) {
        response = event
      }
    })

    const bogusServiceTagLocal = '_ifps-discovery._udp'

    mdns.query({
      id: 1, // id > 0 for unicast response
      questions: [{ name: bogusServiceTagLocal, type: 'PTR', class: 'IN' }]
    }, {
      address: MULTICAST_IP,
      port: MULTICAST_PORT
    })

    await delay(100)
    expect(response).to.not.exist()
  })

  it('should respond correctly', async () => {
    responder = new Responder({
      peerId: peerIds[0],
      multiaddrs: [peerAddrs[0]]
    })
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    await responder.start()
    const defer = pDefer()

    mdns.on('response', event => {
      if (!isResponseFrom(event, peerIds[0])) {
        return
      }

      const srvRecord = event.answers.find(a => a.type === 'SRV')
      if (srvRecord == null || srvRecord.type !== 'SRV') {
        return defer.reject(new Error('Missing SRV record'))
      }

      const { port } = srvRecord.data ?? {}
      const protos = { A: 'ip4', AAAA: 'ip6' }

      const addrs = event.answers
        .filter(a => ['A', 'AAAA'].includes(a.type))
        .map(a => {
          if (a.type !== 'A' && a.type !== 'AAAA') {
            throw new Error('Incorrect type')
          }

          return `/${protos[a.type]}/${a.data}/tcp/${port}`
        })

      if (!addrs.includes(peerAddrs[0].toString())) {
        return defer.reject(new Error(`Missing peer address in response: ${peerAddrs[0].toString()}`))
      }

      defer.resolve()
    })

    mdns.query({
      id: 1, // id > 0 for unicast response
      questions: [{ name: SERVICE_TAG_LOCAL, type: 'PTR', class: 'IN' }]
    }, {
      address: MULTICAST_IP,
      port: MULTICAST_PORT
    })

    await defer.promise
  })
})

function isResponseFrom (res: ResponsePacket, fromPeerId: PeerId) {
  const answers = res.answers ?? []
  const ptrRecord = answers.find(a => a.type === 'PTR' && a.name === SERVICE_TAG_LOCAL)
  if (ptrRecord == null) return false // Ignore irrelevant

  const txtRecord = answers.find(a => a.type === 'TXT')
  if ((txtRecord == null) || txtRecord.type !== 'TXT') {
    return false // Ignore missing TXT record
  }

  let peerIdStr
  try {
    peerIdStr = txtRecord.data[0].toString()
  } catch (err) {
    return false // Ignore invalid peer ID data
  }

  // Ignore response from someone else
  if (fromPeerId.toString(base58btc) !== peerIdStr) return false

  return true
}
