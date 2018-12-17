'use strict'

const { struct, superstruct } = require('superstruct')
const kind = require('kind-of')
const { optional, list } = struct

const transports = ['tcp', 'utp', 'webrtcstar', 'webrtcdirect', 'websockets', 'websocketstar']
// Define custom types
const s = superstruct({
  types: {
    tcp: v => kind(v) === 'tcp',
    utp: v => kind(v) === 'utp',
    webrtcstar: v => kind(v) === 'webrtcstar',
    webrtcdirect: v => kind(v) === 'webrtcdirect',
    websockets: v => kind(v) === 'websockets',
    websocketstar: v => kind(v) === 'websocketstar',
    transport: value => {
      const [error] = list([s.union([ ...transports, 'function' ])]).validate(value)
      if (error) return error.message

      return value.length > 0
        ? true
        : 'You need to provide at least one transport.'
    }
  }
})

const optionsSchema = s(
  {
    connectionManager: 'object?',
    datastore: 'object?',
    peerInfo: 'object',
    peerBook: 'object?',
    modules: s({
      connEncryption: optional(list([s('object|function')])),
      connProtector: s.union(['undefined', s.interface({ protect: 'function' })]),
      contentRouting: optional(list(['object'])),
      dht: optional(s('null|function|object')),
      peerDiscovery: optional(list([s('object|function')])),
      peerRouting: optional(list(['object'])),
      streamMuxer: optional(list([s('object|function')])),
      transport: 'transport'
    }),
    config: s({
      peerDiscovery: 'object?',
      relay: s(
        {
          enabled: 'boolean',
          hop: optional(
            s(
              {
                enabled: 'boolean',
                active: 'boolean'
              },
              { enabled: false, active: false }
            )
          )
        },
        { enabled: true, hop: {} }
      ),
      dht: s(
        {
          kBucketSize: 'number',
          enabledDiscovery: 'boolean',
          validators: 'object?',
          selectors: 'object?'
        },
        { kBucketSize: 20, enabledDiscovery: true }
      ),
      EXPERIMENTAL: s(
        {
          dht: 'boolean',
          pubsub: 'boolean'
        },
        { dht: false, pubsub: false }
      )
    }, { relay: {}, dht: {}, EXPERIMENTAL: {} })
  },
  {
    config: {},
    modules: {}
  }
)

module.exports.validate = (opts) => {
  // console.log(opts.modules)
  const [error, options] = optionsSchema.validate(opts)

  // Improve errors throwed, reduce stack by throwing here and add reason to the message
  if (error) {
    throw new Error(`${error.message}${error.reason ? ' - ' + error.reason : ''}`)
  } else {
    // Throw when dht is enabled but no dht module provided
    if (options.config.EXPERIMENTAL.dht) {
      s('function|object')(options.modules.dht)
    }
  }

  return options
}
