# Changelog

### [0.1.4](https://www.github.com/libp2p/js-libp2p/compare/interface-internal-v0.1.3...interface-internal-v0.1.4) (2023-08-16)


### Features

* **libp2p:** direct connection through relay protocol (DCUtR) ([#1928](https://www.github.com/libp2p/js-libp2p/issues/1928)) ([87dc7e9](https://www.github.com/libp2p/js-libp2p/commit/87dc7e9fc17becc4b5c3ce4f3febd28cf9f25c6e))

### [0.1.3](https://www.github.com/libp2p/js-libp2p/compare/interface-internal-v0.1.2...interface-internal-v0.1.3) (2023-08-14)


### Bug Fixes

* update project config ([9c0353c](https://www.github.com/libp2p/js-libp2p/commit/9c0353cf5a1e13196ca0e7764f87e36478518f69))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.1 to ^0.1.2
    * @libp2p/peer-collections bumped from ^4.0.2 to ^4.0.3

### [0.1.2](https://www.github.com/libp2p/js-libp2p/compare/interface-internal-v0.1.1...interface-internal-v0.1.2) (2023-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.0 to ^0.1.1
    * @libp2p/peer-collections bumped from ^4.0.1 to ^4.0.2

### [0.1.1](https://www.github.com/libp2p/js-libp2p/compare/interface-internal-v0.1.0...interface-internal-v0.1.1) (2023-08-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/peer-collections bumped from ^4.0.0 to ^4.0.1

## [0.1.0](https://www.github.com/libp2p/js-libp2p/compare/interface-internal-v0.0.1...interface-internal-v0.1.0) (2023-07-31)


### ⚠ BREAKING CHANGES

* the `.close`, `closeRead` and `closeWrite` methods on the `Stream` interface are now asynchronous
* `stream.stat.*` and `conn.stat.*` properties are now accessed via `stream.*` and `conn.*`
* consolidate interface modules (#1833)

### Features

* mark connections with limits as transient ([#1890](https://www.github.com/libp2p/js-libp2p/issues/1890)) ([a1ec46b](https://www.github.com/libp2p/js-libp2p/commit/a1ec46b5f5606b7bdf3e5b085013fb88e26439f9))
* merge stat properties into stream/connection objects ([#1856](https://www.github.com/libp2p/js-libp2p/issues/1856)) ([e9cafd3](https://www.github.com/libp2p/js-libp2p/commit/e9cafd3d8ab0f8e0655ff44e04aa41fccc912b51)), closes [#1849](https://www.github.com/libp2p/js-libp2p/issues/1849)


### Bug Fixes

* close streams gracefully ([#1864](https://www.github.com/libp2p/js-libp2p/issues/1864)) ([b36ec7f](https://www.github.com/libp2p/js-libp2p/commit/b36ec7f24e477af21cec31effc086a6c611bf271)), closes [#1793](https://www.github.com/libp2p/js-libp2p/issues/1793) [#656](https://www.github.com/libp2p/js-libp2p/issues/656)
* consolidate interface modules ([#1833](https://www.github.com/libp2p/js-libp2p/issues/1833)) ([4255b1e](https://www.github.com/libp2p/js-libp2p/commit/4255b1e2485d31e00c33efa029b6426246ea23e3))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ~0.0.1 to ^0.1.0
    * @libp2p/peer-collections bumped from ^3.0.0 to ^4.0.0
