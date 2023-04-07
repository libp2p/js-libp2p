import { mplex } from "@libp2p/mplex"
import { createLibp2p } from "libp2p"
import { noise } from "@chainsafe/libp2p-noise"
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'

const server = await createLibp2p({
    addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0/ws']
    },
    transports: [
        webSockets({
            filter: filters.all
        }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    relay: circuitRelayServer({}),
})

console.log("p2p addr: ", server.getMultiaddrs().map((ma) => ma.toString()))
