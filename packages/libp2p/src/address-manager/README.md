# Address Manager

The Address manager is responsible for keeping an updated register of the peer's addresses. It includes 2 different types of Addresses: `Listen Addresses` and `Announce Addresses`.

These Addresses should be specified in your libp2p [configuration](../../doc/CONFIGURATION.md) when you create your node.

## Listen Addresses

A libp2p node should have a set of listen addresses, which will be used by libp2p underlying transports to listen for dials from other nodes in the network.

Before a libp2p node starts, its configured listen addresses will be passed to the AddressManager, so that during startup the libp2p transports can use them to listen for connections. Accordingly, listen addresses should be specified through the libp2p configuration, in order to have the `AddressManager` created with them.

It is important pointing out that libp2p accepts ephemeral listening addresses. In this context, the provided listen addresses might not be exactly the same as the ones used by the transports. For example TCP may replace `/ip4/0.0.0.0/tcp/0` with something like `/ip4/127.0.0.1/tcp/8989`. As a consequence, libp2p should take into account this when determining its advertised addresses.

## Announce Addresses

In some scenarios, a libp2p node will need to announce addresses that it is not listening on. In other words, Announce Addresses are an amendment to the Listen Addresses that aim to enable other nodes to achieve connectivity to this node.

Scenarios for Announce Addresses include:
- when you setup a libp2p node in your private network at home, but you need to announce your public IP Address to the outside world;
- when you want to announce a DNS address, which maps to your public IP Address.

## Implementation

When a libp2p node is created, the Address Manager will be populated from the provided addresses through the libp2p configuration. Once the node is started, the Transport Manager component will gather the listen addresses from the Address Manager, so that the libp2p transports can attempt to bind to them.

Libp2p will use the the Address Manager as the source of truth when advertising the peers addresses. After all transports are ready, other libp2p components/subsystems will kickoff, namely the Identify Service and the DHT. Both of them will announce the node addresses to the other peers in the network. The announce addresses will have an important role here and will be gathered by libp2p to compute its current addresses to advertise everytime it is needed.

## Future Considerations

### Dynamic address modifications 

In a future iteration, we can enable these addresses to be modified in runtime. For this, the Address Manager should be responsible for notifying interested subsystems of these changes, through an Event Emitter.

#### Modify Listen Addresses

While adding new addresses to listen on runtime should be trivial, removing a listen address might have bad implications for the node, since all the connections using that listen address will be closed. However, libp2p should provide a mechanism for both adding and removing listen addresses in the future.

Every time a new listen address is added, the Address Manager should emit an event with the new multiaddrs to listen. The Transport Manager should listen to this events and act accordingly.

#### Modify Announce Addresses

When the announce addresses are modified, the Address Manager should emit an event so that other subsystems can act accordingly. For example, libp2p identify service should use the libp2p push protocol to inform other peers about these changes.
