import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { createBaseOptions } from '../fixtures/base-options.js'

export const AddressesOptions = createBaseOptions({
  transports: [
    tcp(),
    webSockets()
  ]
})
