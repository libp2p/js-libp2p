## [@libp2p/interface-connection-manager-v3.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v3.0.0...@libp2p/interface-connection-manager-v3.0.1) (2023-05-04)


### Dependencies

* bump aegir from 38.1.8 to 39.0.5 ([#393](https://github.com/libp2p/js-libp2p-interfaces/issues/393)) ([31f3797](https://github.com/libp2p/js-libp2p-interfaces/commit/31f3797b24f7c23f3f16e9db3a230bd5f7cd5175))

## [@libp2p/interface-connection-manager-v3.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v2.1.1...@libp2p/interface-connection-manager-v3.0.0) (2023-04-21)


### ⚠ BREAKING CHANGES

* add libp2p events (#373)

### Features

* add libp2p events ([#373](https://github.com/libp2p/js-libp2p-interfaces/issues/373)) ([071c718](https://github.com/libp2p/js-libp2p-interfaces/commit/071c718808902858818ca86167b51b242b67a5a5))

## [@libp2p/interface-connection-manager-v2.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v2.1.0...@libp2p/interface-connection-manager-v2.1.1) (2023-04-18)


### Dependencies

* update sibling dependencies ([2f52a28](https://github.com/libp2p/js-libp2p-interfaces/commit/2f52a284b59c0a88b040f86da1f5d3f044727f2c))

## [@libp2p/interface-connection-manager-v2.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v2.0.0...@libp2p/interface-connection-manager-v2.1.0) (2023-04-14)


### Features

* expose get connection map method of connection manager ([#372](https://github.com/libp2p/js-libp2p-interfaces/issues/372)) ([fc7245b](https://github.com/libp2p/js-libp2p-interfaces/commit/fc7245b63764562f5ec66a5a0ba334caea80ed66))
* expose get dial queue method of connection manager ([#371](https://github.com/libp2p/js-libp2p-interfaces/issues/371)) ([0c407aa](https://github.com/libp2p/js-libp2p-interfaces/commit/0c407aa0772c171bf6650e31fb20a3433df40b6b))

## [@libp2p/interface-connection-manager-v2.0.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.5.0...@libp2p/interface-connection-manager-v2.0.0) (2023-04-14)


### ⚠ BREAKING CHANGES

* the Dialer interface has been removed

### Bug Fixes

* remove dialer interface from interface connection manager ([#364](https://github.com/libp2p/js-libp2p-interfaces/issues/364)) ([5fb8a34](https://github.com/libp2p/js-libp2p-interfaces/commit/5fb8a342150efbc8c0ac8b1ae76ec53dc9f60ee9))

## [@libp2p/interface-connection-manager-v1.5.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.4.1...@libp2p/interface-connection-manager-v1.5.0) (2023-04-11)


### Features

* add peer:prune event to connection manager ([#367](https://github.com/libp2p/js-libp2p-interfaces/issues/367)) ([45680c6](https://github.com/libp2p/js-libp2p-interfaces/commit/45680c614f082e1d02c5258559f3ee3b711e6a87))

## [@libp2p/interface-connection-manager-v1.4.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.4.0...@libp2p/interface-connection-manager-v1.4.1) (2023-04-11)


### Dependencies

* update sibling dependencies ([b034810](https://github.com/libp2p/js-libp2p-interfaces/commit/b0348102e41dc18166e70063f4708a2b3544f4b6))

## [@libp2p/interface-connection-manager-v1.4.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.8...@libp2p/interface-connection-manager-v1.4.0) (2023-04-05)


### Features

* support batch dialling ([#351](https://github.com/libp2p/js-libp2p-interfaces/issues/351)) ([e46b72b](https://github.com/libp2p/js-libp2p-interfaces/commit/e46b72b1731ff935a1f0d755cbaf6f3159060ed3))

## [@libp2p/interface-connection-manager-v1.3.8](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.7...@libp2p/interface-connection-manager-v1.3.8) (2023-03-17)


### Dependencies

* update @multiformats/multiaddr to 12.0.0 ([#354](https://github.com/libp2p/js-libp2p-interfaces/issues/354)) ([e0f327b](https://github.com/libp2p/js-libp2p-interfaces/commit/e0f327b5d54e240feabadce21a841629d633ec5e))

## [@libp2p/interface-connection-manager-v1.3.7](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.6...@libp2p/interface-connection-manager-v1.3.7) (2023-01-18)


### Dependencies

* bump aegir from 37.12.1 to 38.1.0 ([#335](https://github.com/libp2p/js-libp2p-interfaces/issues/335)) ([7368a36](https://github.com/libp2p/js-libp2p-interfaces/commit/7368a363423a08e8fa247dcb76ea13e4cf030d65))

## [@libp2p/interface-connection-manager-v1.3.6](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.5...@libp2p/interface-connection-manager-v1.3.6) (2023-01-14)


### Bug Fixes

* accept multiaddr param when opening connections ([#336](https://github.com/libp2p/js-libp2p-interfaces/issues/336)) ([fef9c26](https://github.com/libp2p/js-libp2p-interfaces/commit/fef9c26847cf63cb95f5fcb51ee40cbc679cc6bf))


### Trivial Changes

* remove lerna ([#330](https://github.com/libp2p/js-libp2p-interfaces/issues/330)) ([6678592](https://github.com/libp2p/js-libp2p-interfaces/commit/6678592dd0cf601a2671852f9d2a0aff5dee2b18))

## [@libp2p/interface-connection-manager-v1.3.5](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.4...@libp2p/interface-connection-manager-v1.3.5) (2023-01-06)


### Dependencies

* update sibling dependencies ([b50e621](https://github.com/libp2p/js-libp2p-interfaces/commit/b50e621d31a8b32affc3fadb9f97c4883d577f93))

## [@libp2p/interface-connection-manager-v1.3.4](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.3...@libp2p/interface-connection-manager-v1.3.4) (2022-12-19)


### Documentation

* add interface docs ([#324](https://github.com/libp2p/js-libp2p-interfaces/issues/324)) ([2789445](https://github.com/libp2p/js-libp2p-interfaces/commit/278944594c24e1a3c4b3624a35680d69166546d7))

## [@libp2p/interface-connection-manager-v1.3.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.2...@libp2p/interface-connection-manager-v1.3.3) (2022-12-16)


### Documentation

* update project config ([#323](https://github.com/libp2p/js-libp2p-interfaces/issues/323)) ([0fc6a08](https://github.com/libp2p/js-libp2p-interfaces/commit/0fc6a08e9cdcefe361fe325281a3a2a03759ff59))

## [@libp2p/interface-connection-manager-v1.3.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.1...@libp2p/interface-connection-manager-v1.3.2) (2022-12-14)


### Bug Fixes

* generate docs for all packages ([#321](https://github.com/libp2p/js-libp2p-interfaces/issues/321)) ([b6f8b32](https://github.com/libp2p/js-libp2p-interfaces/commit/b6f8b32a920c15a28fe021e6050e31aaae89d518))

## [@libp2p/interface-connection-manager-v1.3.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.3.0...@libp2p/interface-connection-manager-v1.3.1) (2022-11-05)


### Bug Fixes

* update project config ([#311](https://github.com/libp2p/js-libp2p-interfaces/issues/311)) ([27dd0ce](https://github.com/libp2p/js-libp2p-interfaces/commit/27dd0ce3c249892ac69cbb24ddaf0b9f32385e37))

## [@libp2p/interface-connection-manager-v1.3.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.2.0...@libp2p/interface-connection-manager-v1.3.0) (2022-10-11)


### Features

* add afterUpgradeInbound method ([#300](https://github.com/libp2p/js-libp2p-interfaces/issues/300)) ([fbdf5f5](https://github.com/libp2p/js-libp2p-interfaces/commit/fbdf5f54277735a26df0a28099eeae9d57159978))

## [@libp2p/interface-connection-manager-v1.2.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.1.1...@libp2p/interface-connection-manager-v1.2.0) (2022-10-04)


### Features

* add acceptIncomingConnection to ConnectionManager ([#295](https://github.com/libp2p/js-libp2p-interfaces/issues/295)) ([5d460e8](https://github.com/libp2p/js-libp2p-interfaces/commit/5d460e8815a8b49915da7ffabccc4a8b96a61acc))

## [@libp2p/interface-connection-manager-v1.1.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.1.0...@libp2p/interface-connection-manager-v1.1.1) (2022-09-21)


### Dependencies

* update @multiformats/multiaddr to 11.0.0 ([#288](https://github.com/libp2p/js-libp2p-interfaces/issues/288)) ([57b2ad8](https://github.com/libp2p/js-libp2p-interfaces/commit/57b2ad88edfc7807311143791bc49270b1a81eaf))

## [@libp2p/interface-connection-manager-v1.1.0](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.0.3...@libp2p/interface-connection-manager-v1.1.0) (2022-09-09)


### Features

* add dialer interface ([#285](https://github.com/libp2p/js-libp2p-interfaces/issues/285)) ([1e62df4](https://github.com/libp2p/js-libp2p-interfaces/commit/1e62df4f15b45abe62fe8400dbd88866a2bc13cd))

## [@libp2p/interface-connection-manager-v1.0.3](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.0.2...@libp2p/interface-connection-manager-v1.0.3) (2022-08-07)


### Trivial Changes

* update project config ([#271](https://github.com/libp2p/js-libp2p-interfaces/issues/271)) ([59c0bf5](https://github.com/libp2p/js-libp2p-interfaces/commit/59c0bf5e0b05496fca2e4902632b61bb41fad9e9))


### Dependencies

* update sibling dependencies ([f859920](https://github.com/libp2p/js-libp2p-interfaces/commit/f859920423587ae797ac90ccaa3af8bdf60ae549))

## [@libp2p/interface-connection-manager-v1.0.2](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.0.1...@libp2p/interface-connection-manager-v1.0.2) (2022-06-27)


### Trivial Changes

* update deps ([#262](https://github.com/libp2p/js-libp2p-interfaces/issues/262)) ([51edf7d](https://github.com/libp2p/js-libp2p-interfaces/commit/51edf7d9b3765a6f75c915b1483ea345d0133a41))

## [@libp2p/interface-connection-manager-v1.0.1](https://github.com/libp2p/js-libp2p-interfaces/compare/@libp2p/interface-connection-manager-v1.0.0...@libp2p/interface-connection-manager-v1.0.1) (2022-06-16)


### Trivial Changes

* update deps ([545264f](https://github.com/libp2p/js-libp2p-interfaces/commit/545264f87a58394d2a7da77e93f3a596e889238f))
