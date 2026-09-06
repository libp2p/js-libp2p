/* eslint-disable */

import { noise } from '../dist/src/index.js'
import benchmark from 'benchmark'
import { duplexPair } from 'it-pair/duplex'
import { base64pad } from 'multiformats/bases/base64'
import { defaultLogger } from '@libp2p/logger'
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromPublicKey } from '@libp2p/peer-id'

const bench = async function () {
  console.log('Initializing handshake benchmark')

  const initiatorPeer = 'CAESYBtKXrMwawAARmLScynQUuSwi/gGSkwqDPxi15N3dqDHa4T4iWupkMe5oYGwGH3Hyfvd/QcgSTqg71oYZJadJ6prhPiJa6mQx7mhgbAYfcfJ+939ByBJOqDvWhhklp0nqg=='
  const initiatorPrivateKey = privateKeyFromProtobuf(base64pad.decode(`M${initiatorPeer}`))
  const initiatorPeerId = peerIdFromPublicKey(initiatorPrivateKey.publicKey)
  const initiator = noise()({
    privateKey: initiatorPrivateKey,
    peerId: initiatorPeerId,
    logger: defaultLogger()
  })

  const responderPeer = 'CAESYPxO3SHyfc2578hDmfkGGBY255JjiLuVavJWy+9ivlpsxSyVKf36ipyRGL6szGzHuFs5ceEuuGVrPMg/rW2Ch1bFLJUp/fqKnJEYvqzMbMe4Wzlx4S64ZWs8yD+tbYKHVg=='
  const responderPrivateKey = privateKeyFromProtobuf(base64pad.decode(`M${responderPeer}`))
  const responderPeerId = peerIdFromPublicKey(responderPrivateKey.publicKey)
  const responder = noise()({
    privateKey: responderPrivateKey,
    peerId: responderPeerId,
    logger: defaultLogger()
  })

  console.log('Init complete, running benchmark')
  const bench = new benchmark('handshake', {
    defer: true,
    fn: async function (deferred) {
      const [inboundConnection, outboundConnection] = duplexPair()
      await Promise.all([
        initiator.secureOutbound(outboundConnection, {
          remotePeer: responderPeerId
        }),
        responder.secureInbound(inboundConnection, {
          remotePeer: initiatorPeerId
        })
      ])
      deferred.resolve()
    }
  })
    .on('complete', function (stats) {
      console.log(String(stats.currentTarget))
    })
  bench.run({ async: true })
}

bench()
