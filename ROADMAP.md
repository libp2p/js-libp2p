# js-libp2p roadmap Q4’22/Q1’23  <!-- omit in toc -->

```
Date: 2022-10-07
Status: In Progress
Notes: This document is still in review will may be heavily modified based on stakeholder feedback. Please add any feedback or questions in:
https://github.com/libp2p/js-libp2p/issues/1438
```

## Table of Contents <!-- omit in toc -->

- [About the Roadmap](#about-the-roadmap)
	- [Vision](#vision)
	- [Sections](#sections)
	- [Done criteria](#done-criteria)
	- [Benchmarking and Testing](#benchmarking-and-testing)
- [🛣️ Milestones](#️-milestones)
	- [2022](#2022)
		- [Early Q4 (October)](#early-q4-october)
		- [Mid Q4 (November)](#mid-q4-november)
		- [End of Q4 (December)](#end-of-q4-december)
	- [2023](#2023)
		- [Early Q1 (January)](#early-q1-january)
		- [Mid Q1 (February)](#mid-q1-february)
		- [End of Q1 (March)](#end-of-q1-march)
		- [Early Q2 (April)](#early-q2-april)
	- [Up Next](#up-next)
- [📖 Appendix](#-appendix)
	- [A. 📺 Universal Browser Connectivity](#a--universal-browser-connectivity)
		- [1. WebTransport](#1-webtransport)
		- [2. WebRTC: Browser to Server](#2-webrtc-browser-to-server)
		- [3. WebRTC: Browser to Browser](#3-webrtc-browser-to-browser)
	- [B. 🥊 Decentralized Hole Punching](#b--decentralized-hole-punching)
		- [1. AutoNat](#1-autonat)
		- [2. Circuit Relay v2](#2-circuit-relay-v2)
		- [3. Add QUIC Transport](#3-add-quic-transport)
		- [4. Hole Punching](#4-hole-punching)
	- [C. 🔮 Ergonomic Observability](#c--ergonomic-observability)
		- [1. Ergonomic metrics API](#1-ergonomic-metrics-api)

## About the Roadmap

### Vision
We, the maintainers, are committed to upholding libp2p's shared core tenets and ensuring js-libp2p is: [**Secure, Stable, Specified, and Performant.**](https://github.com/libp2p/specs/blob/master/ROADMAP.md#core-tenets)

Roadmap items in this document were sourced in part from the [overarching libp2p project roadmap.](https://github.com/libp2p/specs/blob/master/ROADMAP.md)

### Sections
This document consists of two sections: [Milestones](#️-milestones) and the [Appendix](#-appendix)

[Milestones](#️-milestones) is our best educated guess (not a hard commitment) around when we plan to ship the key features.
Where possible projects are broken down into discrete sub-projects e.g. project "A" may contain two sub-projects: A.1 and A.2

A project is signified as "complete" once all of it's sub-projects are shipped.

The [Appendix](#-appendix) section describes a project's high-level motivation, goals, and lists sub-projects.

Each Appendix header is linked to a GitHub Epic. Latest information on progress can be found in the Epics and child issues.

### Done criteria
The "Definition of Done" for projects/sub-projects that involve writing new protocols/ modify existing ones usually consist of the following:
- If a specification change is required:
    - [ ] Spec is merged and classified as "Candidate Recommendation"
    - [ ] (by virtue of the above) At least one major reference implementation exists
- [ ] A well established testing criteria is met (defined at the outset of the project including but not limited to testing via Testground, compatibility tests with other implementations in the Release process, etc.)
- [ ] Public documentation (on docs.libp2p.io) exists

Supporting projects (such as testing or benchmarking) may have different criteria.

### Benchmarking and Testing
As mentioned in our [vision](#vision), performance and stability are core libp2p tenets. Rigorous benchmarking and testing help us uphold them. Related projects are listed in the [libp2p/test-plans roadmap](https://github.com/libp2p/test-plans/blob/master/ROADMAP.md) and the [testground/testground roadmap](https://github.com/testground/testground/blob/master/ROADMAP.md). Our major priorities in Q4’22 and Q1’23 are:
- [interoperability testing](https://github.com/libp2p/test-plans/issues/53) (across implementations & versions and between transports, muxers, & security protocols)
- [add a browser environment test harness to support testing browser features](https://github.com/testground/testground/issues/1386)
- test DHT Server Mode at scale (testbed of at least >20 nodes; ideally 100/1000+) in Testground
- [performance benchmark js-libp2p using Testground](https://github.com/testground/testground/pull/1425) (create a benchmark suite to run in CI)

These projects are parallel workstreams, weighed equally with roadmap items in this document. Some efforts like interoperability testing have a higher priority than implementation projects. The js-libp2p maintainers co-own these efforts with the go-libp2p, rust-libp2p, and Testground maintainers.

## 🛣️ Milestones
### 2022

#### Early Q4 (October)
- [A.1 📺 WebTransport](#1-webtransport)
  
#### Mid Q4 (November)
- [C.1 🔮 Benchmark transfer performance in CI](#1-benchmark-transfer-performance-in-ci)

#### End of Q4 (December)
- [A.2 📺 WebRTC: Browser to Server](#2-webrtc-browser-to-server)
- [B.1 🥊 AutoNat](#1-autonat)
- [B.2 🥊 Circuit Relay v2](#2-circuit-relay-v2)

### 2023

#### Early Q1 (January)
- [C.1 🔮 Ergonomic metrics API](#1-ergonomic-metrics-api)

#### Mid Q1 (February)
- [A.3 📺 WebRTC: Browser to Browser](#3-webrtc-browser-to-browser)

#### End of Q1 (March)
- [B.3 🥊 Add QUIC Transport](#3-add-quic-transport)

#### Early Q2 (April)
- [B.4 🥊 Hole Punching](#4-hole-punching)
	- 🎉 Estimated Project Completion

### Up Next


## 📖 Appendix
### A. 📺 Universal Browser Connectivity
<!--- TODO: Link to GitHub Epic -->

**Why**: A huge part of “the Web” is happening inside the browser. As a universal p2p networking stack, libp2p needs to be able to offer solutions for browser users.

**Goal**: js-libp2p supports both WebTransport and (libp2p-) WebRTC protocols, enabled by default. This allows connections between browsers and public nodes, and eventually between browsers and non-public nodes and in between browser nodes.

#### 1. [WebTransport](https://github.com/libp2p/js-libp2p-webtransport/issues/1)
Implementation of WebTransport in js-libp2p. Allows for interoperability with go-libp2p.
#### 2. [WebRTC: Browser to Server](https://github.com/little-bear-labs/js-libp2p-webrtc/pull/4)
Add support for WebRTC transport in js-libp2p, enabling browser connectivity with servers. This will cover the browsers that don't support WebTransport (most notable is iOS Safari). This is getting close to finalized.
#### 3. WebRTC: Browser to Browser
Even though this use case is made possible by [webrtc-star](https://github.com/libp2p/js-libp2p-webrtc-star) and [webrtc-direct](https://github.com/libp2p/js-libp2p-webrtc-direct) currently, they are a less than ideal solutions. Both libraries have shortcomings, aren't implemented in other languages, and don't employ newer libp2p advancements such as Circuit Relay v2, DCUtR, and authentication via Noise. Therefore, we want to support WebRTC Browser to Browser as a first class transport in js-libp2p and deprecate the previous libraries. A follow up to A.2 where we will begin the work to specify the semantics of browser to browser connectivity and then implement it in js-libp2p.

### B. 🥊 Decentralized Hole Punching
<!--- TODO: Link to GitHub Epic -->
**Why**:  P2P networks can have a combination of both public and private nodes. While private nodes can dial nodes on the public Internet, they are unreachable from the outside as they are behind a NAT or a firewall. We need a mechanism to dial them. A [previous DHT crawl found that almost 63%](https://github.com/libp2p/specs/blob/master/ROADMAP.md#-hole-punching-on-tcp-and-quic) of the network was undialable.

**Goal:** Implement Decentralized Hole Punching in js-libp2p and bring it to parity with the Go and Rust implementations.
#### 1. [AutoNat](https://github.com/libp2p/js-libp2p/issues/1005)
Determine whether a node is public or private (located behind a firewall or a NAT.) This is a dependency for enabling the DHT in server mode by default for projects like js-ipfs.
#### 2. [Circuit Relay v2](https://github.com/libp2p/js-libp2p/issues/1029)
Connect to, request reservations, and establish a secure relay connection through discovered public relay node.
#### 3. Add QUIC Transport
Hole punching is [more reliable with UDP (therefore QUIC)](https://www.notion.so/pl-strflt/NAT-Hole-punching-Success-Rate-2022-09-29-Data-Analysis-8e72705ca3cc49ab983bc5e8792e3e98#5b76991da8d24736abd486aa93e85a97) than TCP. This requires adding support for QUIC in js-libp2p. There is some work [being done here](https://github.com/nodejs/node/pull/44325) to add support in node.js which we depend on.
#### 4. Hole Punching
Use [DCUtR](https://github.com/libp2p/specs/blob/master/relay/DCUtR.md) to synchronize hole punching

### C. 🔮 Ergonomic Observability
***Why*** Though we already expose [per-component metrics](https://github.com/libp2p/js-libp2p/issues/1060) in js-libp2p, the overhead of recording metrics is high (excessive object allocation per metric to record). This will be helpful to [our users](https://github.com/chainsafe/lodestar) who record metrics on the order of thousands/second.

***Goal***
We make the lives of js-libp2p easier by adding an improved metrics API.

#### 1. Ergonomic metrics API
Create a ergonomic, generalized metrics recording interface which addresses current allocation overhead and duplication of information. Do not bloat the browser bundle with [prom-client](https://github.com/siimon/prom-client).)
