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

const Responder = require('../../src/compat/responder')
const { SERVICE_TAG_LOCAL, MULTICAST_IP, MULTICAST_PORT } = require('../../src/compat/constants')

describe('Responder', () => {
  let responder, mdns
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
      cb => responder ? responder.stop(cb) : cb(),
      cb => mdns ? mdns.destroy(cb) : cb()
    ], err => {
      responder = mdns = null
      done(err)
    })
  })

  it('should start and stop', done => {
    const responder = new Responder(peerInfos[0])

    responder.start(err => {
      expect(err).to.not.exist()
      responder.stop(err => {
        expect(err).to.not.exist()
        done()
      })
    })
  })

  it('should not respond to a query if no TCP addresses', done => {
    PeerInfo.create((err, peerInfo) => {
      expect(err).to.not.exist()

      responder = new Responder(peerInfo)
      mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

      responder.start(err => {
        expect(err).to.not.exist()

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

        setTimeout(() => {
          done(response ? new Error('Unexpected repsonse') : null)
        }, 100)
      })
    })
  })

  it('should not respond to a query with non matching service tag', done => {
    responder = new Responder(peerInfos[0])
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    responder.start(err => {
      expect(err).to.not.exist()

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

      setTimeout(() => {
        done(response ? new Error('Unexpected repsonse') : null)
      }, 100)
    })
  })

  it('should respond correctly', done => {
    responder = new Responder(peerInfos[0])
    mdns = MDNS({ multicast: false, interface: '0.0.0.0', port: 0 })

    responder.start(err => {
      expect(err).to.not.exist()

      mdns.on('response', event => {
        if (!isResponseFrom(event, peerInfos[0])) return

        const srvRecord = event.answers.find(a => a.type === 'SRV')
        if (!srvRecord) return done(new Error('Missing SRV record'))

        const { port } = srvRecord.data || {}
        const protos = { A: 'ip4', AAAA: 'ip6' }

        const addrs = event.answers
          .filter(a => ['A', 'AAAA'].includes(a.type))
          .map(a => `/${protos[a.type]}/${a.data}/tcp/${port}`)

        if (!addrs.includes(peerAddrs[0])) {
          return done(new Error('Missing peer address in response: ' + peerAddrs[0]))
        }

        done()
      })

      mdns.query({
        id: 1, // id > 0 for unicast response
        questions: [{ name: SERVICE_TAG_LOCAL, type: 'PTR', class: 'IN' }]
      }, null, {
        address: MULTICAST_IP,
        port: MULTICAST_PORT
      })
    })
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
