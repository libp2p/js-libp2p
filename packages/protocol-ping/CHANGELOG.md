# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.11 to ^1.0.0

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^1.0.0 to ^1.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.10 to ^4.0.0

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^1.0.1 to ^1.0.2

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^3.0.1 to ^3.0.2
    * @libp2p/interface bumped from ^1.0.1 to ^1.0.2
    * @libp2p/interface-internal bumped from ^1.0.2 to ^1.0.3
    * @libp2p/peer-id-factory bumped from ^4.0.0 to ^4.0.1
  * devDependencies
    * @libp2p/logger bumped from ^4.0.1 to ^4.0.2

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^3.0.2 to ^3.0.3
    * @libp2p/interface bumped from ^1.0.2 to ^1.1.0
    * @libp2p/interface-internal bumped from ^1.0.3 to ^1.0.4
    * @libp2p/peer-id-factory bumped from ^4.0.1 to ^4.0.2
  * devDependencies
    * @libp2p/logger bumped from ^4.0.2 to ^4.0.3

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^3.0.4 to ^4.0.0
    * @libp2p/interface-internal bumped from ^1.0.5 to ^1.0.6
  * devDependencies
    * @libp2p/peer-id-factory bumped from ^4.0.3 to ^4.0.4

## [1.0.8](https://github.com/libp2p/js-libp2p/compare/ping-v1.0.7...ping-v1.0.8) (2024-01-06)


### Bug Fixes

* remove extra deps ([#2340](https://github.com/libp2p/js-libp2p/issues/2340)) ([53e83ee](https://github.com/libp2p/js-libp2p/commit/53e83eea50410391ec9cff4cd8097210b93894ff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^3.0.3 to ^3.0.4
    * @libp2p/interface bumped from ^1.1.0 to ^1.1.1
    * @libp2p/interface-internal bumped from ^1.0.4 to ^1.0.5
  * devDependencies
    * @libp2p/logger bumped from ^4.0.3 to ^4.0.4
    * @libp2p/peer-id-factory bumped from ^4.0.2 to ^4.0.3

## [1.0.4](https://github.com/libp2p/js-libp2p/compare/ping-v1.0.3...ping-v1.0.4) (2023-12-02)


### Bug Fixes

* do not wait for stream reads and writes at the same time ([#2290](https://github.com/libp2p/js-libp2p/issues/2290)) ([10ea197](https://github.com/libp2p/js-libp2p/commit/10ea19700ae0c464734c88eb5922e2faeb27446a))

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/ping-v1.0.0...ping-v1.0.1) (2023-11-30)


### Bug Fixes

* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^3.0.0 to ^3.0.1
    * @libp2p/interface bumped from ^1.0.0 to ^1.0.1
    * @libp2p/interface-internal bumped from ^0.1.10 to ^0.1.11
    * @libp2p/peer-id-factory bumped from ^3.0.9 to ^3.0.10
  * devDependencies
    * @libp2p/logger bumped from ^4.0.0 to ^4.0.1

## 1.0.0 (2023-11-28)


### ⚠ BREAKING CHANGES

* imports from `libp2p/dcutr` now need to be from `@libp2p/dcutr`
* imports from `libp2p/identify` need to change to `@libp2p/identify`
* imports from `libp2p/ping` must be updated to `@libp2p/ping`

### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract DCUtR into separate module ([#2220](https://www.github.com/libp2p/js-libp2p/issues/2220)) ([d2c3e72](https://www.github.com/libp2p/js-libp2p/commit/d2c3e7235b64558c6cace414c54a42659fee2970))
* extract identify service into separate module ([#2219](https://www.github.com/libp2p/js-libp2p/issues/2219)) ([72c2f77](https://www.github.com/libp2p/js-libp2p/commit/72c2f775bd85bd4928048dda0fd14740d6fb6a69))
* extract ping service into separate module ([#2218](https://www.github.com/libp2p/js-libp2p/issues/2218)) ([556282a](https://www.github.com/libp2p/js-libp2p/commit/556282afdc9b328fd58df1045dc7c792199be932))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/crypto bumped from ^2.0.8 to ^3.0.0
    * @libp2p/interface bumped from ^0.1.2 to ^1.0.0
    * @libp2p/interface-internal bumped from ^0.1.5 to ^0.1.10
    * @libp2p/peer-id-factory bumped from ^3.0.8 to ^3.0.9
  * devDependencies
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0
