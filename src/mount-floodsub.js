'use strict'

const config = require('./config')
const log = config.log
const multicodec = config.multicodec
const pull = require('pull-stream')
const _uniq = require('lodash.uniq')
const _intersection = require('lodash.intersection')
const lp = require('pull-length-prefixed')
const pb = require('./message')
const utils = require('./utils')

module.exports = mountFloodSub

function mountFloodSub (libp2pNode, peerSet, tc, subscriptions, ee) {
  // note: we don't use the incomming conn to send, just to receive
  libp2pNode.handle(multicodec, incConn)

  function incConn (conn) {
    conn.getPeerInfo((err, peerInfo) => {
      if (err) {
        log.err('Failed to identify incomming conn', err)
        return pull(
          pull.empty(),
          conn
        )
      }

      // populate
      const idB58Str = peerInfo.id.toB58String()

      if (!peerSet[idB58Str]) {
        peerSet[idB58Str] = {
          peerInfo: peerInfo,
          topics: []
        }
      }

      // process the messages
      pull(
        conn,
        lp.decode(),
        pull.drain((data) => {
          const rpc = pb.rpc.RPC.decode(data)
          if (rpc.subscriptions) {
            rpc.subscriptions.forEach((subopt) => {
              if (subopt.subscribe) {
                peerSet[idB58Str].topics.push(subopt.topicCID)
              } else {
                const index = peerSet[idB58Str].topics.indexOf(subopt.topicCID)
                if (index > -1) {
                  peerSet[idB58Str].topics.splice(index, 1)
                }
              }
            })

            peerSet[idB58Str].topics = _uniq(peerSet[idB58Str].topics)
          }

          if (rpc.msgs.length > 0) {
            rpc.msgs.forEach((msg) => {
              // 1. check if I've seen the message, if yes, ignore
              if (tc.has(utils.msgId(msg.from, msg.seqno.toString()))) {
                return
              } else {
                tc.put(utils.msgId(msg.from, msg.seqno.toString()))
              }

              // 2. emit to self
              msg.topicCIDs.forEach((topic) => {
                if (subscriptions.indexOf(topic) !== -1) {
                  ee.emit(topic, msg.data)
                }
              })

              // 3. propagate msg to others
              const peers = Object
                    .keys(peerSet)
                    .map((idB58Str) => peerSet[idB58Str])

              peers.forEach((peer) => {
                if (_intersection(peer.topics, msg.topicCIDs).length > 0) {
                  const rpc = pb.rpc.RPC.encode({
                    msgs: [msg]
                  })

                  peer.stream.write(rpc)
                }
              })
            })
          }
        }, (err) => {
          if (err) {
            return log.err(err)
          }
          // TODO
          //   remove peer from peerSet
        })
      )
    })
  }
}
