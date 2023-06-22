/* eslint-disable no-console */
import { setup, expect } from 'test-ipfs-example/browser'
import { createLibp2p } from 'libp2p'
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { identifyService } from 'libp2p/identify'

// Setup
const test = setup()

// DOM
const connectBtn = '#connect'
const connectAddr = '#peer'
const messageInput = '#message'
const sendBtn = '#send'
const output = '#output'
const listeningAddresses = '#multiaddrs'

let url

// we spawn a js libp2p relay
async function spawnRelay() {
  const relayNode = await createLibp2p({
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
    services: {
      identify: identifyService(),
      relay: circuitRelayServer()
    }
  })

  const relayNodeAddr = relayNode.getMultiaddrs()[0].toString()

  return { relayNode, relayNodeAddr }
}

test.describe('browser to browser example:', () => {
  let relayNode
  let relayNodeAddr

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({ servers }, testInfo) => {
    testInfo.setTimeout(5 * 60_000)
    const r = await spawnRelay()
    relayNode = r.relayNode
    relayNodeAddr = r.relayNodeAddr
    console.log('Server addr:', relayNodeAddr)
    url = servers[0].url
  }, {})

  test.afterAll(() => {
    relayNode.stop()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(url)
  })

  test('should connect to a relay node', async ({ page: pageA, context }) => {
    // load second page
    const pageB = await context.newPage()
    await pageB.goto(url)

    // connect both pages to the relay
    const relayedAddressA = await dialRelay(pageA, relayNodeAddr)
    const relayedAddressB = await dialRelay(pageB, relayNodeAddr)

    // dial first page from second page over relay
    await dialPeerOverRelay(pageA, relayedAddressB)
    await dialPeerOverRelay(pageB, relayedAddressA)

    // stop the relay
    await relayNode.stop()

    await echoMessagePeer(pageB, 'hello B')

    await echoMessagePeer(pageA, 'hello A')
  })
})

async function echoMessagePeer (page, message) {
  // send the message to the peer over webRTC
  await page.fill(messageInput, message)
  await page.click(sendBtn)

  // check the message was echoed back
  const outputLocator = page.locator(output)
  await expect(outputLocator).toContainText(`Sending message '${message}'`)
  await expect(outputLocator).toContainText(`Received message '${message}'`)
}

async function dialRelay (page, address) {
  // add the go libp2p multiaddress to the input field and submit
  await page.fill(connectAddr, address)
  await page.click(connectBtn)

  const outputLocator = page.locator(output)
  await expect(outputLocator).toContainText(`Dialing '${address}'`)
  await expect(outputLocator).toContainText(`Connected to '${address}'`)

  const multiaddrsLocator = page.locator(listeningAddresses)
  await expect(multiaddrsLocator).toHaveText(/webrtc/)

  const multiaddrs = await page.textContent(listeningAddresses)
  const addr = multiaddrs.split(address).filter(str => str.includes('webrtc')).pop()

  return address + addr
}

async function dialPeerOverRelay (page, address) {
  // add the go libp2p multiaddr to the input field and submit
  await page.fill(connectAddr, address)
  await page.click(connectBtn)

  const outputLocator = page.locator(output)
  await expect(outputLocator).toContainText(`Dialing '${address}'`)
  await expect(outputLocator).toContainText(`Connected to '${address}'`)
}
