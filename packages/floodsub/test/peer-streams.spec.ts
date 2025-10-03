import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import * as lp from 'it-length-prefixed'
import { Uint8ArrayList } from 'uint8arraylist'
import { RPC } from '../src/message/rpc.ts'
import { PeerStreams } from '../src/peer-streams.js'
import type { PubSubRPC } from '../src/floodsub.ts'
import type { PeerId } from '@libp2p/interface'

describe('peer-streams', () => {
  let remotePeerId: PeerId

  beforeEach(async () => {
    remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  it('should receive messages larger than internal MAX_DATA_LENGTH when maxDataLength is set', async () => {
    const messageSize = 6 * 1024 * 1024 // 6MB
    const maxDataLength = messageSize + 10 // message + protobuf overhead
    const largeMessage: PubSubRPC = {
      subscriptions: [],
      messages: [{
        data: (new Uint8ArrayList(new Uint8Array(messageSize).fill(65))).subarray() // Fill with "A"
      }]
    }

    // Get both ends of the duplex stream (have to increase max read buffer
    // length to much larger than message size as the mock muxer base64 encodes
    // the data which makes it larger than the byte array
    const [outbound, inbound] = await streamPair({
      outbound: {
        maxReadBufferLength: messageSize * 2,
        maxWriteBufferLength: messageSize * 2
      },
      outboundConnection: {
        maxReadBufferLength: messageSize * 2,
        maxWriteBufferLength: messageSize * 2
      },
      inbound: {
        maxReadBufferLength: messageSize * 2,
        maxWriteBufferLength: messageSize * 2
      },
      inboundConnection: {
        maxReadBufferLength: messageSize * 2,
        maxWriteBufferLength: messageSize * 2
      }
    })

    // Create PeerStreams with increased maxDataLength
    const peer = new PeerStreams(remotePeerId)
    peer.attachInboundStream(inbound, {
      maxDataLength,
      maxBufferSize: maxDataLength
    })

    const [
      receivedMessages
    ] = await Promise.all([
      // Attach the inbound stream on the reading end and collect received
      // messages
      (async function () {
        const receivedMessages: PubSubRPC[] = []

        peer.addEventListener('message', (evt) => {
          receivedMessages.push(evt.detail)
        })

        return receivedMessages
      })(),

      // Simulate sending data from the outbound side
      (async function () {
        const buf = lp.encode.single(RPC.encode(largeMessage), {
          maxDataLength
        })
        outbound.send(buf)

        // Close the outbound writer so the reader knows no more data is coming
        await outbound.close()
      })()
    ])

    // Check if received correctly
    expect(receivedMessages).to.have.lengthOf(1)
    // Check that the content of the sent and received messages are identical
    expect(receivedMessages[0]).to.deep.equal(largeMessage)
  })
})
