# Changelog

## 1.0.0 (2023-11-17)


### ⚠ BREAKING CHANGES

* imports from `libp2p/identify` need to change to `@libp2p/identify`
* move autonat into separate package (#2107)

### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract identify service into separate module ([#2219](https://www.github.com/libp2p/js-libp2p/issues/2219)) ([72c2f77](https://www.github.com/libp2p/js-libp2p/commit/72c2f775bd85bd4928048dda0fd14740d6fb6a69))
* move autonat into separate package ([#2107](https://www.github.com/libp2p/js-libp2p/issues/2107)) ([b0e8f06](https://www.github.com/libp2p/js-libp2p/commit/b0e8f06f0dcdbda0e367186b093e42e8bff3ee27))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.2 to ^1.0.0
    * @libp2p/interface-internal bumped from ^0.1.5 to ^0.1.10
    * @libp2p/peer-id bumped from ^3.0.2 to ^4.0.0
  * devDependencies
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^3.0.4 to ^3.0.9