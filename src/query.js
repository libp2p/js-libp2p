'use strict'

const os = require('os')
const debug = require('debug')
const log = debug('libp2p:mdns')
log.error = debug('libp2p:mdns:error')
const { Multiaddr } = require('multiaddr')
const Id = require('peer-id')

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

  gotResponse: function (rsp, localPeerId, serviceTag) {
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
      const ma = new Multiaddr('/ip4/' + a.data + '/tcp/' + port)

      if (!multiaddrs.some((m) => m.equals(ma))) {
        multiaddrs.push(ma)
      }
    })

    answers.aaaa.forEach((a) => {
      const ma = new Multiaddr('/ip6/' + a.data + '/tcp/' + port)

      if (!multiaddrs.some((m) => m.equals(ma))) {
        multiaddrs.push(ma)
      }
    })

    if (localPeerId.toB58String() === b58Id) {
      return // replied to myself, ignore
    }

    log('peer found -', b58Id)

    return {
      id: Id.createFromB58String(b58Id),
      multiaddrs
    }
  },

  gotQuery: function (qry, mdns, peerId, multiaddrs, serviceTag, broadcast) {
    if (!broadcast) { return }

    const addresses = multiaddrs.reduce((acc, addr) => {
      if (addr.isThinWaistAddress()) {
        acc.push(addr.toOptions())
      }
      return acc
    }, [])

    // Only announce TCP for now
    if (addresses.length === 0) { return }

    if (qry.questions[0] && qry.questions[0].name === serviceTag) {
      const answers = []

      answers.push({
        name: serviceTag,
        type: 'PTR',
        class: 'IN',
        ttl: 120,
        data: peerId.toB58String() + '.' + serviceTag
      })

      // Only announce TCP multiaddrs for now
      const port = addresses[0].port

      answers.push({
        name: peerId.toB58String() + '.' + serviceTag,
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
        name: peerId.toB58String() + '.' + serviceTag,
        type: 'TXT',
        class: 'IN',
        ttl: 120,
        data: peerId.toB58String()
      })

      addresses.forEach((addr) => {
        if ([4, 6].includes(addr.family)) {
          answers.push({
            name: os.hostname(),
            type: addr.family === 4 ? 'A' : 'AAAA',
            class: 'IN',
            ttl: 120,
            data: addr.host
          })
        }
      })

      log('responding to query')
      mdns.respond(answers)
    }
  }
}
