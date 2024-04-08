import tests from '@libp2p/interface-compliance-tests/transport'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { base64url } from 'multiformats/bases/base64'
import sinon from 'sinon'
import { webTransport, type WebTransportComponents } from '../src/index.js'
import { generateWebTransportCertificates } from './fixtures/certificate.js'

describe('interface-transport compliance', () => {
  tests({
    async setup () {
      const components: WebTransportComponents = {
        peerId: await createEd25519PeerId(),
        logger: defaultLogger()
      }

      const certificates = await generateWebTransportCertificates([{
        // can be max 14 days according to the spec
        days: 13
      }, {
        days: 13,
        // start in 12 days time
        start: new Date(Date.now() + (86400000 * 12))
      }])

      const certhash1 = base64url.encode(certificates[0].hash.bytes)
      const certhash2 = base64url.encode(certificates[0].hash.bytes)

      const transport = webTransport({
        certificates
      })(components)
      const addrs = [
        multiaddr(`/ip4/127.0.0.1/udp/9091/quic-v1/webtransport/certhash/${certhash1}/certhash/${certhash2}/p2p/${components.peerId.toString()}`),
        multiaddr(`/ip4/127.0.0.1/udp/9092/quic-v1/webtransport/certhash/${certhash1}/certhash/${certhash2}/p2p/${components.peerId.toString()}`),
        multiaddr(`/ip4/127.0.0.1/udp/9093/quic-v1/webtransport/certhash/${certhash1}/certhash/${certhash2}/p2p/${components.peerId.toString()}`),
        multiaddr(`/ip6/::/udp/9094/quic-v1/webtransport/certhash/${certhash1}/certhash/${certhash2}/p2p/${components.peerId.toString()}`)
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (delayMs: number) {
          // @ts-expect-error method is not part of transport interface
          const authenticateWebTransport = transport.authenticateWebTransport.bind(transport)

          // @ts-expect-error method is not part of transport interface
          sinon.replace(transport, 'authenticateWebTransport', async (wt: WebTransport, localPeer: PeerId, remotePeer: PeerId, certhashes: Array<MultihashDigest<number>>, signal?: AbortSignal) => {
            await new Promise<void>((resolve) => {
              setTimeout(() => { resolve() }, delayMs)
            })

            return authenticateWebTransport(wt, localPeer, remotePeer, certhashes, signal)
          })
        },
        restore () {
          sinon.restore()
        }
      }

      return { transport, addrs, connector }
    },
    async teardown () {}
  })
})
