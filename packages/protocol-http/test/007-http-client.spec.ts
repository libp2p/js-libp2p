/* eslint-env mocha */
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { FaultTolerance } from '@libp2p/interface'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { createSandbox } from 'sinon'
import { URL } from '../src/common/url.js'
import { HttpClientFactory } from '../src/http-client-factory.js'
import { getNodeConfig } from './common/node-config.js'
import type { http } from '../src/http-proto-api.js'
import type { HttpClientInterface } from '../src/interfaces/http-client-interface.js'
import type { Libp2p, ServiceMap } from '@libp2p/interface'

describe('007-HTTP Client Implementation', () => {
  const sandbox = createSandbox()
  let node: Libp2p<ServiceMap>
  let client: HttpClientInterface

  beforeEach(async () => {
    // Create a libp2p node with environment-appropriate configuration
    const config = getNodeConfig()
    node = await createLibp2p({
      ...config,
      services: {
        // Add the identify service to ensure the connection is fully open before we start using it
        identify: identify()
      },
      transports: [circuitRelayTransport(), webRTC(), webRTCDirect()],
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      }
    })

    // Create HTTP client using real components from the node
    const createClient = HttpClientFactory.createClient()
    client = createClient({
      logger: node.logger,
      connectionManager: (node as any).components.connectionManager,
      registrar: (node as any).components.registrar
    })
    // Start the node
    await node.start()
  })

  afterEach(async () => {
    sandbox.restore()
    await node.stop()
  })

  it('should create client instance', () => {
    expect(client).to.exist()
  })

  it('should throw on invalid URL', async () => {
    const request: http.HttpRequest = {
      method: 'GET',
      targetUri: '/',
      protocolVersion: '1.1',
      baseMessage: {
        headers: [],
        content: new Uint8Array(),
        trailers: []
      }
    }
    await expect(client.fetch(new URL('invalid://test'), request))
      .to.be.rejectedWith('Invalid URL: protocol \'invalid:\' is not supported')
  })

  it('should handle invalid PeerId', async () => {
    const request: http.HttpRequest = {
      method: 'GET',
      targetUri: '/',
      protocolVersion: '1.1',
      baseMessage: {
        headers: [],
        content: new Uint8Array(),
        trailers: []
      }
    }
    await expect(client.fetch(new URL('https://test'), request))
      .to.be.rejectedWith('Invalid URL: could not extract peer ID from https://test')
  })

  it('should handle invalid address', async () => {
    const request: http.HttpRequest = {
      method: 'GET',
      targetUri: '/',
      protocolVersion: '1.1',
      baseMessage: {
        headers: [],
        content: new Uint8Array(),
        trailers: []
      }
    }
    const validPeerId = '12D3KooWGC6nRXh5ZXvpeqscJCEiYkGYvXZr5RfKJ6iBXqE3Xa7X'
    await expect(client.fetch(new URL(`https://${validPeerId}`), request))
      .to.be.rejectedWith('The dial request has no valid addresses')
  })
})
