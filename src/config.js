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

const optionsSchema = s(
  {
    connectionManager: 'object?',
    datastore: 'object?',
    peerInfo: 'object',
    peerBook: 'object?',
    modules: s({
      connEncryption: optional(list([s('object|function')])),
      // this is hacky to simulate optional because interface doesnt work correctly with it
      // change to optional when fixed upstream
      connProtector: s.union(['undefined', s.interface({ protect: 'function' })]),
      contentRouting: optional(list(['object'])),
      dht: optional(s('null|function|object')),
      peerDiscovery: optional(list([s('object|function')])),
      peerRouting: optional(list(['object'])),
      streamMuxer: optional(list([s('object|function')])),
      transport: list([transport])
    }),
    config: s({
      peerDiscovery: 'object?',
      relay: s({
        enabled: 'boolean',
        hop: optional(s({
          enabled: 'boolean',
          active: 'boolean'
        },
        { enabled: false, active: false }))
      }, { enabled: true, hop: {} }),
      dht: s({
        kBucketSize: 'number',
        enabled: 'boolean?',
        randomWalk: optional(s({
          enabled: 'boolean?',
          queriesPerPeriod: 'number?',
          interval: 'number?',
          timeout: 'number?'
        }, { enabled: true, queriesPerPeriod: 1, interval: 30000, timeout: 10000 })),
        validators: 'object?',
        selectors: 'object?'
      }, { enabled: true, kBucketSize: 20, enabledDiscovery: true }),
      EXPERIMENTAL: s({
        pubsub: 'boolean'
      }, { pubsub: false })
    }, { relay: {}, dht: {}, EXPERIMENTAL: {} })
  },
  { config: {}, modules: {} }
)

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

  return options
}
