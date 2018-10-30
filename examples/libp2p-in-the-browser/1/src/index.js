/* eslint no-console: ["error", { allow: ["log"] }] */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const domReady = require('detect-dom-ready')
const createNode = require('./create-node')

domReady(() => {
  const myPeerDiv = document.getElementById('my-peer')
  const swarmDiv = document.getElementById('swarm')

  createNode((err, node) => {
    if (err) {
      return console.log('Could not create the Node, check if your browser has WebRTC Support', err)
    }

    let connections = {}

    node.on('peer:discovery', (peerInfo) => {
      const idStr = peerInfo.id.toB58String()
      if (connections[idStr]) {
        // If we're already trying to connect to this peer, dont dial again
        return
      }
      console.log('Discovered a peer:', idStr)

      connections[idStr] = true
      node.dial(peerInfo, (err, conn) => {
        if (err) {
          // Prevent immediate connection retries from happening
          // and include a 10s jitter
          const timeToNextDial = 25 * 1000 + (Math.random(0) * 10000).toFixed(0)
          console.log('Failed to dial:', idStr)
          setTimeout(() => delete connections[idStr], timeToNextDial)
        }
      })
    })

    node.on('peer:connect', (peerInfo) => {
      const idStr = peerInfo.id.toB58String()
      console.log('Got connection to: ' + idStr)
      const connDiv = document.createElement('div')
      connDiv.innerHTML = 'Connected to: ' + idStr
      connDiv.id = idStr
      swarmDiv.append(connDiv)
    })

    node.on('peer:disconnect', (peerInfo) => {
      const idStr = peerInfo.id.toB58String()
      delete connections[idStr]
      console.log('Lost connection to: ' + idStr)
      const el = document.getElementById(idStr)
      el && el.remove()
    })

    node.start((err) => {
      if (err) {
        return console.log('WebRTC not supported')
      }

      const idStr = node.peerInfo.id.toB58String()

      const idDiv = document
        .createTextNode('Node is ready. ID: ' + idStr)

      myPeerDiv.append(idDiv)

      console.log('Node is listening o/')

      // NOTE: to stop the node
      // node.stop((err) => {})
    })
  })
})
