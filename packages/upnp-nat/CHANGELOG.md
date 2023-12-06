# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.11 to ^1.0.0

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^1.0.0 to ^1.0.1
    * @libp2p/utils bumped from ^5.0.1 to ^5.0.2
  * devDependencies
    * @libp2p/peer-id-factory bumped from ^3.0.10 to ^4.0.0

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^1.0.1 to ^1.0.2

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/upnp-nat-v1.0.0...upnp-nat-v1.0.1) (2023-11-30)


### Bug Fixes

* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.0 to ^1.0.1
    * @libp2p/interface-internal bumped from ^0.1.10 to ^0.1.11
    * @libp2p/utils bumped from ^5.0.0 to ^5.0.1
  * devDependencies
    * @libp2p/logger bumped from ^4.0.0 to ^4.0.1
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
