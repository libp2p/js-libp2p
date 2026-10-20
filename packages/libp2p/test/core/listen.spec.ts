import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.ts'
import type { Libp2p, Listener, Transport } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

describe('listen', () => {
  let libp2p: Libp2p
  let listeners: Array<Sinon.SinonStubbedInstance<Listener>>

  beforeEach(async () => {
    listeners = []

    libp2p = await createLibp2p({
      transports: [
        () => {
          const transport = stubInterface<Transport>({
            listenFilter: (addrs) => addrs.filter(ma => ma.toString().startsWith('/memory')),
            createListener: () => {
              let addr: Multiaddr | undefined
              const onClose: Array<() => void> = []

              const listener = stubInterface<Listener>({
                listen: Sinon.stub<[Multiaddr], Promise<void>>().callsFake(async (ma) => {
                  addr = ma
                }),
                getAddrs: () => addr != null ? [addr] : [],
                close: Sinon.stub<[], Promise<void>>().callsFake(async () => {
                  addr = undefined
                  onClose.forEach(fn => { fn() })
                }),
                addEventListener: (event: string, handler: any) => {
                  if (event === 'close') {
                    onClose.push(handler)
                  }
                }
              })

              listeners.push(listener)

              return listener
            }
          })
          transport[Symbol.toStringTag] = 'test-transport'

          return transport
        }
      ]
    })
  })

  afterEach(async () => {
    await libp2p?.stop()
  })

  it('should listen on an address after start', async () => {
    const ma = multiaddr('/memory/address-1')

    await libp2p.listen(ma)

    expect(listeners).to.have.lengthOf(1)
    expect(listeners[0].listen.calledWith(ma)).to.be.true()
  })

  it('should stop listening on an address', async () => {
    const addrs = [
      multiaddr('/memory/address-1'),
      multiaddr('/memory/address-2')
    ]

    await libp2p.listen(addrs)
    expect(listeners).to.have.lengthOf(2)

    await libp2p.unlisten(addrs[0])

    expect(listeners[0].close.called).to.be.true()
    expect(listeners[1].close.called).to.be.false()
  })

  it('should reject listening on an unsupported address', async () => {
    await expect(libp2p.listen(multiaddr('/ip4/127.0.0.1/tcp/0')))
      .to.eventually.be.rejected()
      .with.property('name', 'UnsupportedListenAddressesError')
  })
})
