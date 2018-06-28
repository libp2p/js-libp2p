/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const WS = require('libp2p-websockets')
const Bootstrap = require('libp2p-railing')

const validateConfig = require('../src/config').validate

describe('configuration', () => {
  let peerInfo

  before((done) => {
    waterfall([
      (cb) => PeerId.create({ bits: 512 }, cb),
      (peerId, cb) => PeerInfo.create(peerId, cb),
      (info, cb) => {
        peerInfo = info
        cb()
      }
    ], () => done())
  })

  it('should throw an error if peerInfo is missing', () => {
    expect(() => {
      validateConfig({
        modules: {
          transport: [ WS ]
        }
      })
    }).to.throw()
  })

  it('should throw an error if modules is missing', () => {
    expect(() => {
      validateConfig({
        peerInfo
      })
    }).to.throw()
  })

  it('should throw an error if there are no transports', () => {
    expect(() => {
      validateConfig({
        peerInfo,
        modules: {
          transport: [ ]
        }
      })
    }).to.throw()
  })

  it('should add defaults to missing items', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ]
      },
      config: {
        peerDiscovery: {
          bootstrap: {
            interval: 1000,
            enabled: true
          }
        }
      }
    }

    const expected = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ]
      },
      config: {
        peerDiscovery: {
          bootstrap: {
            interval: 1000,
            enabled: true
          }
        },
        EXPERIMENTAL: {
          pubsub: false,
          dht: false
        },
        relay: {
          enabled: false
        }
      }
    }

    expect(validateConfig(options)).to.deep.equal(expected)
  })

  it('should not allow for dht to be enabled without it being provided', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [ WS ]
      },
      config: {
        EXPERIMENTAL: {
          dht: true
        }
      }
    }

    expect(() => validateConfig(options)).to.throw()
  })

  it('should require a non instanced peerDiscovery module to have associated options', () => {
    const options = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscover: [ Bootstrap ]
      },
      config: {
        EXPERIMENTAL: {
          dht: true
        }
      }
    }

    expect(() => validateConfig(options)).to.throw()
  })
})
