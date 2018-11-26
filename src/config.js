'use strict'

const Joi = require('joi')

const ModuleSchema = Joi.alternatives().try(Joi.func(), Joi.object())

const OptionsSchema = Joi.object({
  // TODO: create proper validators for the generics
  connectionManager: Joi.object(),
  datastore: Joi.object(),
  peerInfo: Joi.object().required(),
  peerBook: Joi.object(),
  modules: Joi.object().keys({
    connEncryption: Joi.array().items(ModuleSchema).allow(null),
    connProtector: Joi.object().keys({
      protect: Joi.func().required()
    }).unknown(),
    contentRouting: Joi.array().items(Joi.object()).allow(null),
    dht: ModuleSchema.allow(null),
    peerDiscovery: Joi.array().items(ModuleSchema).allow(null),
    peerRouting: Joi.array().items(Joi.object()).allow(null),
    streamMuxer: Joi.array().items(ModuleSchema).allow(null),
    transport: Joi.array().items(ModuleSchema).min(1).required()
  }).required(),
  config: Joi.object().keys({
    peerDiscovery: Joi.object().allow(null),
    relay: Joi.object().keys({
      enabled: Joi.boolean().default(true),
      hop: Joi.object().keys({
        enabled: Joi.boolean().default(false),
        active: Joi.boolean().default(false)
      })
    }).default(),
    dht: Joi.object().keys({
      kBucketSize: Joi.number().default(20),
      enabledDiscovery: Joi.boolean().default(true)
    }).default(),
    EXPERIMENTAL: Joi.object().keys({
      dht: Joi.boolean().default(false),
      pubsub: Joi.boolean().default(false)
    }).default()
  }).default()
})

module.exports.validate = (options) => {
  options = Joi.attempt(options, OptionsSchema)

  // Ensure dht is correct
  if (options.config.EXPERIMENTAL.dht) {
    Joi.assert(options.modules.dht, ModuleSchema.required())
  }

  return options
}
