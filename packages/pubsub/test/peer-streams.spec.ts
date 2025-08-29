import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import { pipe } from 'it-pipe'
import { pEvent } from 'p-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { PeerStreams } from '../src/peer-streams.js'
import type { PeerStreamsComponents } from '../src/peer-streams.js'
import type { PeerId } from '@libp2p/interface'

describe('peer-streams', () => {
  let remotePeerId: PeerId
  let components: PeerStreamsComponents

  beforeEach(async () => {
    remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    components = { logger: defaultLogger() }
  })

  it.only('should receive messages larger than internal MAX_DATA_LENGTH when maxDataLength is set', async () => {
    const messageSize = 6 * 1024 * 1024 // 6MB
    const largeMessage = new Uint8ArrayList(new Uint8Array(messageSize).fill(65)) // Fill with "A"

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
    const peer = new PeerStreams(components, {
      id: remotePeerId,
      protocol: 'a-protocol'
    })

    const [
      receivedMessages
    ] = await Promise.all([
      // Attach the inbound stream on the reading end and collect received
      // messages
      all(peer.attachInboundStream(inbound, {
        maxDataLength: messageSize
      })),

      // Simulate sending data from the outbound side
      pipe(
        [largeMessage],
        (source) => lp.encode(source, {
          maxDataLength: messageSize
        }),
        async (source) => {
          for (const buf of source) {
            const sendMore = outbound.send(buf)

            if (sendMore === false) {
              await pEvent(outbound, 'drain', {
                rejectionEvents: [
                  'close'
                ]
              })
            }
          }

          // Close the outbound writer so the reader knows no more data is coming
          await outbound.close()
        }
      )
    ])

    // Check if received correctly
    expect(receivedMessages).to.have.lengthOf(1)
    expect(receivedMessages[0].byteLength).to.equal(messageSize)
    // Check that the content of the sent and received messages are identical
    const data = receivedMessages[0].slice()
    const input = largeMessage.slice()
    expect(data.length).to.equal(input.length)
    expect(data).to.deep.equal(input)
  })
})
