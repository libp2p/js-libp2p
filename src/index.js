'use strict'

const multicastDNS = require('multicast-dns')
const Id = require('peer-id')
const Peer = require('peer-info')
const Multiaddr = require('multiaddr')
const debug = require('debug')
const log = debug('libp2p:mdns')
const EventEmitter = require('events').EventEmitter
const os = require('os')
const TCP = require('libp2p-tcp')
const tcp = new TCP()

class MulticastDNS extends EventEmitter {
  constructor (peerInfo, options) {
    super()

    this.broadcast = options.broadcast !== false
    this.interval = options.interval || (1e3 * 10)
    this.serviceTag = options.serviceTag || '_ipfs-discovery._udp'
    this.port = options.port || 5353
    this.peerInfo = peerInfo
  }

  start (cb) {
    const self = this
    const mdns = multicastDNS({ port: this.port })

    this.mdns = mdns

    queryLAN()

    mdns.on('response', gotResponse)
    mdns.on('query', gotQuery)

    cb()

    function queryLAN () {
      setInterval(() => {
        mdns.query({
          questions: [{
            name: self.serviceTag,
            type: 'PTR'
          }]
        })
      }, self.interval)
    }

    function gotResponse (rsp) {
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

      if (answers.ptr.name !== self.serviceTag) {
        return
      }

      const b58Id = answers.txt.data.toString()
      const port = answers.srv.data.port
      const multiaddrs = []

      answers.a.forEach((a) => {
        multiaddrs.push(new Multiaddr('/ip4/' + a.data + '/tcp/' + port))
      })

      // TODO Create multiaddrs from AAAA (IPv6) records as well

      if (self.peerInfo.id.toB58String() === b58Id) {
        return // replied to myself, ignore
      }

      log('peer found -', b58Id)

      const peerId = Id.createFromB58String(b58Id)

      Peer.create(peerId, (err, peerFound) => {
        if (err) {
          return log('Error creating PeerInfo from new found peer', err)
        }

        multiaddrs.forEach((addr) => {
          peerFound.multiaddr.add(addr)
        })

        self.emit('peer', peerFound)
      })
    }

    function gotQuery (qry) {
      if (!self.broadcast) { return }

      if (qry.questions[0] && qry.questions[0].name === self.serviceTag) {
        const answers = []

        answers.push({
          name: self.serviceTag,
          type: 'PTR',
          class: 1,
          ttl: 120,
          data: self.peerInfo.id.toB58String() + '.' + self.serviceTag
        })

        // Only announce TCP multiaddrs for now
        const multiaddrs = tcp.filter(self.peerInfo.multiaddrs)
        const port = multiaddrs[0].toString().split('/')[4]

        answers.push({
          name: self.peerInfo.id.toB58String() + '.' + self.serviceTag,
          type: 'SRV',
          class: 1,
          ttl: 120,
          data: {
            priority: 10,
            weight: 1,
            port: port,
            target: os.hostname()
          }
        })

        answers.push({
          name: self.peerInfo.id.toB58String() + '.' + self.serviceTag,
          type: 'TXT',
          class: 1,
          ttl: 120,
          data: self.peerInfo.id.toB58String()
        })

        multiaddrs.forEach((ma) => {
          if (ma.protoNames()[0] === 'ip4') {
            answers.push({
              name: os.hostname(),
              type: 'A',
              class: 1,
              ttl: 120,
              data: ma.toString().split('/')[2]
            })
            return
          }
          if (ma.protoNames()[0] === 'ip6') {
            answers.push({
              name: os.hostname(),
              type: 'AAAA',
              class: 1,
              ttl: 120,
              data: ma.toString().split('/')[2]
            })
            return
          }
        })

        mdns.respond(answers)
      }
    }
  }

  stop (cb) {
    this.mdns.destroy(cb)
  }
}

module.exports = MulticastDNS

/* for reference

   [ { name: 'discovery.ipfs.io.local',
       type: 'PTR',
       class: 1,
       ttl: 120,
       data: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local' },

     { name: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local',
       type: 'SRV',
       class: 1,
       ttl: 120,
       data: { priority: 10, weight: 1, port: 4001, target: 'lorien.local' } },

     { name: 'lorien.local',
       type: 'A',
       class: 1,
       ttl: 120,
       data: '127.0.0.1' },

     { name: 'lorien.local',
       type: 'A',
       class: 1,
       ttl: 120,
       data: '127.94.0.1' },

     { name: 'lorien.local',
       type: 'A',
       class: 1,
       ttl: 120,
       data: '172.16.38.224' },

     { name: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC.discovery.ipfs.io.local',
       type: 'TXT',
       class: 1,
       ttl: 120,
       data: 'QmbBHw1Xx9pUpAbrVZUKTPL5Rsph5Q9GQhRvcWVBPFgGtC' } ],

*/
