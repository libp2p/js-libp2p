# Changelog

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.1 to ^5.0.2

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^0.1.11 to ^1.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.2 to ^5.0.3

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^1.0.0 to ^1.0.1
    * @libp2p/peer-collections bumped from ^4.0.10 to ^5.0.0
    * @libp2p/peer-record bumped from ^6.0.11 to ^7.0.0
    * @libp2p/utils bumped from ^5.0.1 to ^5.0.2
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.3 to ^5.0.4
    * @libp2p/peer-id-factory bumped from ^3.0.10 to ^4.0.0

### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.4 to ^5.0.5

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface-internal bumped from ^1.0.1 to ^1.0.2
    * @libp2p/peer-collections bumped from ^5.0.0 to ^5.1.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.5 to ^5.0.6

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.1 to ^1.0.2
    * @libp2p/interface-internal bumped from ^1.0.2 to ^1.0.3
    * @libp2p/peer-collections bumped from ^5.1.0 to ^5.1.1
    * @libp2p/peer-id bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-record bumped from ^7.0.0 to ^7.0.1
    * @libp2p/utils bumped from ^5.0.2 to ^5.0.3
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.6 to ^5.0.7
    * @libp2p/logger bumped from ^4.0.1 to ^4.0.2
    * @libp2p/peer-id-factory bumped from ^4.0.0 to ^4.0.1

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.2 to ^1.1.0
    * @libp2p/interface-internal bumped from ^1.0.3 to ^1.0.4
    * @libp2p/peer-collections bumped from ^5.1.1 to ^5.1.2
    * @libp2p/peer-id bumped from ^4.0.2 to ^4.0.3
    * @libp2p/peer-record bumped from ^7.0.2 to ^7.0.3
    * @libp2p/utils bumped from ^5.1.0 to ^5.1.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.8 to ^5.1.0
    * @libp2p/logger bumped from ^4.0.2 to ^4.0.3
    * @libp2p/peer-id-factory bumped from ^4.0.1 to ^4.0.2

## [1.0.8](https://github.com/libp2p/js-libp2p/compare/circuit-relay-v2-v1.0.7...circuit-relay-v2-v1.0.8) (2023-12-19)


### Bug Fixes

* query for circuit relays after start ([#2309](https://github.com/libp2p/js-libp2p/issues/2309)) ([dc56856](https://github.com/libp2p/js-libp2p/commit/dc56856f3d1d7603c3b0cc79afea7eef36a323c9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/peer-record bumped from ^7.0.1 to ^7.0.2
    * @libp2p/utils bumped from ^5.0.3 to ^5.1.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.7 to ^5.0.8

## [1.0.1](https://github.com/libp2p/js-libp2p/compare/circuit-relay-v2-v1.0.0...circuit-relay-v2-v1.0.1) (2023-11-30)


### Bug Fixes

* restore lost commits ([#2268](https://github.com/libp2p/js-libp2p/issues/2268)) ([5775f1d](https://github.com/libp2p/js-libp2p/commit/5775f1df4f5561500e622dc0788fdacbc74e2755))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^1.0.0 to ^1.0.1
    * @libp2p/interface-internal bumped from ^0.1.10 to ^0.1.11
    * @libp2p/peer-collections bumped from ^4.0.9 to ^4.0.10
    * @libp2p/peer-id bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-record bumped from ^6.0.10 to ^6.0.11
    * @libp2p/utils bumped from ^5.0.0 to ^5.0.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^5.0.0 to ^5.0.1
    * @libp2p/logger bumped from ^4.0.0 to ^4.0.1
    * @libp2p/peer-id-factory bumped from ^3.0.9 to ^3.0.10

## 1.0.0 (2023-11-28)


### ⚠ BREAKING CHANGES

* imports from `libp2p/circuit-relay` should be updated to `@libp2p/circuit-relay-v2`

### Bug Fixes

* dial relay when we are dialed via it but have no reservation ([#2252](https://www.github.com/libp2p/js-libp2p/issues/2252)) ([d729d66](https://www.github.com/libp2p/js-libp2p/commit/d729d66a54a272dfe11eda8836a555a187cc9c39))
* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract circuit relay v2 to separate module ([#2222](https://www.github.com/libp2p/js-libp2p/issues/2222)) ([24afba3](https://www.github.com/libp2p/js-libp2p/commit/24afba30004fb7f24af1f0180229bb164340f00b))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.2 to ^1.0.0
    * @libp2p/interface-internal bumped from ^0.1.5 to ^0.1.10
    * @libp2p/peer-collections bumped from ^4.0.8 to ^4.0.9
    * @libp2p/peer-id bumped from ^3.0.6 to ^4.0.0
    * @libp2p/peer-record bumped from ^6.0.9 to ^6.0.10
    * @libp2p/utils bumped from ^4.0.7 to ^5.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.1.5 to ^5.0.0
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^3.0.8 to ^3.0.9
