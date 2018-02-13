'use strict'

const Peer = require('peer-info')
const os = require('os')
const debug = require('debug')
const log = debug('libp2p:mdns')
const Multiaddr = require('multiaddr')
const Id = require('peer-id')
const TCP = require('libp2p-tcp')
const tcp = new TCP()

module.exports = {

  queryLAN: function (mdns, serviceTag, interval) {
    const query = () => {
      log('query', serviceTag)
      mdns.query({
        questions: [{
          name: serviceTag,
          type: 'PTR'
        }]
      })
    }

    // Immediately start a query, then do it every interval.
    query()
    return setInterval(query, interval)
  },

  gotResponse: function (rsp, peerInfo, serviceTag, callback) {
    if (!rsp.answers) { return }

    const answers = {
      ptr: {},
      srv: {},
      txt: {},
      a: [],
      aaaa: []
    }

    rsp.answers.forEach((answer) => {
      switch (answer.type) {
        case 'PTR': answers.ptr = answer; break
        case 'SRV': answers.srv = answer; break
        case 'TXT': answers.txt = answer; break
        case 'A': answers.a.push(answer); break
        case 'AAAA': answers.aaaa.push(answer); break
        default: break
      }
    })

    if (answers.ptr.name !== serviceTag) {
      return
    }

    const b58Id = answers.txt.data[0].toString()
    const port = answers.srv.data.port
    const multiaddrs = []

    answers.a.forEach((a) => {
      multiaddrs.push(new Multiaddr('/ip4/' + a.data + '/tcp/' + port))
    })
    answers.aaaa.forEach((a) => {
      multiaddrs.push(new Multiaddr('/ip6/' + a.data + '/tcp/' + port))
    })

    if (peerInfo.id.toB58String() === b58Id) {
      return // replied to myself, ignore
    }

    log('peer found -', b58Id)

    const peerId = Id.createFromB58String(b58Id)

    Peer.create(peerId, (err, peerFound) => {
      if (err) {
        return log('Error creating PeerInfo from new found peer', err)
      }

      multiaddrs.forEach((addr) => peerFound.multiaddrs.add(addr))

      callback(null, peerFound)
    })
  },

  gotQuery: function (qry, mdns, peerInfo, serviceTag, broadcast) {
    if (!broadcast) { return }

    const multiaddrs = tcp.filter(peerInfo.multiaddrs.toArray())
    // Only announce TCP for now
    if (multiaddrs.length === 0) { return }

    if (qry.questions[0] && qry.questions[0].name === serviceTag) {
      const answers = []

      answers.push({
        name: serviceTag,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerInfo.id.toB58String() + '.' + serviceTag
      })

      // Only announce TCP multiaddrs for now
      const port = multiaddrs[0].toString().split('/')[4]

      answers.push({
        name: peerInfo.id.toB58String() + '.' + serviceTag,
        type: 'SRV',
        class: 'IN',
        ttl: 120,
        data: {
          priority: 10,
          weight: 1,
          port: port,
          target: os.hostname()
        }
      })

      answers.push({
        name: peerInfo.id.toB58String() + '.' + serviceTag,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: peerInfo.id.toB58String()
      })

      multiaddrs.forEach((ma) => {
        if (ma.protoNames()[0] === 'ip4') {
          answers.push({
            name: os.hostname(),
            type: 'A',
            class: 'IN',
            ttl: 120,
            data: ma.toString().split('/')[2]
          })
          return
        }
        if (ma.protoNames()[0] === 'ip6') {
          answers.push({
            name: os.hostname(),
            type: 'AAAA',
            class: 'IN',
            ttl: 120,
            data: ma.toString().split('/')[2]
          })
        }
      })

      log('responding to query')
      mdns.respond(answers)
    }
  }
}
