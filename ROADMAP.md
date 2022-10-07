# js-libp2p roadmap Q4’22/Q1’23

## 🛣️ Milestones
### 2022

#### Early Q4 (October)
- A.1📺 Universal Browser Connectivity - [**WebTransport**](https://github.com/libp2p/js-libp2p-webtransport/issues/1)

#### End of Q4 (December)
- A.2 📺 Universal Browser Connectivity - [**WebRTC**](https://github.com/little-bear-labs/js-libp2p-webrtc/pull/4) (Browser to Server)
- B.1 🥊 Decentralized Hole Punching - [**AutoNat**](https://github.com/libp2p/js-libp2p/issues/1005)
- B. 2 🥊 Decentralized Hole Punching - [**Circuit Relay v2**](https://github.com/libp2p/js-libp2p/issues/1029)

### 2023

#### End of Q1 (March)
- B. 3 🥊 Decentralized Hole Punching - **Hole Punching**
	- 🎉 Estimated Project Completion
- C. 🧪 Future-proof Testing


# Roadmap Appendix
## A. 📺 Universal Browser Connectivity
<!--- TODO: Link to GitHub Epic -->

**Why**: A huge part of “the Web” is happening inside the browser. As a universal p2p networking stack, libp2p needs to be able to offer solutions for browser users.

**Goal**: js-libp2p supports both WebTransport and (libp2p-) WebRTC protocols, enabled by default. This allows connections between browsers and public nodes, and eventually between browsers and non-public nodes and in between browser nodes.

1. [WebTransport](https://github.com/libp2p/js-libp2p-webtransport/issues/1): Implementation of WebTransport in js-libp2p
2. [WebRTC](https://github.com/little-bear-labs/js-libp2p-webrtc/pull/4): while browser to public node is getting close to finalized, there’ll be a push to make the other combinations work as well

## B. 🥊 Decentralized Hole Punching
<!--- TODO: Link to GitHub Epic -->
**Why**:  P2P networks can have a combination of both public and private nodes. While private nodes can dial nodes on the public Internet, they are unreachable from the outside as they are behind a NAT or a firewall. We need a mechanism to dial them. A [previous DHT crawl found that almost 63%](https://github.com/libp2p/specs/blob/master/ROADMAP.md#-hole-punching-on-tcp-and-quic) of the network was undialable.  This project aims to implement Decentralized Hole Punching in js-libp2p and bring it to parity with the go and rust implementations.

**Goal**:
1. [AutoNat](https://github.com/libp2p/js-libp2p/issues/1005) - Determine whether a node is public or private (located behind a firewall or a NAT.)
2. [Circuit Relay v2](https://github.com/libp2p/js-libp2p/issues/1029) - Connect to,  request reservations, and establish a secure relay connection through discovered public relay node.
3. Hole Punching - Use [DCUtR](https://github.com/libp2p/specs/blob/master/relay/DCUtR.md) to synchronize hole punching

Dependencies: B.3 Hole punching is more reliable with QUIC as a transport and thus requires finding a way to use QUIC in node.js

## C. 🧪 Future-proof Testing
<!--- TODO: Link to GitHub Epic -->
**Why**:  JS support doesn't exist in Testground yet. In addition to the work to get generic JS test runners, we need support in Testground.

**Goal**: Server mode is implemented but we need a way to ensure it works. We need a very large network (>20 node at least; ideally 100/1000+) to test this on.

## Libp2p Project Roadmap
Roadmap items in this document were sourced from our the overarching libp2p project roadmap: https://github.com/libp2p/specs/blob/master/ROADMAP.md
