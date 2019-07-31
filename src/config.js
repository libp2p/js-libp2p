'use strict'

const { struct, superstruct } = require('superstruct')
const { optional, list } = struct

// Define custom types
const s = superstruct()
const transport = s.union([
  s.interface({
    createListener: 'function',
    dial: 'function'
  }),
  'function'
])
const modulesSchema = s({
  connEncryption: optional(list([s('object|function')])),
  // this is hacky to simulate optional because interface doesnt work correctly with it
  // change to optional when fixed upstream
  connProtector: s.union(['undefined', s.interface({ protect: 'function' })]),
  contentRouting: optional(list(['object'])),
  dht: optional(s('null|function|object')),
  pubsub: optional(s('null|function|object')),
  peerDiscovery: optional(list([s('object|function')])),
  peerRouting: optional(list(['object'])),
  streamMuxer: optional(list([s('object|function')])),
  transport: s.intersection([[transport], s.interface({
    length (v) {
      return v > 0 ? true : 'ERROR_EMPTY'
    }
  })])
})

const configSchema = s({
  peerDiscovery: s('object', {
    autoDial: true
  }),
  relay: s({
    enabled: 'boolean',
    hop: optional(s({
      enabled: 'boolean',
      active: 'boolean'
    }, {
      // HOP defaults
      enabled: false,
      active: false
    }))
  }, {
    // Relay defaults
    enabled: true
  }),
  // DHT config
  dht: s('object?', {
    // DHT defaults
    enabled: false,
    kBucketSize: 20,
    randomWalk: {
      enabled: false, // disabled waiting for https://github.com/libp2p/js-libp2p-kad-dht/issues/86
      queriesPerPeriod: 1,
      interval: 300e3,
      timeout: 10e3
    }
  }),
  // Pubsub config
  pubsub: s('object?', {
    // DHT defaults
    enabled: false
  })
}, {})

const optionsSchema = s({
  switch: 'object?',
  connectionManager: s('object', {
    minPeers: 25
  }),
  datastore: 'object?',
  peerInfo: 'object',
  peerBook: 'object?',
  modules: modulesSchema,
  config: configSchema
})

module.exports.validate = (opts) => {
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

  if (options.config.peerDiscovery.autoDial === undefined) {
    options.config.peerDiscovery.autoDial = true
  }

  return options
}
