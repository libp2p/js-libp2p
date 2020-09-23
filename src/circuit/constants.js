'use strict'

const minute = 60 * 1000

module.exports = {
  ADVERTISE_BOOT_DELAY: 15 * minute, // Delay before HOP relay service is advertised on the network
  ADVERTISE_TTL: 30 * minute, // Delay Between HOP relay service advertisements on the network
  CIRCUIT_PROTO_CODE: 290, // Multicodec code
  HOP_METADATA_KEY: 'hop_relay', // PeerStore metadaBook key for HOP relay service
  HOP_METADATA_VALUE: 'true', // PeerStore metadaBook value for HOP relay service
  RELAY_RENDEZVOUS_NS: '/libp2p/relay' // Relay HOP relay service namespace for discovery
}
