# [0.13.0](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.12.3...v0.13.0) (2021-07-08)


### chore

* update deps ([#114](https://github.com/libp2p/js-libp2p-bootstrap/issues/114)) ([597144f](https://github.com/libp2p/js-libp2p-bootstrap/commit/597144f9c0e0a9674c5e90595d516d191b83a11f))


### BREAKING CHANGES

* uses new peer-id, multiaddr and friends



## [0.12.3](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.12.2...v0.12.3) (2021-04-13)


### Bug Fixes

* build ([#113](https://github.com/libp2p/js-libp2p-bootstrap/issues/113)) ([aeab2bf](https://github.com/libp2p/js-libp2p-bootstrap/commit/aeab2bf46dfd5d7026e9e2b06be9c0b88bd75de1))



## [0.12.2](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.12.1...v0.12.2) (2021-02-08)


### Features

* add types and update deps ([#111](https://github.com/libp2p/js-libp2p-bootstrap/issues/111)) ([269b807](https://github.com/libp2p/js-libp2p-bootstrap/commit/269b80782c4640dbbb7d66de0345703086c03f24))



<a name="0.12.1"></a>
## [0.12.1](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.11.0...v0.12.1) (2020-08-11)


### Bug Fixes

* replace node buffers with uint8arrays ([#106](https://github.com/libp2p/js-libp2p-bootstrap/issues/106)) ([b59b7ad](https://github.com/libp2p/js-libp2p-bootstrap/commit/b59b7ad))


### BREAKING CHANGES

* - The deps of this module have Uint8Array properties



<a name="0.12.0"></a>
# [0.12.0](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.11.0...v0.12.0) (2020-08-10)


### Bug Fixes

* replace node buffers with uint8arrays ([#106](https://github.com/libp2p/js-libp2p-bootstrap/issues/106)) ([b59b7ad](https://github.com/libp2p/js-libp2p-bootstrap/commit/b59b7ad))


### BREAKING CHANGES

* - The deps of this module have Uint8Array properties



<a name="0.11.0"></a>
# [0.11.0](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.10.4...v0.11.0) (2020-04-21)


### Chores

* peer-discovery not using peer-info ([8a99f1b](https://github.com/libp2p/js-libp2p-bootstrap/commit/8a99f1b))


### BREAKING CHANGES

* peer event emits an object with id and multiaddr instead of a peer-info



<a name="0.10.4"></a>
## [0.10.4](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.10.3...v0.10.4) (2020-02-14)


### Bug Fixes

* remove use of assert module ([#99](https://github.com/libp2p/js-libp2p-bootstrap/issues/99)) ([29b8aa6](https://github.com/libp2p/js-libp2p-bootstrap/commit/29b8aa6))



<a name="0.10.3"></a>
## [0.10.3](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.10.2...v0.10.3) (2019-11-28)


### Bug Fixes

* validate list ([#97](https://github.com/libp2p/js-libp2p-bootstrap/issues/97)) ([5041f28](https://github.com/libp2p/js-libp2p-bootstrap/commit/5041f28))



<a name="0.10.2"></a>
## [0.10.2](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.10.1...v0.10.2) (2019-08-01)



<a name="0.10.1"></a>
## [0.10.1](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.10.0...v0.10.1) (2019-07-31)


### Bug Fixes

* use callback in start from js-libp2p ([#93](https://github.com/libp2p/js-libp2p-bootstrap/issues/93)) ([74c305d](https://github.com/libp2p/js-libp2p-bootstrap/commit/74c305d))



<a name="0.10.0"></a>
# [0.10.0](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.9.7...v0.10.0) (2019-07-15)


### Code Refactoring

* callbacks -> async/await ([#89](https://github.com/libp2p/js-libp2p-bootstrap/issues/89)) ([77cfc28](https://github.com/libp2p/js-libp2p-bootstrap/commit/77cfc28))


### BREAKING CHANGES

* All places in the API that used callbacks are now replaced with async/await



<a name="0.9.7"></a>
## [0.9.7](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.9.6...v0.9.7) (2019-01-10)



<a name="0.9.6"></a>
## [0.9.6](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.9.5...v0.9.6) (2019-01-04)



<a name="0.9.5"></a>
## [0.9.5](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.9.4...v0.9.5) (2019-01-03)


### Bug Fixes

* discover peers faster ([#86](https://github.com/libp2p/js-libp2p-bootstrap/issues/86)) ([63a6d10](https://github.com/libp2p/js-libp2p-bootstrap/commit/63a6d10)), closes [#85](https://github.com/libp2p/js-libp2p-bootstrap/issues/85)



<a name="0.9.4"></a>
## [0.9.4](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.9.3...v0.9.4) (2018-11-26)


### Bug Fixes

* rename railing -> bootstrap ([#81](https://github.com/libp2p/js-libp2p-bootstrap/issues/81)) ([bda0dc8](https://github.com/libp2p/js-libp2p-bootstrap/commit/bda0dc8))



<a name="0.9.3"></a>
## [0.9.3](https://github.com/libp2p/js-libp2p-bootstrap/compare/v0.9.2...v0.9.3) (2018-07-02)



<a name="0.9.2"></a>
## [0.9.2](https://github.com/libp2p/js-libp2p-railing/compare/v0.9.1...v0.9.2) (2018-06-29)


### Bug Fixes

* name of property and make it stop properly ([#77](https://github.com/libp2p/js-libp2p-railing/issues/77)) ([8f9bef6](https://github.com/libp2p/js-libp2p-railing/commit/8f9bef6))



<a name="0.9.1"></a>
## [0.9.1](https://github.com/libp2p/js-libp2p-railing/compare/v0.9.0...v0.9.1) (2018-06-05)



<a name="0.9.0"></a>
# [0.9.0](https://github.com/libp2p/js-libp2p-railing/compare/v0.8.1...v0.9.0) (2018-06-05)


### Features

* (BREAKING CHANGE) constructor takes options. + add tag, update deps and fix tests ([27f9aed](https://github.com/libp2p/js-libp2p-railing/commit/27f9aed))



<a name="0.8.1"></a>
## [0.8.1](https://github.com/libp2p/js-libp2p-railing/compare/v0.8.0...v0.8.1) (2018-04-12)


### Bug Fixes

* add more error handling for malformed bootstrap multiaddr ([#74](https://github.com/libp2p/js-libp2p-railing/issues/74)) ([f65e1ba](https://github.com/libp2p/js-libp2p-railing/commit/f65e1ba))



<a name="0.8.0"></a>
# [0.8.0](https://github.com/libp2p/js-libp2p-railing/compare/v0.7.1...v0.8.0) (2018-04-05)



<a name="0.7.1"></a>
## [0.7.1](https://github.com/libp2p/js-libp2p-railing/compare/v0.7.0...v0.7.1) (2017-09-08)



<a name="0.7.0"></a>
# [0.7.0](https://github.com/libp2p/js-libp2p-railing/compare/v0.6.1...v0.7.0) (2017-09-03)


### Features

* p2p addrs situation ([#70](https://github.com/libp2p/js-libp2p-railing/issues/70)) ([34064b2](https://github.com/libp2p/js-libp2p-railing/commit/34064b2))



<a name="0.6.1"></a>
## [0.6.1](https://github.com/libp2p/js-libp2p-railing/compare/v0.6.0...v0.6.1) (2017-07-23)


### Features

* emit peers every 10 secs ([598fd94](https://github.com/libp2p/js-libp2p-railing/commit/598fd94))



<a name="0.6.0"></a>
# [0.6.0](https://github.com/libp2p/js-libp2p-railing/compare/v0.5.2...v0.6.0) (2017-07-22)



<a name="0.5.2"></a>
## [0.5.2](https://github.com/libp2p/js-libp2p-railing/compare/v0.5.1...v0.5.2) (2017-07-08)



<a name="0.5.1"></a>
## [0.5.1](https://github.com/libp2p/js-libp2p-railing/compare/v0.5.0...v0.5.1) (2017-05-19)


### Bug Fixes

* use async/setImmediate ([0c6f754](https://github.com/libp2p/js-libp2p-railing/commit/0c6f754))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/libp2p/js-libp2p-railing/compare/v0.4.3...v0.5.0) (2017-03-30)


### Features

* update to new peer-info ([a6254d8](https://github.com/libp2p/js-libp2p-railing/commit/a6254d8))



<a name="0.4.3"></a>
## [0.4.3](https://github.com/libp2p/js-libp2p-railing/compare/v0.4.2...v0.4.3) (2017-03-23)


### Bug Fixes

* multiaddr parsing  ([#53](https://github.com/libp2p/js-libp2p-railing/issues/53)) ([7d13ea6](https://github.com/libp2p/js-libp2p-railing/commit/7d13ea6))



<a name="0.4.2"></a>
## [0.4.2](https://github.com/libp2p/js-ipfs-railing/compare/v0.4.1...v0.4.2) (2017-03-21)



