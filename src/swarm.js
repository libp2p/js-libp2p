exports = module.exports = Swarm

function Swarm (peerInfo) {
  var self = this

  if (!(self instanceof Swarm)) {
    throw new Error('Swarm must be called with new')
  }

  self.peerInfo = peerInfo

  // peerIdB58: { conn: <conn> }
  self.conns = {}

  // peerIdB58: { muxer: <muxer> }
  self.muxedConns = {}

  // transportName: { transport: transport,
  //                  dialOptions: dialOptions,
  //                  listenOptions: listenOptions,
  //                  listeners: [] }
  self.transports = {}

  self.listeners = {}

  // public interface

  self.addTransport = function (name, transport, options, dialOptions, listenOptions, callback) {
    // set up the transport and add the list of incoming streams
    // add transport to the list of transports

    var listener = transport.createListener(options, listen)

    listener.listen(listenOptions, function ready () {
      self.transports[name] = {
        transport: transport,
        dialOptions: dialOptions,
        listenOptions: listenOptions,
        listeners: [listener]
      }

      // If a known multiaddr is passed, then add to our list of multiaddrs
      if (options.multiaddr) {
        self.peerInfo.multiaddrs.push(options.multiaddr)
      }

      callback()
    })
  }

  self.addUpgrade = function (ConnUpgrade, options) {}

  self.addStreamMuxer = function (StreamMuxer, options) {}

  self.dial = function (peerInfo, options, protocol, callback) {
    // 1. check if we have transports we support
  }

  self.closeListener = function (transportName, callback) {
    // close a specific listener
    // remove it from available transports
  }

  self.close = function (callback) {
    // close everything
  }

  self.handleProtocol = function (protocol, handlerFunction) {}

  // internals

  function listen (conn) {
    console.log('Received new connection')
  // apply upgrades
  // then add it to the multistreamHandler
  }
}
