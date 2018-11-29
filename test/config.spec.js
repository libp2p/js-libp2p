/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const WS = require('libp2p-websockets')
const Bootstrap = require('libp2p-bootstrap')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const DHT = require('libp2p-kad-dht')

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
        dht: {
          kBucketSize: 20,
          enabledDiscovery: true
        },
        relay: {
          enabled: true
        }
      }
    }

    expect(validateConfig(options)).to.deep.equal(expected)
  })

  it('should allow for delegated content and peer routing', () => {
    const peerRouter = new DelegatedPeerRouter()
    const contentRouter = new DelegatedContentRouter(peerInfo)

    const options = {
      peerInfo,
      modules: {
        transport: [ WS ],
        peerDiscovery: [ Bootstrap ],
        peerRouting: [ peerRouter ],
        contentRouting: [ contentRouter ]
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

    expect(validateConfig(options).modules).to.deep.include({
      peerRouting: [ peerRouter ],
      contentRouting: [ contentRouter ]
    })
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

  it('should add defaults, validators and selectors for dht', () => {
    const selectors = {}
    const validators = {}

    const options = {
      peerInfo,
      modules: {
        transport: [WS],
        dht: DHT
      },
      config: {
        EXPERIMENTAL: {
          dht: true
        },
        dht: {
          selectors,
          validators
        }
      }
    }
    const expected = {
      peerInfo,
      modules: {
        transport: [WS],
        dht: DHT
      },
      config: {
        EXPERIMENTAL: {
          pubsub: false,
          dht: true
        },
        relay: {
          enabled: true
        },
        dht: {
          kBucketSize: 20,
          enabledDiscovery: true,
          selectors,
          validators
        }
      }
    }
    expect(validateConfig(options)).to.deep.equal(expected)
  })
})
