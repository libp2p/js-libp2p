/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const MDNS = require('multicast-dns')
const delay = require('delay')
const pDefer = require('p-defer')

const Responder = require('../../src/compat/responder')
const { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } = require('../../src/compat/constants')

describe('Responder', () => {
  let responder, mdns
  const peerAddrs = [
    new Multiaddr('/ip4/127.0.0.1/tcp/20001'),
    new Multiaddr('/ip4/127.0.0.1/tcp/20002')
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
      responder && responder.stop(),
      mdns && mdns.destroy()
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
    const peerId = await PeerId.create()
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
    }, null, {
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
    }, null, {
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
      if (!isResponseFrom(event, peerIds[0])) return

      const srvRecord = event.answers.find(a => a.type === 'SRV')
      if (!srvRecord) return defer.reject(new Error('Missing SRV record'))

      const { port } = srvRecord.data || {}
      const protos = { A: 'ip4', AAAA: 'ip6' }

      const addrs = event.answers
        .filter(a => ['A', 'AAAA'].includes(a.type))
        .map(a => `/${protos[a.type]}/${a.data}/tcp/${port}`)

      if (!addrs.includes(peerAddrs[0].toString())) {
        return defer.reject(new Error('Missing peer address in response: ' + peerAddrs[0]))
      }

      defer.resolve()
    })

    mdns.query({
      id: 1, // id > 0 for unicast response
      questions: [{ name: SERVICE_TAG_LOCAL, type: 'PTR', class: 'IN' }]
    }, null, {
      address: MULTICAST_IP,
      port: MULTICAST_PORT
    })

    await defer.promise
  })
})

function isResponseFrom (res, fromPeerId) {
  const answers = res.answers || []
  const ptrRecord = answers.find(a => a.type === 'PTR' && a.name === SERVICE_TAG_LOCAL)
  if (!ptrRecord) return false // Ignore irrelevant

  const txtRecord = answers.find(a => a.type === 'TXT')
  if (!txtRecord) return false // Ignore missing TXT record

  let peerIdStr
  try {
    peerIdStr = txtRecord.data[0].toString()
  } catch (err) {
    return false // Ignore invalid peer ID data
  }

  // Ignore response from someone else
  if (fromPeerId.toB58String() !== peerIdStr) return false

  return true
}
