# js-libp2p-identify

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/libp2p/js-libp2p-identify/badge.svg?branch=master)](https://coveralls.io/github/libp2p/js-libp2p-identify?branch=master)
[![Travis CI](https://travis-ci.org/libp2p/js-libp2p-identify.svg?branch=master)](https://travis-ci.org/libp2p/js-libp2p-identify)
[![Circle CI](https://circleci.com/gh/libp2p/js-libp2p-identify.svg?style=svg)](https://circleci.com/gh/libp2p/js-libp2p-identify)
[![Dependency Status](https://david-dm.org/libp2p/js-libp2p-identify.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-identify) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)

> libp2p Identify Protocol

Identify is one of the protocols swarms speaks in order to
broadcast and learn about the `ip:port` pairs a specific peer
is available through and to know when a new stream muxer is
established, so a conn can be reused.
