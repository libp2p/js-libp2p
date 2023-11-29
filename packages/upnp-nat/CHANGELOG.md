# Changelog

## [2.0.0](https://www.github.com/libp2p/js-libp2p/compare/upnp-nat-v1.0.0...upnp-nat-v2.0.0) (2023-11-29)


### ⚠ BREAKING CHANGES

* imports from `libp2p/identify` need to change to `@libp2p/identify`
* imports from `libp2p/upnp-nat` should be updated to `@libp2p/upnp-nat`

### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract identify service into separate module ([#2219](https://www.github.com/libp2p/js-libp2p/issues/2219)) ([72c2f77](https://www.github.com/libp2p/js-libp2p/commit/72c2f775bd85bd4928048dda0fd14740d6fb6a69))
* extract UPnP NAT into separate module ([#2217](https://www.github.com/libp2p/js-libp2p/issues/2217)) ([f29b73f](https://www.github.com/libp2p/js-libp2p/commit/f29b73f781afcea36cba0589aafdd81e1852e194))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.10 to ^0.1.11
  * devDependencies
    * @libp2p/peer-id-factory bumped from ^3.0.9 to ^3.0.10

## 1.0.0 (2023-11-28)


### ⚠ BREAKING CHANGES

* imports from `libp2p/identify` need to change to `@libp2p/identify`
* imports from `libp2p/upnp-nat` should be updated to `@libp2p/upnp-nat`

### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract identify service into separate module ([#2219](https://www.github.com/libp2p/js-libp2p/issues/2219)) ([72c2f77](https://www.github.com/libp2p/js-libp2p/commit/72c2f775bd85bd4928048dda0fd14740d6fb6a69))
* extract UPnP NAT into separate module ([#2217](https://www.github.com/libp2p/js-libp2p/issues/2217)) ([f29b73f](https://www.github.com/libp2p/js-libp2p/commit/f29b73f781afcea36cba0589aafdd81e1852e194))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.6 to ^1.0.0
    * @libp2p/interface-internal bumped from ^0.1.9 to ^0.1.10
    * @libp2p/utils bumped from ^4.0.7 to ^5.0.0
  * devDependencies
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^3.0.8 to ^3.0.9