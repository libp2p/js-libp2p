# Libp2p Architecture

js-libp2p is comprised of a number of components that work together to provide functionality such as dialing peers, managing connections, registering protocols, storing information about peers and much more. This document aims to provide a high level overview of the components and how they interact with each other.

- [Libp2p Architecture](#libp2p-architecture)
  - [Component Diagram](#component-diagram)
  - [Sequence Diagrams](#sequence-diagrams)
    - [Dialing a Peer](#dialing-a-peer)
    - [Opening a stream on a connection](#opening-a-stream-on-a-connection)

## Component Diagram

```mermaid
flowchart TB
    direction TB
    subgraph Components
        direction TB
        PeerId ~~~
        Events ~~~
        ConnectionGater ~~~
        Upgrader
        AddressManager ~~~
        ConnectionManager ~~~
        TransportManager ~~~
        Registrar
        PeerStore ~~~
        Datastore ~~~
        PeerRouting ~~~
        _xx[ ]
        ContentRouting ~~~
        Metrics ~~~
        ConnectionProtector ~~~
        _x[ ]

        style _x opacity:0;
        style _xx opacity:0;

    end

    subgraph Connections[Connection Configuration]
        direction TB

        subgraph Transports
            direction TB
            TCP
            WebRTC
            Websocket
            Webtransport
        end

        subgraph Encryption[Connection Encryptions]
            direction TB
            Noise
            Plaintext
        end

        subgraph Multiplexer[Stream Multiplexers]
            direction TB
            Yamux
        end

        Multiplexer ~~~ Encryption ~~~ Transports

    end
```

```mermaid
---
title: Components Dependency Graph
---
flowchart TD
    PeerId
    Events
    ConnectionGater
    Upgrader
    AddressManager
    ConnectionManager
    TransportManager
    Registrar
    PeerStore
    Datastore
    PeerRouting
    ContentRouting
    Metrics
    ConnectionProtector

    %% AddressManager
    PeerId --> AddressManager
    TransportManager --> AddressManager
    PeerStore --> AddressManager
    Events --> AddressManager

    %% ConnectionManager
    PeerId --> ConnectionManager
    Metrics --> ConnectionManager
    PeerStore --> ConnectionManager
    TransportManager --> ConnectionManager
    ConnectionGater --> ConnectionManager
    Events --> ConnectionManager

    %% TransportManager
    Metrics --> TransportManager
    AddressManager --> TransportManager
    Upgrader --> TransportManager
    Events --> TransportManager

    %% Upgrader
    PeerId --> Upgrader
    Metrics --> Upgrader
    ConnectionManager --> Upgrader
    ConnectionGater --> Upgrader
    ConnectionProtector --> Upgrader
    Registrar --> Upgrader
    PeerStore --> Upgrader
    Events --> Upgrader

    %% Registrar
    PeerId --> Registrar
    ConnectionManager --> Registrar
    PeerStore --> Registrar
    Events --> Registrar

    %% PeerStore
    PeerId --> PeerStore
    Datastore --> PeerStore
    Events --> PeerStore

    %% PeerRouting
    PeerId --> PeerRouting
    PeerStore --> PeerRouting

    %% ContentRouting
    PeerStore --> ContentRouting
```

## Sequence Diagrams

These diagrams show the interactions between the components in common scenarios. They are not exhaustive and are intended to provide a high level overview of the interactions between the components.

### Dialing a Peer

This illustrates an outbound connection being established to a peer.

```mermaid
%% how an outbound connection is opened when a user calls .dial(),
%% assuming user is not connected to the PeerId for the
%% Multiaddr that was dialed.
%%
%% This is
%%
sequenceDiagram
    User->>+libp2p: dial a multiaddr `.dial()`
    libp2p->>+Connection Manager: open a connection for me to MA `.openConnection()`
    %% obfuscating the dial queue.
    %% Connection Manager->>+Transport Manager: Choose transport to use for Multiaddr
    Connection Manager->>+Transport Manager: Network level reach out `.dial()`
    Transport Manager->>+Transport: Get MultiaddrConn `socket + multiaddr`
    %% Transport->>+Transport Manager: Return MultiaddrConn `socket + multiaddr`
    %% how the upgrade happens is transport specific, so transports directly call upgrader
    Transport-->>+Upgrader: upgrade my connection??
    Upgrader-->>+Upgrader: Perform upgrade (see other diagram)
    Upgrader->>+Connection Manager: Connection (link to interface)
    %% Connection Manager->>+Connection Manager: Connection (link to interface)
    Connection Manager->>+User: Connection (link to interface)
```


### Opening a stream on a connection

This illustrates a stream being opened on an existing connection that will echo a message back to the sender. This assumes that a stable connection has been established between the two peers.

```mermaid
%% pushing data over stream
%% register stream handler, local opens a stream for proto, send data,
%% remote receives data and sends data back
%% local receives data
%% stream may or may not then be closed.
%% Local is the node sending data, Remote is other peer the conn is with
%% Echo protocol
sequenceDiagram
    box Local side
    participant Local
    participant Connection
    participant LocalMuxer
    end
    participant Stream
    box pink Connection
    end
    box Remote side
    participant Remote
    participant RemoteMuxer
    participant RemoteUpgrader
    participant RemoteRegistrar
    participant RemoteStreamHandler
    end

    Remote->>RemoteRegistrar: Register Stream Handler `libp2p.handle`
    %% only register stream handlers when you want to listen for protocols. SENDERs do not need to listen
    Local->>Connection: Open outbound stream
    Connection->>LocalMuxer: Open stream
    LocalMuxer->>RemoteMuxer: Open stream
    RemoteMuxer->>RemoteUpgrader: notify Stream created
    Note over Connection,RemoteUpgrader: multi stream select handles protocol negotiation
    Connection->>Local: return Stream
    RemoteUpgrader->>RemoteRegistrar: select stream handler
    RemoteRegistrar->>RemoteStreamHandler: handle stream
    Note over RemoteStreamHandler,Local: Stream data flow & control is dictated by protocol, below is example of "echo"
    activate Stream
    Local->>Stream: send bytes "hello world"
    Stream->>RemoteStreamHandler: receive bytes "hello world"
    %% RemoteStreamHandler->>+RemoteStreamHandler: [echo] pipe back received bytes
    RemoteStreamHandler->>Stream: echo bytes back to sender
    Stream->>Local: receive echoed bytes
    deactivate Stream

```