/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { webTransport } from '../src/index.js'
import type { WebTransportComponents } from '../src/index.js'
import type { Upgrader } from '@libp2p/interface'

describe('WebTransport Transport', () => {
  let components: WebTransportComponents

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    components = {
      peerId: peerIdFromPrivateKey(privateKey),
      privateKey,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>()
    }
  })

  it('transport filter filters out invalid dial multiaddrs', async () => {
    const valid = [
      multiaddr('/ip4/1.2.3.4/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]
    const invalid = [
      multiaddr('/ip4/1.2.3.4/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd/p2p-circuit/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd'),
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]

    const t = webTransport()(components)

    expect(t.dialFilter([
      ...valid,
      ...invalid
    ])).to.deep.equal(valid)
  })
})
