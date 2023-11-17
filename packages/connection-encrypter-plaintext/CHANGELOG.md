# Changelog

## 1.0.0 (2023-11-17)


### ⚠ BREAKING CHANGES

* imports from `libp2p/circuit-relay` should be updated to `@libp2p/circuit-relay-v2`
* imports from `libp2p/plaintext` should be changed to `@libp2p/plaintext`

### Bug Fixes

* use logging component everywhere ([#2228](https://www.github.com/libp2p/js-libp2p/issues/2228)) ([e5dfde0](https://www.github.com/libp2p/js-libp2p/commit/e5dfde0883191c93903ca552433f177d48adf0b3))


### Code Refactoring

* extract circuit relay v2 to separate module ([#2222](https://www.github.com/libp2p/js-libp2p/issues/2222)) ([24afba3](https://www.github.com/libp2p/js-libp2p/commit/24afba30004fb7f24af1f0180229bb164340f00b))
* extract plaintext into separate module ([#2221](https://www.github.com/libp2p/js-libp2p/issues/2221)) ([a364d95](https://www.github.com/libp2p/js-libp2p/commit/a364d95bbd7b15a5ce6ce508321e7ff2fa40a5e5))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^0.1.2 to ^1.0.0
    * @libp2p/peer-id bumped from ^3.0.6 to ^4.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^4.1.5 to ^5.0.0
    * @libp2p/logger bumped from ^3.1.0 to ^4.0.0
    * @libp2p/peer-id-factory bumped from ^3.0.8 to ^3.0.9