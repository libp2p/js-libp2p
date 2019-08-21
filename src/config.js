'use strict'

const mergeOptions = require('merge-options')
const { struct, superstruct } = require('superstruct')
const { optional, list } = struct

const DefaultConfig = {
  connectionManager: {
    minPeers: 25
  },
  config: {
    dht: {
      enabled: false,
      kBucketSize: 20,
      randomWalk: {
        enabled: false, // disabled waiting for https://github.com/libp2p/js-libp2p-kad-dht/issues/86
        queriesPerPeriod: 1,
        interval: 300e3,
        timeout: 10e3
      }
    },
    peerDiscovery: {
      autoDial: true
    },
    pubsub: {
      enabled: true,
      emitSelf: true,
      signMessages: true,
      strictSigning: true
    },
    relay: {
      enabled: true,
      hop: {
        enabled: false,
        active: false
      }
    }
  }
}

// Define custom types
const s = superstruct({
  types: {
    transport: value => {
      if (value.length === 0) return 'ERROR_EMPTY'
      value.forEach(i => {
        if (!i.dial) return 'ERR_NOT_A_TRANSPORT'
      })
      return true
    },
    protector: value => {
      if (!value.protect) return 'ERR_NOT_A_PROTECTOR'
      return true
    }
  }
})

const modulesSchema = s({
  connEncryption: optional(list([s('object|function')])),
  // this is hacky to simulate optional because interface doesnt work correctly with it
  // change to optional when fixed upstream
  connProtector: s('undefined|protector'),
  contentRouting: optional(list(['object'])),
  dht: optional(s('null|function|object')),
  pubsub: optional(s('null|function|object')),
  peerDiscovery: optional(list([s('object|function')])),
  peerRouting: optional(list(['object'])),
  streamMuxer: optional(list([s('object|function')])),
  transport: 'transport'
})

const configSchema = s({
  peerDiscovery: 'object?',
  relay: 'object?',
  dht: 'object?',
  pubsub: 'object?'
})

const optionsSchema = s({
  switch: 'object?',
  connectionManager: 'object?',
  datastore: 'object?',
  peerInfo: 'object',
  peerBook: 'object?',
  modules: modulesSchema,
  config: configSchema
})

module.exports.validate = (opts) => {
  opts = mergeOptions(DefaultConfig, opts)
  const [error, options] = optionsSchema.validate(opts)

  // Improve errors throwed, reduce stack by throwing here and add reason to the message
  if (error) {
    throw new Error(`${error.message}${error.reason ? ' - ' + error.reason : ''}`)
  } else {
    // Throw when dht is enabled but no dht module provided
    if (options.config.dht.enabled) {
      s('function|object')(options.modules.dht)
    }
  }

  return options
}
