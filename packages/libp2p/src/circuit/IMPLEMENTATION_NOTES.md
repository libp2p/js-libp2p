EDIT: This document is outdated and here only for historical purposes

NOTE: This document is structured in an `if-then/else[if]-then` manner, each line is a precondition for following lines with a higher number of indentation

Example:

- if there are apples
    - eat them
- if not, check for pears
    - then eat them
- if not, check for cherries
    - then eat them

Or,

- if there are apples
    - eat them
- if not
    - check for pears
        - then eat them
- if not
    - check for cherries
        - then eat them

In order to minimize nesting, the first example is preferred

# Relay flow

## Relay transport (dialer/listener)

- ### Dial over a relay
    - See if there is a relay that's already connected to the destination peer, if not
        - Ask all the peer's known relays to dial the destination peer until an active relay (one that can dial on behalf of other peers), or a relay that may have recently acquired a connection to the destination peer is successful. 
            - If successful
                - Write the `/ipfs/relay/circuit/1.0.0` header to the relay, followed by the destination address
                    -  e.g. `/ipfs/relay/circuit/1.0.0\n/p2p-circuit/ipfs/QmDest`.
            - If no relays could connect, fail the same way a regular transport would
    - Once the connection has been established, the swarm should treat it as a regular connection, 
        - i.e. muxing, encrypt, etc should all be performed on the relayed connection

- ### Listen for relayed connections
    - Peer mounts the `/ipfs/relay/circuit/1.0.0` proto and listens for relayed connections
        - A connection arrives
            - read the address of the source peer from the incoming connection stream
                - if valid, create a PeerInfo object for that peer and add the incoming address to its multiaddresses list
                - pass the connection to `protocolMuxer(swarm.protocols, conn)` to have it go through the regular muxing/encryption flow
                
- ### Relay discovery and static relay addresses in swarm config

    - #### Relay address in swarm config
       - A peer has relay addresses in its swarm config section
           - On node startup, connect to the relays in swarm config
                - if successful add address to swarms PeerInfo's multiaddresses
                    - `identify` should take care of announcing that the peer is reachable over the listed relays

    - #### Passive relay discovery
        - A peer that can dial over `/ipfs/relay/circuit/1.0.0` listens for the `peer-mux-established` swarm event, every time a new muxed connection arrives, it checks if the incoming peer is a relay. (How would this work? Some way of discovering if its a relay is required.)
           - *Useful in cases when the peer/node doesn't know of any relays on startup and also, to learn of as many additional relays in the network as possible*
           - *Useful during startup, when connecting to bootstrap nodes. It allows us to implicitly learn if its a relay without having to explicitly add `/p2p-circuit` addresses to the bootstrap list*
           - *Also useful if the relay communicates its capabilities upon connecting to it, as to avoid additional unnecessary requests/queries. I.e. if it supports weather its able to forward connections and weather it supports the `ls` or other commands.*
           - *Should it be possible to disable passive relay discovery?*
               - This could be useful when the peer wants to be reachable **only** over the listed relays
       - If the incoming peer is a relay, send an `ls` and record its peers

## Relay Nodes

- ### Passive relay node
    - *A passive relay does not explicitly dial into any requested peer, only those that it's swarm already has connections to.*
        - When the relay gets a request, read the the destination peer's multiaddr from the connection stream and if its a valid address and peer id
            - check its swarm's peerbook(?) see if its a known peer, if it is
                - use the swarms existing connection and
                    - send the multistream header and the source peer address to the dest peer
                        - e.g. `/ipfs/relay/circuit/1.0.0\n/p2p-circuit/ipfs/QmSource`
                    - circuit the source and dest connections
                - if couldn't dial, or the connection/stream to the dest peer closed prematurelly
                    - close the src stream


- ### Active relay node
    - *An active relay node can dial other peers even if its swarm doesnt know about those peers*
        - When the relay gets a request, read the the destination peer's multiaddr from the connection stream and if its a valid address and peer id
            - use the swarm to dial to the dest node
                - send the multistream header and the source peer address to the dest peer
                    - e.g. `/ipfs/relay/circuit/1.0.0\n/p2p-circuit/ipfs/QmSource`
                - circuit the source and dest connections
            - if couldn't dial, or the connection/stream to the dest peer closed prematurely
                - close the src stream

- ### `ls` command
    - *A relay node can allow the peers known to it's swarm to be listed*
        - *this should be possible to enable/disable from the config*
            - when a relay gets the `ls` request
                - if enabled, get its swarm's peerbook's known peers and return their ids and multiaddrs
                    - e.g `[{id: /ipfs/QmPeerId, addrs: ['ma1', 'ma2', 'ma3']}, ...]`
                - if disabled, respond with `na`


## Relay Implementation notes

- ### Relay transport
    - Currently I've implemented the dialer and listener parts of the relay as a transport, meaning that it *tries* to implement the `interface-transport` interface as closely as possible. This seems to work pretty well and it's makes the dialer/listener parts really easy to plug in into the swarm. I think this is the cleanest solution.

- ### `circuit-relay`
    - This is implemented as a separate piece (not a transport), and it can be enabled/disabled with a config. The transport listener however, will do the initial parsing of the incoming header and figure out weather it's a connection that's needs to be handled by the circuit-relay, or its a connection that is being relayed from a circuit-relay.

## Relay swarm integration

- The relay transport is mounted explicitly by calling the `swarm.connection.relay(config.relay)` from libp2p
    - Swarm will register the dialer and listener using the swarm `transport.add` and `transport.listen` methods

    - ### Listener 
        - the listener registers itself as a multistream handler on the `/ipfs/relay/circuit/1.0.0` proto
            - if `circuit-relay` is enabled, the listener will delegate connections to it if appropriate
        - when the listener receives a connection, it will read the multiaddr and determine if its a connection that needs to be relayed, or its a connection that is being relayed

    - ### Dialer
        - When the swarm attempts to dial to a peer, it will filter the protocols that the peer can be reached on
            - *The relay will be used in two cases*
            - If the peer has an explicit relay address that it can be reached on
                -  no other transport is available
                    - The relay will attempt to dial the peer over that relay
            - If no explicit relay address is provided
                -  no other transport is available
                    -  A generic circuit address will be added to the peers multiaddr list
                        - i.e. `/p2p-circuit/ipfs/QmDest`
            - If another transport is available, then use that instead of the relay
    

