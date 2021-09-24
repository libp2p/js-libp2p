# js-libp2p-identify

> libp2p Identify Protocol

**Note**: git history prior to merging into js-libp2p can be found in the original repository, https://github.com/libp2p/js-libp2p-identify.

## Description

Identify is a STUN protocol, used by libp2p in order to broadcast and learn about the `ip:port` pairs a specific peer is available through and to know when a new stream muxer is established, so a conn can be reused.

## How does it work

The spec for Identify and Identify Push is at [libp2p/specs](https://github.com/libp2p/specs/tree/master/identify).
