'use strict'

const multiaddr = require('multiaddr')
const errCode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:dialer')
log.error = debug('libp2p:dialer:error')

const { codes } = require('./errors')


class Dialer {
  /**
   * @constructor
   * @param {object} options
   * @param {TransportManager} options.transportManager
   */
  constructor({ transportManager }) {
    this.transportManager = transportManager
  }

  /**
   * Connects to a given `Multiaddr`. `addr` should include the id of the peer being
   * dialed, it will be used for encryption verification.
   *
   * @async
   * @param {Multiaddr} addr The address to dial
   * @returns {Promise<Connection>}
   */
  async connectToMultiaddr (addr) {
    addr = multiaddr(addr)
    let conn

    try {
      conn = await this.transportManager.dial(addr, {})
    } catch (err) {
      log.error('Error dialing address %s,', addr, err)
      throw err
    }

    return conn
  }

  /**
   * Connects to a given `PeerInfo` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @async
   * @param {PeerInfo} peerInfo The address to dial
   * @returns {Promise<Connection>}
   */
  async connectToPeer (peerInfo) {
    const addrs = peerInfo.multiaddrs.toArray()
    // TODO: Send this through the Queue or Limit Dialer
    for (const addr of addrs) {
      try {
        return await this.connectToMultiaddr(addr).catch(log.error)
      } catch (_) {
        // The error is already logged, just move to the next addr
        continue
      }
    }

    const err = errCode(new Error('Could not dial peer, all addresses failed'), codes.ERR_CONNECTION_FAILED)
    log.error(err)
    throw err
  }
}

module.exports = Dialer
