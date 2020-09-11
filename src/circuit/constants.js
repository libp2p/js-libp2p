'use strict'

const minute = 60 * 1000

module.exports = {
  ADVERTISE_BOOT_DELAY: 15 * minute,
  ADVERTISE_TTL: 30 * minute,
  CIRCUIT_PROTO_CODE: 290,
  HOP_METADATA_KEY: 'hop_relay',
  HOP_METADATA_VALUE: 'true',
  RELAY_RENDEZVOUS_NS: '/libp2p/relay'
}
