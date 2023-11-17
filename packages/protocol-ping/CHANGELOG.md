# Changelog

## 1.0.0 (2023-11-17)


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
    * @libp2p/crypto bumped from ^2.0.8 to ^2.0.9
    * @libp2p/interface bumped from ^0.1.2 to ^1.0.0
    * @libp2p/interface-internal bumped from ^0.1.5 to ^0.1.10
    * @libp2p/peer-id-factory bumped from ^3.0.8 to ^3.0.9
  * devDependencies
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0