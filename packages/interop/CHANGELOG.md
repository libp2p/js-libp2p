# Changelog

## [14.0.0](https://github.com/libp2p/js-libp2p/compare/interop-v13.0.3...interop-v14.0.0) (2025-09-23)


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
    * @libp2p/daemon-client bumped from ^9.0.8 to ^10.0.0
    * @libp2p/interface bumped from ^2.11.0 to ^3.0.0
    * @libp2p/utils bumped from ^6.7.2 to ^7.0.0
