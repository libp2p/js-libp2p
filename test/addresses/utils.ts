import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { createBaseOptions } from '../utils/base-options.js'

export const AddressesOptions = createBaseOptions({
  transports: [
    tcp(),
    webSockets()
  ]
})
