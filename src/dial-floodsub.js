'use strict'

const config = require('./config')
const pb = require('./message')
const log = config.log
const multicodec = config.multicodec
const stream = require('stream')
const PassThrough = stream.PassThrough
const toPull = require('stream-to-pull-stream')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')

module.exports = (libp2pNode, peerSet, subscriptions) => {
  return (peerInfo) => {
    const idB58Str = peerInfo.id.toB58String()

    // If already have a PubSub conn, ignore
    if (peerSet[idB58Str] && peerSet[idB58Str].conn) {
      return
    }

    libp2pNode.dialByPeerInfo(peerInfo, multicodec, gotConn)

    function gotConn (err, conn) {
      if (err) {
        return log.err(err)
      }

      // If already had a dial to me, just add the conn
      if (peerSet[idB58Str]) {
        peerSet[idB58Str].conn = conn
      } else {
        peerSet[idB58Str] = {
          conn: conn,
          peerInfo: peerInfo,
          topics: []
        }
      }

      // TODO change  to pull-pushable
      const pt1 = new PassThrough()
      const pt2 = new PassThrough()

      peerSet[idB58Str].stream = pt1
      pt1.pipe(pt2)
      const ptPull = toPull.duplex(pt2)

      pull(
        ptPull,
        lp.encode(),
        conn
      )

      // Immediately send my own subscriptions to the newly established conn
      if (subscriptions.length > 0) {
        const subopts = subscriptions.map((topic) => {
          return {
            subscribe: true,
            topicCID: topic
          }
        })
        const rpc = pb.rpc.RPC.encode({
          subscriptions: subopts
        })

        peerSet[idB58Str].stream.write(rpc)
      }
    }
  }
}
