'use strict'

const each = require('async/each')
const eachSeries = require('async/eachSeries')
const map = require('async/map')
const parallel = require('async/parallel')
const setImmediate = require('async/setImmediate')
const series = require('async/series')
const _ = require('lodash')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const Node = require('./create-libp2p-node').bundle
const os = require('os')
const Repo = require('ipfs-repo')
const EventEmitter = require('events')

const Bitswap = require('../../src')

/*
 * Create a mock libp2p node
 */
exports.mockLibp2pNode = () => {
  const peerInfo = new PeerInfo(PeerId.createFromHexString('122019318b6e5e0cf93a2314bf01269a2cc23cd3dcd452d742cdb9379d8646f6e4a9'))

  return Object.assign(new EventEmitter(), {
    peerInfo: peerInfo,
    handle () {},
    unhandle () {},
    contentRouting: {
      provide: (cid, callback) => callback(),
      findProviders: (cid, timeout, callback) => callback(null, [])
    },
    on () {},
    dial (peer, protocol, callback) {
      setImmediate(() => callback())
    },
    swarm: {
      muxedConns: {},
      setMaxListeners () {}
    },
    peerBook: new PeerBook()
  })
}

/*
 * Create a mock network instance
 */
exports.mockNetwork = (calls, done) => {
  done = done || (() => {})

  const connects = []
  const messages = []
  let i = 0

  const finish = () => {
    if (++i === calls) {
      done({ connects: connects, messages: messages })
    }
  }

  return {
    connectTo (p, cb) {
      setImmediate(() => {
        connects.push(p)
        cb()
      })
    },
    sendMessage (p, msg, cb) {
      setImmediate(() => {
        messages.push([p, msg])
        cb()
        finish()
      })
    },
    start (callback) {
      setImmediate(() => callback())
    },
    findAndConnect (cid, callback) {
      setImmediate(() => callback())
    },
    provide (cid, callback) {
      setImmediate(() => callback())
    }
  }
}

/*
 * Create a mock test network
 */
exports.createMockTestNet = (repo, count, cb) => {
  parallel([
    (cb) => map(_.range(count), (i, cb) => repo.create(`repo-${i}`), cb),
    (cb) => map(_.range(count), (i, cb) => PeerId.create(cb), cb)
  ], (err, results) => {
    if (err) {
      return cb(err)
    }
    const stores = results[0].map((r) => r.blockstore)
    const ids = results[1]

    const hexIds = ids.map((id) => id.toHexString())
    const bitswaps = _.range(count).map((i) => new Bitswap({}, stores[i]))
    const networks = _.range(count).map((i) => {
      return {
        connectTo (id, cb) {
          const done = (err) => setImmediate(() => cb(err))
          if (!_.includes(hexIds, id.toHexString())) {
            return done(new Error('unkown peer'))
          }
          done()
        },
        sendMessage (id, msg, cb) {
          const j = _.findIndex(hexIds, (el) => el === id.toHexString())
          bitswaps[j]._receiveMessage(ids[i], msg, cb)
        },
        start () {
        }
      }
    })

    _.range(count).forEach((i) => {
      exports.applyNetwork(bitswaps[i], networks[i])
      bitswaps[i].start()
    })

    cb(null, {
      ids,
      stores,
      bitswaps,
      networks
    })
  })
}

exports.applyNetwork = (bs, n) => {
  bs.network = n
  bs.wm.network = n
  bs.engine.network = n
}

exports.genBitswapNetwork = (n, callback) => {
  const netArray = [] // bitswap, peerBook, libp2p, peerInfo, repo
  const basePort = 12000

  // create PeerInfo and libp2p.Node for each
  map(_.range(n), (i, cb) => PeerInfo.create(cb), (err, peers) => {
    if (err) {
      return callback(err)
    }

    peers.forEach((p, i) => {
      const ma1 = '/ip4/127.0.0.1/tcp/' + (basePort + i) +
        '/ipfs/' + p.id.toB58String()
      p.multiaddrs.add(ma1)

      const l = new Node(p)
      netArray.push({ peerInfo: p, libp2p: l })
    })

    // create PeerBook and populate peerBook
    netArray.forEach((net, i) => {
      const pb = netArray[i].libp2p.peerBook
      netArray.forEach((net, j) => {
        if (i === j) {
          return
        }
        pb.put(net.peerInfo)
      })
      netArray[i].peerBook = pb
    })

    // create the repos
    const tmpDir = os.tmpdir()
    netArray.forEach((net, i) => {
      const repoPath = tmpDir + '/' + net.peerInfo.id.toB58String()
      net.repo = new Repo(repoPath)
    })

    each(netArray, (net, cb) => {
      const repoPath = tmpDir + '/' + net.peerInfo.id.toB58String()
      net.repo = new Repo(repoPath)

      series([
        (cb) => net.repo.init({}, cb),
        (cb) => net.repo.open(cb)
      ], cb)
    }, (err) => {
      if (err) {
        throw err
      }
      startLibp2p()
    })

    function startLibp2p () {
      // start every libp2pNode
      each(netArray, (net, cb) => net.libp2p.start(cb), (err) => {
        if (err) {
          throw err
        }
        createBitswaps()
      })
    }
    // create every BitSwap
    function createBitswaps () {
      netArray.forEach((net) => {
        net.bitswap = new Bitswap(net.libp2p, net.repo.blocks, net.peerBook)
      })
      establishLinks()
    }

    // connect all the nodes between each other
    function establishLinks () {
      eachSeries(netArray, (from, cbI) => {
        eachSeries(netArray, (to, cbJ) => {
          if (from.peerInfo.id.toB58String() === to.peerInfo.id.toB58String()) {
            return cbJ()
          }

          from.libp2p.dial(to.peerInfo, cbJ)
        }, cbI)
      }, finish)
    }

    // callback with netArray
    function finish (err) {
      if (err) { throw err }
      callback(null, netArray)
    }
  })
}
