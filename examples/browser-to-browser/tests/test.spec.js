/* eslint-disable no-console */
import { test, expect } from '@playwright/test'
import { playwright } from 'test-util-ipfs-example'
import { createLibp2p } from 'libp2p'
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'

// Setup
const play = test.extend({
  ...playwright.servers()
})


// DOM
const connectBtn = '#connect'
const connectAddr = '#peer'
const connectPeerAddr = '#connected_peer'
const messageInput = '#message'
const sendBtn = '#send'
const output = '#output'

const message = 'hello'
let url

// we spawn a js libp2p relay
async function spawnRelay() {
  const server = await createLibp2p({
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0/ws']
    },
    transports: [
      webSockets({
        filter: filters.all
      }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    relay: circuitRelayServer({}),
  })

  const serverAddr = server.getMultiaddrs()[0].toString()

  return { server, serverAddr }
}

play.describe('browser to browser example:', () => {
  let server
  let serverAddr

  // eslint-disable-next-line no-empty-pattern
  play.beforeAll(async ({ servers }, testInfo) => {
    testInfo.setTimeout(5 * 60_000)
    const s = await spawnRelay()
    server = s.server
    serverAddr = s.serverAddr
    console.log('Server addr:', serverAddr)
    url = `http://localhost:${servers[0].port}/`
  }, {})

  play.afterAll(() => {
    server.stop()
  })

  play.beforeEach(async ({ page }) => {
    await page.goto(url)
  })

  play('should connect to a relay node', async ({ page, context }) => {
    let peer = await per_page(page, serverAddr)

    // load second page and use `peer` as the connectAddr
    const pageTwo = await context.newPage();
    await pageTwo.goto(url)
    let newPeer = await per_page(pageTwo, peer)

    await page.fill(connectAddr, newPeer)
    await page.click(connectBtn)

    // send the relay message to the peer over the relay
    await page.fill(messageInput, message)
    await page.click(sendBtn)

    await page.waitForSelector('#output:has(div)')
    const connections = await page.textContent(output)

    // Expected output:
    //
    // Sending message '${message}'
    // Received message '${message}'
    expect(connections).toContain(`Sending message '${message}'`)
    expect(connections).toContain(`Received message '${message}'`)

    const connListFromPage = await page.textContent('#connections')
    const connListFromPageTwo = await pageTwo.textContent('#connections')
    // Expect to see the webrtc multiaddr in the connections list
    expect(connListFromPage).toContain('/webrtc/')
    expect(connListFromPageTwo).toContain('/webrtc/')
  })
})

async function per_page(page, address) {
  // add the go libp2p multiaddress to the input field and submit
  await page.fill(connectAddr, address)
  await page.click(connectBtn)
  await page.fill(messageInput, message)

  await page.waitForSelector('#output:has(div)')

  // Expected output:
  //
  // Dialing '${serverAddr}'
  // Listening on '${peer}'
  const connections = await page.textContent(output)
  const peer = await page.textContent(connectPeerAddr)

  expect(connections).toContain(`Dialing '${address}'`)
  expect(connections).toContain(`Listening on '${peer}'`)
  
  return peer
}
