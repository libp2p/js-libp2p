# Changelog

## [2.0.1](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.0...autonat-v2-v2.0.1) (2025-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^3.0.0 to ^3.0.1
    * @libp2p/peer-collections bumped from ^7.0.0 to ^7.0.1
    * @libp2p/utils bumped from ^7.0.0 to ^7.0.1
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.9 to ^5.1.10
    * @libp2p/logger bumped from ^6.0.0 to ^6.0.1
    * @libp2p/peer-id bumped from ^6.0.0 to ^6.0.1

## [2.0.0](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v1.0.1...autonat-v2-v2.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* requires @mulitformats/multiaddr 13.x.x or later
* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* update @multiformats/multiaddr to 13.x.x ([#3268](https://github.com/libp2p/js-libp2p/issues/3268)) ([b8ecade](https://github.com/libp2p/js-libp2p/commit/b8ecade2a725d38d11dd8df888c5abb22e14f26b))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/interface-internal bumped from ^2.3.19 to ^3.0.0
    * @libp2p/peer-collections bumped from ^6.0.35 to ^7.0.0
    * @libp2p/utils bumped from ^6.7.2 to ^7.0.0
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.8 to ^5.1.9
    * @libp2p/logger bumped from ^5.2.0 to ^6.0.0
    * @libp2p/peer-id bumped from ^5.1.9 to ^6.0.0

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v1.0.0...autonat-v2-v1.0.1) (2025-08-19)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.5 to ^2.11.0
    * @libp2p/interface-internal bumped from ^2.3.18 to ^2.3.19
    * @libp2p/peer-collections bumped from ^6.0.34 to ^6.0.35
    * @libp2p/utils bumped from ^6.7.1 to ^6.7.2
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.7 to ^5.1.8
    * @libp2p/logger bumped from ^5.1.21 to ^5.2.0
    * @libp2p/peer-id bumped from ^5.1.8 to ^5.1.9

## 1.0.0 (2025-06-25)


### Features

* implement AutoNATv2 ([#3196](https://github.com/libp2p/js-libp2p/issues/3196)) ([d2dc12c](https://github.com/libp2p/js-libp2p/commit/d2dc12c7d5b13c05d5c1682e4722307e0c685242))


### Documentation

* update autonat v2 readme ([#3198](https://github.com/libp2p/js-libp2p/issues/3198)) ([1a716dc](https://github.com/libp2p/js-libp2p/commit/1a716dc6b33f439e267ef98ff845898571cbd965))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.10.4 to ^2.10.5
    * @libp2p/interface-internal bumped from ^2.3.17 to ^2.3.18
    * @libp2p/peer-collections bumped from ^6.0.33 to ^6.0.34
    * @libp2p/utils bumped from ^6.7.0 to ^6.7.1
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.6 to ^5.1.7
    * @libp2p/logger bumped from ^5.1.20 to ^5.1.21
    * @libp2p/peer-id bumped from ^5.1.7 to ^5.1.8
