/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerInfo = require('peer-info')
const MDNS = require('multicast-dns')
const delay = require('delay')
const pDefer = require('p-defer')

const Responder = require('../../src/compat/responder')
const { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } = require('../../src/compat/constants')

describe('Responder', () => {
  let responder, mdns
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
      responder && responder.stop(),
      mdns && mdns.destroy()
    ])
  })

  it('should start and stop', async () => {
    const responder = new Responder(peerInfos[0])

    await responder.start()
    await responder.stop()
  })

  it('should not respond to a query if no TCP addresses', async () => {
    const peerInfo = await PeerInfo.create()
    responder = new Responder(peerInfo)
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    await responder.start()

    let response

    mdns.on('response', event => {
      if (isResponseFrom(event, peerInfo)) {
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
    responder = new Responder(peerInfos[0])
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    await responder.start()

    let response

    mdns.on('response', event => {
      if (isResponseFrom(event, peerInfos[0])) {
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
    responder = new Responder(peerInfos[0])
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    await responder.start()
    const defer = pDefer()

    mdns.on('response', event => {
      if (!isResponseFrom(event, peerInfos[0])) return

      const srvRecord = event.answers.find(a => a.type === 'SRV')
      if (!srvRecord) return defer.reject(new Error('Missing SRV record'))

      const { port } = srvRecord.data || {}
      const protos = { A: 'ip4', AAAA: 'ip6' }

      const addrs = event.answers
        .filter(a => ['A', 'AAAA'].includes(a.type))
        .map(a => `/${protos[a.type]}/${a.data}/tcp/${port}`)

      if (!addrs.includes(peerAddrs[0])) {
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

function isResponseFrom (res, fromPeerInfo) {
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
  if (fromPeerInfo.id.toB58String() !== peerIdStr) return false

  return true
}
