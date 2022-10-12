/* eslint-env mocha */

import { expect } from 'aegir/chai'
import type { Multiaddr } from '@multiformats/multiaddr'
import { multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import mDNS from 'multicast-dns'
import delay from 'delay'
import pDefer from 'p-defer'
import { Responder } from '../../src/compat/responder.js'
import { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } from '../../src/compat/constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { ResponsePacket } from 'multicast-dns'
import { stubInterface } from 'ts-sinon'
import { findPeerInfoInAnswers } from '../../src/compat/utils.js'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { MulticastDNSComponents } from '../../src/index.js'

describe('Responder', () => {
  let responder: Responder
  let mdns: mDNS.MulticastDNS
  let peerIds: PeerId[]
  let components: MulticastDNSComponents
  let multiadddrs: Multiaddr[]

  beforeEach(async () => {
    peerIds = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId()
    ])

    multiadddrs = [
      multiaddr(`/ip4/127.0.0.1/tcp/20001/p2p/${peerIds[0].toString()}`),
      multiaddr(`/ip4/127.0.0.1/tcp/20002/p2p/${peerIds[0].toString()}`)
    ]

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns(multiadddrs)

    components = { peerId: peerIds[0], addressManager }
  })

  afterEach(async () => {
    return await Promise.all([
      responder?.stop(),
      mdns?.destroy()
    ])
  })

  it('should start and stop', async () => {
    responder = new Responder(components)

    await responder.start()
    await responder.stop()
  })

  it('should not respond to a query if no TCP addresses', async () => {
    const peerId = await createEd25519PeerId()
    responder = new Responder(components)
    components.addressManager.getAddresses = () => []
    mdns = mDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

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
    responder = new Responder(components)
    mdns = mDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

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
    responder = new Responder(components)
    await responder.start()
    const defer = pDefer<PeerInfo>()

    mdns = mDNS({ multicast: false, interface: '0.0.0.0', port: 0 })
    mdns.on('response', event => {
      if (!isResponseFrom(event, peerIds[0])) {
        return
      }

      const peerInfo = findPeerInfoInAnswers(event.answers, peerIds[1])

      if (peerInfo == null) {
        return defer.reject(new Error('Could not read PeerData from mDNS query response'))
      }

      defer.resolve(peerInfo)
    })

    mdns.query({
      id: 1, // id > 0 for unicast response
      questions: [{ name: SERVICE_TAG_LOCAL, type: 'PTR', class: 'IN' }]
    }, {
      address: MULTICAST_IP,
      port: MULTICAST_PORT
    })

    const peerData = await defer.promise

    expect(peerData.multiaddrs.map(ma => ma.toString())).to.include(multiadddrs[0].toString())
    expect(peerData.multiaddrs.map(ma => ma.toString())).to.include(multiadddrs[1].toString())
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
  if (fromPeerId.toString() !== peerIdStr) {
    return false
  }

  return true
}
