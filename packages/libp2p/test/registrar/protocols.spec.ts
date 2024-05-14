/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { createLibp2pNode } from '../../src/libp2p.js'
import type { Components } from '../../src/components.js'
import type { Libp2pNode } from '../../src/libp2p.js'

describe('registrar protocols', () => {
  let libp2p: Libp2pNode

  it('should be able to register and unregister a handler', async () => {
    const deferred = pDefer<Components>()

    libp2p = await createLibp2pNode({
      peerId: await createEd25519PeerId(),
      transports: [
        webSockets()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
        plaintext()
      ],
      services: {
        test: (components: any) => {
          deferred.resolve(components)
        }
      }
    })

    const components = await deferred.promise

    const registrar = components.registrar

    expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0', '/echo/1.0.1'])

    const echoHandler = (): void => {}
    await libp2p.handle(['/echo/1.0.0', '/echo/1.0.1'], echoHandler)
    expect(registrar.getHandler('/echo/1.0.0')).to.have.property('handler', echoHandler)
    expect(registrar.getHandler('/echo/1.0.1')).to.have.property('handler', echoHandler)

    await libp2p.unhandle(['/echo/1.0.0'])
    expect(registrar.getProtocols()).to.not.have.any.keys(['/echo/1.0.0'])
    expect(registrar.getHandler('/echo/1.0.1')).to.have.property('handler', echoHandler)

    await expect(libp2p.peerStore.get(libp2p.peerId)).to.eventually.have.deep.property('protocols', [
      '/echo/1.0.1'
    ])
  })
})
