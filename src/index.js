'use strict'

const Swarm = require('libp2p-swarm')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const multiaddr = require('multiaddr')
const mafmt = require('mafmt')
const EE = require('events').EventEmitter
const assert = require('assert')

exports = module.exports

const OFFLINE_ERROR_MESSAGE = 'The libp2p node is not started yet'
const IPFS_CODE = 421

class Node {
  constructor (_modules, _peerInfo, _peerBook) {
    assert(_modules, 'requires modules to equip libp2p with features')
    assert(_peerInfo, 'requires a PeerInfo instance')

    this.modules = _modules
    this.peerInfo = _peerInfo
    this.peerBook = _peerBook || new PeerBook()
    this.isOnline = false

    this.discovery = new EE()

    this.swarm = new Swarm(this.peerInfo)

    // Attach stream multiplexers
    if (this.modules.connection.muxer) {
      let muxers = this.modules.connection.muxer
      muxers = Array.isArray(muxers) ? muxers : [muxers]
      muxers.forEach((muxer) => {
        this.swarm.connection.addStreamMuxer(muxer)
      })

      // If muxer exists, we can use Identify
      this.swarm.connection.reuse()

      // Received incommind dial and muxer upgrade happened, reuse this
      // muxed connection
      this.swarm.on('peer-mux-established', (peerInfo) => {
        this.peerBook.put(peerInfo)
      })

      this.swarm.on('peer-mux-closed', (peerInfo) => {
        this.peerBook.removeByB58String(peerInfo.id.toB58String())
      })
    }

    // Attach crypto channels
    if (this.modules.connection.crypto) {
      let cryptos = this.modules.connection.crypto
      cryptos = Array.isArray(cryptos) ? cryptos : [cryptos]
      cryptos.forEach((crypto) => {
        this.swarm.connection.crypto(crypto.tag, crypto.encrypt)
      })
    }

    // Attach discovery mechanisms
    if (this.discovery) {
      let discoveries = this.modules.discovery
      discoveries = Array.isArray(discoveries) ? discoveries : [discoveries]
      discoveries.forEach((discovery) => {
        discovery.on('peer', (peerInfo) => {
          this.discovery.emit('peer', peerInfo)
        })
      })
    }

    // Not fully implemented in js-libp2p yet
    this.routing = undefined
    this.records = undefined
  }

  /*
   * Start the libp2p node
   *   - create listeners on the multiaddrs the Peer wants to listen
   */
  start (callback) {
    if (!this.modules.transport) {
      return callback(new Error('no transports were present'))
    }
    let transports = this.modules.transport
    transports = Array.isArray(transports) ? transports : [transports]
    const multiaddrs = this.peerInfo.multiaddrs
    transports.forEach((transport) => {
      if (transport.filter(multiaddrs).length > 0) {
        this.swarm.transport.add(
          transport.tag || transport.constructor.name, transport)
      }
    })

    this.swarm.listen((err) => {
      if (err) {
        return callback(err)
      }

      this.isOnline = true
      callback()
    })
  }

  /*
   * Stop the libp2p node by closing its listeners and open connections
   */
  stop (callback) {
    this.isOnline = false
    this.swarm.close(callback)
  }

  //
  // Dialing methods
  //

  // TODO
  dialById (id, protocol, callback) {
    // NOTE: dialById only works if a previous dial was made. This will
    // change once we have PeerRouting

    assert(this.isOnline, OFFLINE_ERROR_MESSAGE)

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    callback(new Error('not implemented yet'))
  }

  dialByMultiaddr (maddr, protocol, callback) {
    assert(this.isOnline, OFFLINE_ERROR_MESSAGE)

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    if (typeof maddr === 'string') {
      maddr = multiaddr(maddr)
    }

    if (!mafmt.IPFS.matches(maddr.toString())) {
      return callback(new Error('multiaddr not valid'))
    }

    const ipfsIdB58String = maddr.stringTuples().filter((tuple) => {
      if (tuple[0] === IPFS_CODE) {
        return true
      }
    })[0][1]

    let peer
    try {
      peer = this.peerBook.getByB58String(ipfsIdB58String)
    } catch (err) {
      peer = new PeerInfo(PeerId.createFromB58String(ipfsIdB58String))
    }

    peer.multiaddr.add(maddr)
    this.dialByPeerInfo(peer, protocol, callback)
  }

  dialByPeerInfo (peer, protocol, callback) {
    assert(this.isOnline, OFFLINE_ERROR_MESSAGE)

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    this.swarm.dial(peer, protocol, (err, conn) => {
      if (err) {
        return callback(err)
      }
      this.peerBook.put(peer)
      callback(null, conn)
    })
  }

  //
  // Disconnecting (hangUp) methods
  //

  hangUpById (id, callback) {
    // TODO
    callback(new Error('not implemented yet'))
  }

  hangUpByMultiaddr (maddr, callback) {
    assert(this.isOnline, OFFLINE_ERROR_MESSAGE)

    if (typeof maddr === 'string') {
      maddr = multiaddr(maddr)
    }

    if (!mafmt.IPFS.matches(maddr.toString())) {
      return callback(new Error('multiaddr not valid'))
    }

    const ipfsIdB58String = maddr.stringTuples().filter((tuple) => {
      if (tuple[0] === IPFS_CODE) {
        return true
      }
    })[0][1]

    try {
      const pi = this.peerBook.getByB58String(ipfsIdB58String)
      this.hangUpByPeerInfo(pi, callback)
    } catch (err) {
      // already disconnected
      callback()
    }
  }

  hangUpByPeerInfo (peer, callback) {
    assert(this.isOnline, OFFLINE_ERROR_MESSAGE)

    this.peerBook.removeByB58String(peer.id.toB58String())
    this.swarm.hangUp(peer, callback)
  }

  //
  // Protocol multiplexing handling
  //

  handle (protocol, handlerFunc, matchFunc) {
    this.swarm.handle(protocol, handlerFunc, matchFunc)
  }

  unhandle (protocol) {
    this.swarm.unhandle(protocol)
  }
}

module.exports = {
  Node: Node
}
