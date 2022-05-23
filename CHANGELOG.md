### [1.0.7](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.6...v1.0.7) (2022-05-23)


### Bug Fixes

* update deps ([#127](https://github.com/libp2p/js-libp2p-mdns/issues/127)) ([1f8654e](https://github.com/libp2p/js-libp2p-mdns/commit/1f8654e9387e5987714142e79038a16d5a1f94ac))

### [1.0.6](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.5...v1.0.6) (2022-05-06)


### Bug Fixes

* update interfaces ([#124](https://github.com/libp2p/js-libp2p-mdns/issues/124)) ([bbb0c62](https://github.com/libp2p/js-libp2p-mdns/commit/bbb0c62e0456044383a684ac8a271136360ee565))

### [1.0.5](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.4...v1.0.5) (2022-05-04)


### Bug Fixes

* update interfaces ([#123](https://github.com/libp2p/js-libp2p-mdns/issues/123)) ([d2692a1](https://github.com/libp2p/js-libp2p-mdns/commit/d2692a101965d233922d6b66d640928b1bd9ab74))

### [1.0.4](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.3...v1.0.4) (2022-04-09)


### Trivial Changes

* update aegir ([#122](https://github.com/libp2p/js-libp2p-mdns/issues/122)) ([37b689f](https://github.com/libp2p/js-libp2p-mdns/commit/37b689fb7e22887b050a6177bf05f9fc304563f9))

### [1.0.3](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.2...v1.0.3) (2022-03-24)


### Bug Fixes

* update interfaces ([#117](https://github.com/libp2p/js-libp2p-mdns/issues/117)) ([d454b94](https://github.com/libp2p/js-libp2p-mdns/commit/d454b94738ba3caf1b2e3da7cd43dd8f1863ed6d))

### [1.0.2](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.1...v1.0.2) (2022-03-16)


### Bug Fixes

* update interfaces ([#116](https://github.com/libp2p/js-libp2p-mdns/issues/116)) ([30ec23a](https://github.com/libp2p/js-libp2p-mdns/commit/30ec23a5bc2e983fe01e0e47e46ecedf4c0eab5d))

### [1.0.1](https://github.com/libp2p/js-libp2p-mdns/compare/v1.0.0...v1.0.1) (2022-02-12)


### Bug Fixes

* update to latest interfaces ([#114](https://github.com/libp2p/js-libp2p-mdns/issues/114)) ([4322c1e](https://github.com/libp2p/js-libp2p-mdns/commit/4322c1e8462cb3dde16435efc23303923bbc7d86))

## [1.0.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.18.0...v1.0.0) (2022-02-11)


### ⚠ BREAKING CHANGES

* switch to named exports, ESM only

### Features

* convert to typescript ([#113](https://github.com/libp2p/js-libp2p-mdns/issues/113)) ([296791e](https://github.com/libp2p/js-libp2p-mdns/commit/296791ec3364199ea5a2de6ee6fec0aadf318392))

# [0.18.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.17.0...v0.18.0) (2021-12-02)


### chore

* update to new peer-id ([#102](https://github.com/libp2p/js-libp2p-mdns/issues/102)) ([d88eda5](https://github.com/libp2p/js-libp2p-mdns/commit/d88eda5fca9a589ecba519be89150f25a36271e6))


### BREAKING CHANGES

* requires node 15+



# [0.17.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.16.0...v0.17.0) (2021-07-08)


### chore

* update deps ([#100](https://github.com/libp2p/js-libp2p-mdns/issues/100)) ([0b974bc](https://github.com/libp2p/js-libp2p-mdns/commit/0b974bc9e0d110303e2d15a173447ec5631d15f9))


### BREAKING CHANGES

* uses then new multiaddr and friends



# [0.16.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.13.3...v0.16.0) (2021-04-13)


### Bug Fixes

* actually check tcp multiaddrs ([#94](https://github.com/libp2p/js-libp2p-mdns/issues/94)) ([9f45f73](https://github.com/libp2p/js-libp2p-mdns/commit/9f45f731e91f225016d11cc3471bd0874e4b5490))
* ensure event handlers are removed on MulticastDNS.stop ([#96](https://github.com/libp2p/js-libp2p-mdns/issues/96)) ([9fea1f6](https://github.com/libp2p/js-libp2p-mdns/commit/9fea1f6eb9d68b8e7c145e8b615ac504e0031b0e))


### chore

* peer-discovery not using peer-info ([#90](https://github.com/libp2p/js-libp2p-mdns/issues/90)) ([fca175e](https://github.com/libp2p/js-libp2p-mdns/commit/fca175e6bc706be07a14b81ef3b3c8143ce97a0a))


### BREAKING CHANGES

* peer event emitted with id and multiaddrs properties instead of peer-info

* chore: add tests for peer-discovery interface

* chore: apply suggestions from code review

Co-Authored-By: Jacob Heun <jacobheun@gmail.com>

* chore: update readme with peerData and peerId

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



<a name="0.15.0"></a>
# [0.15.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.14.3...v0.15.0) (2020-08-11)


### Chores

* upgrade deps ([#97](https://github.com/libp2p/js-libp2p-mdns/issues/97)) ([3cf0e75](https://github.com/libp2p/js-libp2p-mdns/commit/3cf0e75))


### BREAKING CHANGES

* - All deps of this module now use Uint8Arrays instead of node Buffers

* chore: address pr comments



<a name="0.14.3"></a>
## [0.14.3](https://github.com/libp2p/js-libp2p-mdns/compare/v0.14.2...v0.14.3) (2020-08-07)


### Bug Fixes

* ensure event handlers are removed on MulticastDNS.stop ([#96](https://github.com/libp2p/js-libp2p-mdns/issues/96)) ([9fea1f6](https://github.com/libp2p/js-libp2p-mdns/commit/9fea1f6))



<a name="0.14.2"></a>
## [0.14.2](https://github.com/libp2p/js-libp2p-mdns/compare/v0.14.1...v0.14.2) (2020-07-02)


### Bug Fixes

* actually check tcp multiaddrs ([#94](https://github.com/libp2p/js-libp2p-mdns/issues/94)) ([9f45f73](https://github.com/libp2p/js-libp2p-mdns/commit/9f45f73))



<a name="0.14.1"></a>
## [0.14.1](https://github.com/libp2p/js-libp2p-mdns/compare/v0.14.0...v0.14.1) (2020-04-29)



<a name="0.14.0"></a>
# [0.14.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.13.3...v0.14.0) (2020-04-23)


### Chores

* peer-discovery not using peer-info ([#90](https://github.com/libp2p/js-libp2p-mdns/issues/90)) ([fca175e](https://github.com/libp2p/js-libp2p-mdns/commit/fca175e))


### BREAKING CHANGES

* peer event emitted with id and multiaddrs properties instead of peer-info

* chore: add tests for peer-discovery interface

* chore: apply suggestions from code review

Co-Authored-By: Jacob Heun <jacobheun@gmail.com>

* chore: update readme with peerData and peerId

Co-authored-by: Jacob Heun <jacobheun@gmail.com>



<a name="0.13.3"></a>
## [0.13.3](https://github.com/libp2p/js-libp2p-mdns/compare/v0.13.2...v0.13.3) (2020-02-17)


### Bug Fixes

* remove use of assert module ([#87](https://github.com/libp2p/js-libp2p-mdns/issues/87)) ([e362b04](https://github.com/libp2p/js-libp2p-mdns/commit/e362b04))



<a name="0.13.2"></a>
## [0.13.2](https://github.com/libp2p/js-libp2p-mdns/compare/v0.13.1...v0.13.2) (2020-02-02)



<a name="0.13.1"></a>
## [0.13.1](https://github.com/libp2p/js-libp2p-mdns/compare/v0.13.0...v0.13.1) (2020-01-17)


### Bug Fixes

* do not emit empty peer info objects ([#85](https://github.com/libp2p/js-libp2p-mdns/issues/85)) ([a88483c](https://github.com/libp2p/js-libp2p-mdns/commit/a88483c))



<a name="0.13.0"></a>
# [0.13.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.12.3...v0.13.0) (2019-09-27)


### Code Refactoring

* callbacks -> async / await ([#78](https://github.com/libp2p/js-libp2p-mdns/issues/78)) ([46d78eb](https://github.com/libp2p/js-libp2p-mdns/commit/46d78eb))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await

* chore: update CI file
* test: add compliance tests



<a name="0.12.3"></a>
## [0.12.3](https://github.com/libp2p/js-libp2p-mdns/compare/v0.12.2...v0.12.3) (2019-05-09)


### Features

* compatibility with go-libp2p-mdns ([#80](https://github.com/libp2p/js-libp2p-mdns/issues/80)) ([c6d1d49](https://github.com/libp2p/js-libp2p-mdns/commit/c6d1d49))



<a name="0.12.2"></a>
## [0.12.2](https://github.com/libp2p/js-libp2p-mdns/compare/v0.12.1...v0.12.2) (2019-01-04)



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-mdns/compare/v0.12.0...v0.12.1) (2018-11-26)



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.11.0...v0.12.0) (2018-06-05)


### Features

* (BREAKING CHANGE) update constructor. add tag ([d3eeb6e](https://github.com/libp2p/js-libp2p-mdns/commit/d3eeb6e))



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.9.2...v0.11.0) (2018-04-05)


### Features

* service names ([#68](https://github.com/libp2p/js-libp2p-mdns/issues/68)) ([fa8fe22](https://github.com/libp2p/js-libp2p-mdns/commit/fa8fe22))
* Use latest multicast-dns and dns-packet ([#69](https://github.com/libp2p/js-libp2p-mdns/issues/69)) ([cb69f2f](https://github.com/libp2p/js-libp2p-mdns/commit/cb69f2f))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.9.2...v0.10.0) (2018-04-05)


### Features

* service names ([#68](https://github.com/libp2p/js-libp2p-mdns/issues/68)) ([fa8fe22](https://github.com/libp2p/js-libp2p-mdns/commit/fa8fe22))
* Use latest multicast-dns and dns-packet ([#69](https://github.com/libp2p/js-libp2p-mdns/issues/69)) ([cb69f2f](https://github.com/libp2p/js-libp2p-mdns/commit/cb69f2f))



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-mdns/compare/v0.9.1...v0.9.2) (2018-01-30)


### Bug Fixes

* Clear interval when stopping ([#63](https://github.com/libp2p/js-libp2p-mdns/issues/63)) ([1d586c3](https://github.com/libp2p/js-libp2p-mdns/commit/1d586c3))
* update deps for [#64](https://github.com/libp2p/js-libp2p-mdns/issues/64) ([#66](https://github.com/libp2p/js-libp2p-mdns/issues/66)) ([d4ed3b3](https://github.com/libp2p/js-libp2p-mdns/commit/d4ed3b3))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-mdns/compare/v0.9.0...v0.9.1) (2017-09-08)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.8.0...v0.9.0) (2017-09-03)


### Features

* p2p addrs situation ([#61](https://github.com/libp2p/js-libp2p-mdns/issues/61)) ([36ed2a1](https://github.com/libp2p/js-libp2p-mdns/commit/36ed2a1))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.7.1...v0.8.0) (2017-07-22)



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-mdns/compare/v0.7.0...v0.7.1) (2017-07-09)


### Bug Fixes

* support optional no options ([dd53646](https://github.com/libp2p/js-libp2p-mdns/commit/dd53646))



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-mdns/compare/v0.6.2...v0.7.0) (2017-03-30)


### Features

* update to that new peer-info everyone is talking about ([3fd3602](https://github.com/libp2p/js-libp2p-mdns/commit/3fd3602))



<a name="0.6.2"></a>
## [0.6.2](https://github.com/libp2p/js-libp2p-mdns/compare/v0.6.1...v0.6.2) (2017-03-21)
