# Changelog

## [8.0.1](https://github.com/libp2p/js-libp2p/compare/yamux-v8.0.0...yamux-v8.0.1) (2025-09-24)


### Dependencies

* update p-event, p-wait-for and noble deps ([#3302](https://github.com/libp2p/js-libp2p/issues/3302)) ([55bbd8c](https://github.com/libp2p/js-libp2p/commit/55bbd8cde12fe1c05e8d264e6e2406ca9fe2f044))
* The following workspace dependencies were updated
  * dependencies
    * @libp2p/utils bumped from ^7.0.0 to ^7.0.1
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^7.0.0 to ^7.0.1
    * @libp2p/mplex bumped from ^12.0.0 to ^12.0.1

## [8.0.0](https://github.com/libp2p/js-libp2p/compare/yamux-v7.0.4...yamux-v8.0.0) (2025-09-23)


### ⚠ BREAKING CHANGES

* - Stream handlers accept `stream, connection`, not `{ stream, connection }`

### Features

* streams as EventTargets ([#3218](https://github.com/libp2p/js-libp2p/issues/3218)) ([0f68898](https://github.com/libp2p/js-libp2p/commit/0f68898e6503975aae6f2bb6ba36aff65dabdfe8)), closes [#3226](https://github.com/libp2p/js-libp2p/issues/3226)


### Bug Fixes

* update project ([db9f40c](https://github.com/libp2p/js-libp2p/commit/db9f40c4fc4c230444d0f3ca79b65a0053bc35f7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/utils bumped from ^6.7.2 to ^7.0.0
  * devDependencies
    * @libp2p/interface-compliance-tests bumped from ^6.5.0 to ^7.0.0
    * @libp2p/mplex bumped from ^11.0.47 to ^12.0.0
