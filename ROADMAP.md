
# js-libp2p roadmap Q4’22/Q1’23  <!-- omit in toc -->

```
Date: 2022-10-07
Status: In Progress
Notes: This document is still in review will may be heavily modified based on stakeholder feedback. Please add any feedback or questions in:
https://github.com/libp2p/js-libp2p/issues/1438
```

## Table of Contents <!-- omit in toc -->

- [About the Roadmap](#about-the-roadmap)
	- [Sections](#sections)
	- [Done criteria](#done-criteria)
- [🛣️ Milestones](#️-milestones)
	- [2022](#2022)
		- [Early Q4 (October)](#early-q4-october)
		- [Mid Q4 (November)](#mid-q4-november)
		- [End of Q4 (December)](#end-of-q4-december)
	- [2023](#2023)
		- [Early/Mid Q1](#earlymid-q1)
		- [End of Q1 (March)](#end-of-q1-march)
		- [Early Q2 (April)](#early-q2-april)
		- [Up Next](#up-next)
- [Roadmap Appendix](#roadmap-appendix)
	- [A. 📺 Universal Browser Connectivity](#a--universal-browser-connectivity)
	- [B. 🥊 Decentralized Hole Punching](#b--decentralized-hole-punching)
	- [C. 🧪 Future-proof Testing](#c--future-proof-testing)
	- [Libp2p Project Roadmap](#libp2p-project-roadmap)

## About the Roadmap

### Sections
This document consists of two sections: [Milestones](#Milestones) and the [Roadmap Appendix](#Roadmap-Appendix)

[Milestones](#Milestones) is our best educated guess (not a hard commitment) around when we plan to ship the key features.
Where possible we've broken down a project into discrete sub-projects e.g. project "A" (📺 Universal Browser Connectivity) contains three sub-projects and consists of A.1, A.2, and A.3
A project is signified as "complete" once all of it's sub-projects are shipped.

The [Roadmap Appendix](#Roadmap-Appendix) section describes each project in detail and lists its sub-projects (if applicable.) Here you can find the motivation for each project and goals.

We've deep-linked each section header to it's corresponding GitHub Epic. Latest information on the progress of each project there can be found in the Epics and their child issues (as we will make regular updates.)

### Done criteria
Our "Definition of Done" for projects/sub-projects that involve writing new protocols or modifications to existing ones will usually consist of the following:
- [ ] Spec is merged and classified as "Candidate Recommendation"
- [ ] (by virtue of the above) At least one major reference implementation exists
- [ ] A well established testing criteria is met (defined at the outset of the project including but not limited to testing via Testground, compatibility tests with other implementations in the Release process, etc.)
- [ ] Public documentation (on docs.libp2p.io) exists

Others supporting projects (like testing or benchmarking) will have different criteria.

## 🛣️ Milestones
### 2022

#### Early Q4 (October)
- A.1📺 Universal Browser Connectivity - [**WebTransport**](https://github.com/libp2p/js-libp2p-webtransport/issues/1)

#### Mid Q4 (November)
- C.1 🧪 Future-proof Testing - [**Browser Environment Tests**](https://github.com/testground/testground/issues/1386)

#### End of Q4 (December)
- A.2 📺 Universal Browser Connectivity - [**WebRTC for Browser to Server**](https://github.com/little-bear-labs/js-libp2p-webrtc/pull/4)
- B.1 🥊 Decentralized Hole Punching - [**AutoNat**](https://github.com/libp2p/js-libp2p/issues/1005)
- B. 2 🥊 Decentralized Hole Punching - [**Circuit Relay v2**](https://github.com/libp2p/js-libp2p/issues/1029)


### 2023

#### Early/Mid Q1
- C.2 🧪 Future-proof Testing - **Test DHT Server Mode at scale**
-
#### End of Q1 (March)
- B.3 🥊 Decentralized Hole Punching - **Add QUIC Transport**

#### Early Q2 (April)
- B.4 🥊 Decentralized Hole Punching - **Hole Punching**
	- 🎉 Estimated Project Completion

#### Up Next
- A.3 📺 Universal Browser Connectivity - **WebRTC for Browser to Browser**

## Roadmap Appendix
### A. 📺 Universal Browser Connectivity
<!--- TODO: Link to GitHub Epic -->

**Why**: A huge part of “the Web” is happening inside the browser. As a universal p2p networking stack, libp2p needs to be able to offer solutions for browser users.

**Goal**: js-libp2p supports both WebTransport and (libp2p-) WebRTC protocols, enabled by default. This allows connections between browsers and public nodes, and eventually between browsers and non-public nodes and in between browser nodes.

1. [WebTransport](https://github.com/libp2p/js-libp2p-webtransport/issues/1): Implementation of WebTransport in js-libp2p
2. [WebRTC for Browser to Server](https://github.com/little-bear-labs/js-libp2p-webrtc/pull/4): This will cover the browsers that don't support WebTransport (most notable is iOS Safari). This is getting close to finalized.
3. WebRTC for Browser to Browser: Even though this use case is made possible by [webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star) and [webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct) currently, they are a less than ideal solutions. Both libraries have shortcomings, aren't implemented in other languages, and don't employ newer libp2p advancements such as Circuit Relay v2, DCUtR, and authentication via Noise. Therefore, we want to support WebRTC Browser to Browser as a first class transport in js-libp2p and deprecate the previous libraries. This is beginning to be [specified here](https://github.com/libp2p/specs/pull/412).

### B. 🥊 Decentralized Hole Punching
<!--- TODO: Link to GitHub Epic -->
**Why**:  P2P networks can have a combination of both public and private nodes. While private nodes can dial nodes on the public Internet, they are unreachable from the outside as they are behind a NAT or a firewall. We need a mechanism to dial them. A [previous DHT crawl found that almost 63%](https://github.com/libp2p/specs/blob/master/ROADMAP.md#-hole-punching-on-tcp-and-quic) of the network was undialable.  This project aims to implement Decentralized Hole Punching in js-libp2p and bring it to parity with the Go and Rust implementations.

**Goal**:
1. [AutoNat](https://github.com/libp2p/js-libp2p/issues/1005) - Determine whether a node is public or private (located behind a firewall or a NAT.) This is a dependency for enabling the DHT in server mode by default for projects like js-ipfs.
2. [Circuit Relay v2](https://github.com/libp2p/js-libp2p/issues/1029) - Connect to,  request reservations, and establish a secure relay connection through discovered public relay node.
3. Add QUIC Transport - Hole punching is [more reliable with UDP](https://www.notion.so/pl-strflt/NAT-Hole-punching-Success-Rate-2022-09-29-Data-Analysis-8e72705ca3cc49ab983bc5e8792e3e98#5b76991da8d24736abd486aa93e85a97) (therefore QUIC) than TCP. This requires adding support for QUIC in js-libp2p. There is some work [being done here](https://github.com/nodejs/node/pull/44325) to add support in node.js which we depend on.
4. Hole Punching - Use [DCUtR](https://github.com/libp2p/specs/blob/master/relay/DCUtR.md) to synchronize hole punching


### C. 🧪 Future-proof Testing
<!--- TODO: Link to GitHub Epic -->
**Why**:  JS support doesn't exist in Testground yet. In addition to the work to get generic JS test runners, we need support in Testground.

**Goal**:
1. [Browser Environment Tests](https://github.com/testground/testground/issues/1386): Add support for testing browser features within a browser environment.
2. Test DHT Server Mode at scale: Requires adding support for js-libp2p in Testground. Server mode is implemented but we need a way to ensure it works and to do that we need a very large network testbed (>20 node at least; ideally 100/1000+.)

### Libp2p Project Roadmap
Roadmap items in this document were sourced from our the overarching libp2p project roadmap: https://github.com/libp2p/specs/blob/master/ROADMAP.md
