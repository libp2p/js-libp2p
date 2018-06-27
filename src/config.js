'use strict'

const Joi = require('joi')

const schema = Joi.object({
  // TODO: create proper validators for the generics
  connectionManager: Joi.object(),
  peerInfo: Joi.object().required(),
  peerBook: Joi.object(),
  modules: Joi.object().keys({
    transport: Joi.array().items(
      Joi.alternatives().try(
        Joi.func(),
        Joi.object()
      )
    ).min(1).required(),
    streamMuxer: Joi.array().items(
      Joi.alternatives().try(
        Joi.func(),
        Joi.object()
      )
    ).allow(null),
    connEncryption: Joi.array().items(
      Joi.alternatives().try(
        Joi.func(),
        Joi.object()
      )
    ).allow(null),
    peerDiscovery: Joi.array().items(
      Joi.alternatives().try(
        Joi.func(),
        Joi.object()
      )
    ).allow(null),
    dht: Joi.alternatives().try(
      Joi.func(),
      Joi.object()
    ).allow(null)
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
  let newSchema = schema
  // Throw an intial error early for required props
  let config = Joi.attempt(options, newSchema)

  // Ensure discoveries are properly configured
  if (config.modules.peerDiscovery) {
    config.modules.peerDiscovery.forEach((discovery) => {
      // If it's a function, validate we have configs for it
      if (typeof discovery === 'function') {
        Joi.reach(schema, 'config.peerDiscovery').keys({
          [discovery.tag]: Joi.object().required()
        })
      }
    })
  }

  // Ensure dht is correct
  if (config.config.EXPERIMENTAL && config.config.EXPERIMENTAL.dht) {
    newSchema = newSchema.requiredKeys('modules.dht')
  }

  // Finish validation and return the updated config
  return Joi.attempt(config, newSchema)
}
