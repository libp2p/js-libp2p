'use strict'

const EE = require('events').EventEmitter
const util = require('util')
const TimeCache = require('time-cache')
const utils = require('./utils')
const pb = require('./message')
const config = require('./config')
const log = config.log
const _intersection = require('lodash.intersection')
const dialOnFloodSub = require('./dial-floodsub.js')
const mountFloodSub = require('./mount-floodsub.js')
const _values = require('lodash.values')

module.exports = PubSubGossip

util.inherits(PubSubGossip, EE)

function PubSubGossip (libp2pNode, dagService) {
  if (!(this instanceof PubSubGossip)) {
    return new PubSubGossip(libp2pNode)
  }

  EE.call(this)

  const tc = new TimeCache()

  // map of peerIdBase58Str: { conn, topics, peerInfo }
  const peerSet = {}

  // list of our subscriptions
  const subscriptions = []

  // map of peerId: [] (size 10)
  //   check if not contained + newer than older
  //   if passes, shift, push, sort
  //   (if needed, i.e. not the newest)

  const dial = dialOnFloodSub(libp2pNode, peerSet, subscriptions)
  mountFloodSub(libp2pNode, peerSet, tc, subscriptions, this)

  this.publish = (topics, messages) => {
    log('publish', topics, messages)
    if (!Array.isArray(topics)) {
      topics = [topics]
    }
    if (!Array.isArray(messages)) {
      messages = [messages]
    }

    // emit to self if I'm interested
    topics.forEach((topic) => {
      if (subscriptions.indexOf(topic) !== -1) {
        messages.forEach((message) => {
          this.emit(topic, message)
        })
      }
    })

    // send to all the other peers
    const peers = Object
                    .keys(peerSet)
                    .map((idB58Str) => peerSet[idB58Str])

    peers.forEach((peer) => {
      if (_intersection(peer.topics, topics).length > 0) {
        const msgs = messages.map((message) => {
          const msg = {
            from: libp2pNode.peerInfo.id.toB58String(),
            data: message,
            seqno: new Buffer(utils.randomSeqno()),
            topicCIDs: topics
          }
          tc.put(utils.msgId(msg.from, msg.seqno.toString()))
          return msg
        })
        const rpc = pb.rpc.RPC.encode({
          msgs: msgs
        })

        peer.stream.write(rpc)
        log('publish msgs on topics', topics, peer.peerInfo.id.toB58String())
      }
    })
  }

  this.subscribe = (topics) => {
    if (!Array.isArray(topics)) {
      topics = [topics]
    }

    topics.forEach((topic) => {
      if (subscriptions.indexOf(topic) === -1) {
        subscriptions.push(topic)
      }
    })

    const peers = Object
                    .keys(peerSet)
                    .map((idB58Str) => peerSet[idB58Str])

    peers.forEach((peer) => {
      const subopts = topics.map((topic) => {
        return {
          subscribe: true,
          topicCID: topic
        }
      })
      const rpc = pb.rpc.RPC.encode({
        subscriptions: subopts
      })

      peer.stream.write(rpc)
    })
  }

  this.unsubscribe = (topics) => {
    if (!Array.isArray(topics)) {
      topics = [topics]
    }

    topics.forEach((topic) => {
      const index = subscriptions.indexOf(topic)
      if (index > -1) {
        subscriptions.splice(index, 1)
      }
    })

    _values(peerSet).forEach((peer) => {
      const subopts = topics.map((topic) => {
        return {
          subscribe: false,
          topicCID: topic
        }
      })
      const rpc = pb.rpc.RPC.encode({
        subscriptions: subopts
      })

      peer.stream.write(rpc)
    })
  }

  this.getPeerSet = () => {
    return peerSet
  }

  this.getSubscriptions = () => {
    return subscriptions
  }

  function onStart () {
    const connectedPeers = libp2pNode.peerBook.getAll()
    _values(connectedPeers).forEach(dial)
  }
  onStart()

  // speed up any new peer that comes in my way
  libp2pNode.swarm.on('peer-mux-established', dial)
}
