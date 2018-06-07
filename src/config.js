'use strict'

const Joi = require('joi')

const ModuleSchema = Joi.alternatives().try(Joi.func(), Joi.object())

const OptionsSchema = Joi.object({
  // TODO: create proper validators for the generics
  connectionManager: Joi.object(),
  peerInfo: Joi.object().required(),
  peerBook: Joi.object(),
  modules: Joi.object().keys({
    transport: Joi.array().items(ModuleSchema).min(1).required(),
    streamMuxer: Joi.array().items(ModuleSchema).allow(null),
    connEncryption: Joi.array().items(ModuleSchema).allow(null),
    connProtector: Joi.object().keys({
      protect: Joi.func().required()
    }).unknown(),
    peerDiscovery: Joi.array().items(ModuleSchema).allow(null),
    dht: ModuleSchema.allow(null)
  }).required(),
  config: Joi.object().keys({
    peerDiscovery: Joi.object().allow(null),
    relay: Joi.object().keys({
      enabled: Joi.boolean().default(false),
      hop: Joi.object().keys({
        enabled: Joi.boolean().default(false),
        active: Joi.boolean().default(false)
      })
    }).default(),
    dht: Joi.object().keys({
      kBucketSize: Joi.number().allow(null)
    }),
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
