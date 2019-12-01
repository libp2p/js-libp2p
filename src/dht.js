'use strict'

module.exports = (node, DHT, config) => {
  const dht = new DHT({
    dialer: node.dialer,
    peerInfo: node.peerInfo,
    peerStore: node.peerStore,
    registrar: node.registrar,
    datastore: this.datastore,
    ...config
  })

  return {
    _dht: dht,

    start: () => dht.start(),

    stop: () => dht.stop()
  }
}
