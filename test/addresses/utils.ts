import { TCP } from '@libp2p/tcp'
import { WebSockets } from '@libp2p/websockets'
import { createBaseOptions } from '../utils/base-options.js'

export const AddressesOptions = createBaseOptions({
  transports: [
    new TCP(),
    new WebSockets()
  ]
})
