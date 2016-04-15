'use strict'

var multicastDNS = require('multicast-dns')
var Id = require('peer-id')
var Peer = require('peer-info')
var Multiaddr = require('multiaddr')
var log = require('ipfs-logger').group('discovery ipfs-mdns')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var os = require('os')

exports = module.exports = Sonar

util.inherits(Sonar, EventEmitter)

function Sonar (peerSelf, options, swarmSelf) {
  var self = this

  if (!(self instanceof Sonar)) {
    throw new Error('Sonar must be instantiated with new')
  }

  // option arguments

  self.broadcast = options && options.broadcast ? options.broadcast : true
  // self.query = options.query || true // TODO implement a switch
  self.interval = options && options.interval ? options.interval : (1e3 * 5)
  self.serviceTag = options && options.serviceTag ? options.serviceTag : 'discovery.ipfs.io.local'
  self.verify = options && options.verify ? options.verify : false

  if (self.verify) {
    if (!swarmSelf) {
      throw new Error('If verify is selected, the third argument must be a libp2p-swarm')
    }
  }

  self.mdns = multicastDNS({ port: options && options.port ? options.port : 5353 })

  // query the network

  self.mdns.on('response', gotResponse)
  queryLAN()

  function queryLAN () {
    setInterval(function () {
      self.mdns.query({
        questions: [{
          name: self.serviceTag,
          type: 'PTR'
        }]
      })
    }, self.interval)
  }

  function gotResponse (rsp) {
    if (!rsp.answers) {
      return
    }

    var answers = {
      ptr: {},
      srv: {},
      txt: {},
      a: [],
      aaaa: []
    }

    rsp.answers.forEach(function (answer) {
      switch (answer.type) {
        case 'PTR': answers.ptr = answer
          break
        case 'SRV': answers.srv = answer
          break
        case 'TXT': answers.txt = answer
          break
        case 'A': answers.a.push(answer)
          break
        case 'AAAA': answers.aaaa.push(answer)
          break
        default:
          break
      }
    })

    if (answers.ptr.name !== self.serviceTag) {
      return
    }

    var b58Id = answers.txt.data
    var port = answers.srv.data.port
    var multiaddrs = []

    answers.a.forEach(function (a) {
      multiaddrs.push(new Multiaddr('/ip4/' + a.data + '/tcp/' + port))
    })

    // TODO(daviddias) Create multiaddrs from AAAA records as well

    if (peerSelf.id.toB58String() === b58Id) {
      return // replied to myself, ignore
    }

    log.info('peer found -', b58Id)

    var peerId = Id.createFromB58String(b58Id)

    verify(new Peer(peerId, multiaddrs))
  }

  function verify (peer) {
    if (self.verify) {
      swarmSelf.dial(peer, {}, function (err) {
        if (err) {
          return log.warn('Was not able to connect to new found peer', err)
        }
        self.emit('peer', peer)
      })
    } else {
      self.emit('peer', peer)
    }
  }

  // answer to queries

  self.mdns.on('query', gotQuery)

  function gotQuery (qry) {
    if (!self.broadcast) {
      return
    }

    if (qry.questions[0] && qry.questions[0].name === self.serviceTag) {
      var answers = []

      answers.push({
        name: self.serviceTag,
        type: 'PTR',
        class: 1,
        ttl: 120,
        data: peerSelf.id.toB58String() + '.' + self.serviceTag
      })

      var port = peerSelf.multiaddrs[0].toString().split('/')[4]
      // console.log(port)

      answers.push({
        name: peerSelf.id.toB58String() + '.' + self.serviceTag,
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
        name: peerSelf.id.toB58String() + '.' + self.serviceTag,
        type: 'TXT',
        class: 1,
        ttl: 120,
        data: peerSelf.id.toB58String()
      })

      peerSelf.multiaddrs.forEach(function (mh) {
        if (mh.protoNames()[0] === 'ip4') {
          answers.push({
            name: os.hostname(),
            type: 'A',
            class: 1,
            ttl: 120,
            data: mh.toString().split('/')[2]
          })
          return
        }
        if (mh.protoNames()[0] === 'ip6') {
          answers.push({
            name: os.hostname(),
            type: 'AAAA',
            class: 1,
            ttl: 120,
            data: mh.toString().split('/')[2]
          })
          return
        }
      })
      self.mdns.respond(answers)
    }
  }
}

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
