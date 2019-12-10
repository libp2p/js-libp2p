/* eslint no-console: ["error", { allow: ["log"] }] */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const domReady = require('detect-dom-ready')
const createNode = require('./create-node')

domReady(async () => {
  const myPeerDiv = document.getElementById('my-peer')
  const swarmDiv = document.getElementById('swarm')

  const node = await createNode()

  node.on('peer:discovery', (peerInfo) => {
    console.log('Discovered a peer:', peerInfo.id.toB58String())
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
    const el = document.getElementById(idStr)
    el && el.remove()
  })

  await node.start()

  const idStr = node.peerInfo.id.toB58String()

  const idDiv = document
    .createTextNode('Node is ready. ID: ' + idStr)

  myPeerDiv.append(idDiv)

  console.log('Node is listening o/')
  node.peerInfo.multiaddrs.toArray().forEach(ma => {
    console.log(ma.toString())
  })
})
