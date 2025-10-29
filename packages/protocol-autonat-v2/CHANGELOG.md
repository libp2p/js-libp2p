# Changelog

## [2.0.7](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.6...autonat-v2-v2.0.7) (2025-10-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.2 to ^3.1.0
    * @libp2p/interface-internal bumped from ^3.0.6 to ^3.0.7
    * @libp2p/peer-collections bumped from ^7.0.6 to ^7.0.7
    * @libp2p/utils bumped from ^7.0.6 to ^7.0.7
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.12 to ^5.1.13
    * @libp2p/logger bumped from ^6.1.0 to ^6.2.0
    * @libp2p/peer-id bumped from ^6.0.3 to ^6.0.4

## [2.0.6](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.5...autonat-v2-v2.0.6) (2025-10-22)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^3.0.5 to ^3.0.6
    * @libp2p/peer-collections bumped from ^7.0.5 to ^7.0.6
    * @libp2p/utils bumped from ^7.0.5 to ^7.0.6
  * devDependencies
    * @libp2p/logger bumped from ^6.0.5 to ^6.1.0

## [2.0.5](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.4...autonat-v2-v2.0.5) (2025-10-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^3.0.4 to ^3.0.5
    * @libp2p/peer-collections bumped from ^7.0.4 to ^7.0.5
    * @libp2p/utils bumped from ^7.0.4 to ^7.0.5
  * devDependencies
    * @libp2p/logger bumped from ^6.0.4 to ^6.0.5

## [2.0.4](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.3...autonat-v2-v2.0.4) (2025-10-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.1 to ^3.0.2
    * @libp2p/interface-internal bumped from ^3.0.3 to ^3.0.4
    * @libp2p/peer-collections bumped from ^7.0.3 to ^7.0.4
    * @libp2p/utils bumped from ^7.0.3 to ^7.0.4
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.11 to ^5.1.12
    * @libp2p/logger bumped from ^6.0.3 to ^6.0.4
    * @libp2p/peer-id bumped from ^6.0.2 to ^6.0.3

## [2.0.3](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.2...autonat-v2-v2.0.3) (2025-10-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^3.0.0 to ^3.0.1
    * @libp2p/interface-internal bumped from ^3.0.2 to ^3.0.3
    * @libp2p/peer-collections bumped from ^7.0.2 to ^7.0.3
    * @libp2p/utils bumped from ^7.0.2 to ^7.0.3
  * devDependencies
    * @libp2p/crypto bumped from ^5.1.10 to ^5.1.11
    * @libp2p/logger bumped from ^6.0.2 to ^6.0.3
    * @libp2p/peer-id bumped from ^6.0.1 to ^6.0.2

## [2.0.2](https://github.com/libp2p/js-libp2p/compare/autonat-v2-v2.0.1...autonat-v2-v2.0.2) (2025-09-27)


### Bug Fixes

* update error logs to use %e token ([#3261](https://github.com/libp2p/js-libp2p/issues/3261)) ([e10c5c0](https://github.com/libp2p/js-libp2p/commit/e10c5c0c51876ab83da51d558ee4789fc3c38a49))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^3.0.1 to ^3.0.2
    * @libp2p/peer-collections bumped from ^7.0.1 to ^7.0.2
    * @libp2p/utils bumped from ^7.0.1 to ^7.0.2
  * devDependencies
    * @libp2p/logger bumped from ^6.0.1 to ^6.0.2

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
