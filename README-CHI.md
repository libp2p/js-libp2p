<h1 align="center">
  <a href="https://libp2p.io"><img width="250" src="https://github.com/libp2p/js-libp2p/blob/master/img/libp2p.png?raw=true" alt="libp2p hex logo" /></a>
</h1>

<h3 align="center">libp2p网络栈的JavaScript实现</h3>

<p align="center">
  <a href="http://protocol.ai"><img src="https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square" /></a>
  <a href="http://libp2p.io/"><img src="https://img.shields.io/badge/project-libp2p-yellow.svg?style=flat-square" /></a>
  <a href="http://webchat.freenode.net/?channels=%23libp2p"><img src="https://img.shields.io/badge/freenode-%23libp2p-yellow.svg?style=flat-square" /></a>
  <a href="https://riot.im/app/#/room/#libp2p:matrix.org"><img src="https://img.shields.io/badge/matrix-%23libp2p%3Apermaweb.io-blue.svg?style=flat-square" /> </a>
  <a href="https://discord.gg/ipfs"><img src="https://img.shields.io/discord/806902334369824788?color=blueviolet&label=discord&style=flat-square" /></a>
  <a href="https://discuss.libp2p.io"><img src="https://img.shields.io/discourse/https/discuss.libp2p.io/posts.svg" /></a>
  <a href="https://www.npmjs.com/package/libp2p"><img src="https://img.shields.io/npm/dm/libp2p.svg" /></a>
  <a href="https://www.jsdelivr.com/package/npm/libp2p"><img src="https://data.jsdelivr.com/v1/package/npm/libp2p/badge"/></a>
</p>

<p align="center">
  <a href="https://github.com/libp2p/js-libp2p/actions?query=branch%3Amaster+workflow%3Aci+"><img src="https://img.shields.io/github/actions/workflow/status/libp2p/js-libp2p/main.yml?branch=master&label=ci&style=flat-square" /></a>
  <a href="https://codecov.io/gh/libp2p/js-libp2p"><img src="https://img.shields.io/codecov/c/github/libp2p/js-libp2p/master.svg?style=flat-square"></a>
  <br>
  <a href="https://github.com/feross/standard"><img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"></a>
  <a href="https://github.com/RichardLitt/standard-readme"><img src="https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/npm-%3E%3D7.0.0-orange.svg?style=flat-square" /></a>
  <a href=""><img src="https://img.shields.io/badge/Node.js-%3E%3D15.0.0-orange.svg?style=flat-square" /></a>
  <br>
</p>

### 项目状况

我们已经走过了很长的路，但这个项目仍处于Alpha开发阶段，许多事都可能会变，API可能会变，小心踩雷。

主分支中的文档可能包含预发布版本的修改。
如果你正在寻找最新版本的文档，你可以在[**npm**](https://www.npmjs.com/package/libp2p)上查看最新版本，或者在github上选择与你要找的版本相匹配的Tag。

**准备好开始了吗？** 查看 [GETTING_STARTED.md](./doc/GETTING_STARTED.md) 指南和 [examples folder](/examples)例子。

**想升级自己项目中的libp2p版本？** 查看 [migrations folder](./doc/migrations).

## Table of Contents <!-- omit in toc -->

- [背景](#背景)
- [路线图](#路线图)
- [安装](#安装)
- [使用](#使用)
  - [配置](#配置)
  - [限制](#限制)
  - [API文档](#api文档)
  - [入门指南](#入门指南)
  - [教程和实例](#教程和实例)
- [开发](#开发)
  - [测试](#测试)
    - [运行单元测试](#运行单元测试)
  - [包](#包)
- [使用实例](#使用实例)
- [做出贡献](#做出贡献)
- [License](#license)
  - [贡献](#贡献)

## 背景

libp2p是对互联网网络堆栈的演变进行长期而艰苦的探索的产物。为了建立P2P应用，开发者们长期以来不得不根据自己的需要定制临时的解决方案，有时还要对他们的运行时间和开发时的网络状态做一些艰难的假设。今天，回顾20多年的历史，我们看到围绕互联网协议（IP）建立的机制类型有一个清晰的模式，这些机制可以在OSI层系统的许多层中找到，libp2p将这些机制提炼成扁平的类别，并定义了清晰的接口，一旦暴露出来，其他协议和应用程序就可以使用和交换它们，使运行时具有升级和适应性，而不会破坏API。

我们正在编写更好的文档、博文、教程和正式规范。今天，你可以找到：

- [libp2p.io](https://libp2p.io)
- [docs.libp2p.io](https://docs.libp2p.io)
- [规范 (WIP)](https://github.com/libp2p/specs)
- [讨论区](https://discuss.libp2p.io)
- 演讲
  - [`libp2p <3 ethereum` at DEVCON2](https://archive.devcon.org/archive/watch/2/libp2p-devp2p-ipfs-and-ethereum-networking/)
- 文章
  - [libp2p的概述](https://github.com/libp2p/libp2p#description)

总而言之，libp2p是一个 "网络栈"--一个协议套件--它干净地分离了关注点，并使复杂的应用程序只使用它们绝对需要的协议，而不放弃互操作性和可升级性。libp2p是从IPFS发展而来的，但它的建立是为了让很多人可以在很多不同的项目中使用它。

## 路线图

你可以在这里找到js-libp2p的路线图： https://github.com/libp2p/js-libp2p/blob/master/ROADMAP.md

它代表了当前js-libp2p维护者所关注的项目，并提供了一个完成目标的预估时间。

It is complementary to the overarching libp2p project roadmap: https://github.com/libp2p/specs/blob/master/ROADMAP.md

## 安装

```sh
npm install libp2p
```

## 使用

### 配置

关于如何配置libp2p的所有信息，请看 [CONFIGURATION.md](./doc/CONFIGURATION.md).

### 限制

配置你的节点来抵抗恶意对等点[LIMITS.md](./doc/LIMITS.md)

### API文档

- <https://libp2p.github.io/js-libp2p>

### 入门指南

要开始使用`js-libp2p`之旅, 请阅读 [GETTING_STARTED.md](./doc/GETTING_STARTED.md)指南。

### 教程和实例

你可以在[examples文件夹](./examples)上找到多个例子，它们将指导你在几种情况下使用libp2p。

## 开发

**克隆和安装依赖。**

```sh
> git clone https://github.com/libp2p/js-libp2p.git
> cd js-libp2p
> npm install
> npm run build
```

### 测试

#### 运行单元测试

```sh
# run all the unit tsts
> npm test

# run just Node.js tests
> npm run test:node

# run just Browser tests (Chrome)
> npm run test:chrome
```

### 包

目前存在的libp2p的软件包列表

> 这个表是使用`package-table`模块生成的，使用了语句`package-table --data=package-list.json`。

| 包 | 版本 | Deps | CI | Coverage | 首席维护 |
| ---------|---------|---------|---------|---------|--------- |
| **libp2p** |
| [`libp2p`](//github.com/libp2p/js-libp2p) | [![npm](https://img.shields.io/npm/v/libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p/master)](https://travis-ci.com/libp2p/js-libp2p) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-daemon`](//github.com/libp2p/js-libp2p-daemon) | [![npm](https://img.shields.io/npm/v/libp2p-daemon.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-daemon/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-daemon.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-daemon) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-daemon/master)](https://travis-ci.com/libp2p/js-libp2p-daemon) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-daemon/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-daemon) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-daemon-client`](//github.com/libp2p/js-libp2p-daemon-client) | [![npm](https://img.shields.io/npm/v/libp2p-daemon-client.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-daemon-client/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-daemon-client.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-daemon-client) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-daemon-client/master)](https://travis-ci.com/libp2p/js-libp2p-daemon-client) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-daemon-client/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-daemon-client) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |
| [`libp2p-interfaces`](//github.com/libp2p/js-interfaces) | [![npm](https://img.shields.io/npm/v/libp2p-interfaces.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-interfaces/releases) | [![Deps](https://david-dm.org/libp2p/js-interfaces.svg?style=flat-square)](https://david-dm.org/libp2p/js-interfaces) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-interfaces/master)](https://travis-ci.com/libp2p/js-interfaces) | [![codecov](https://codecov.io/gh/libp2p/js-interfaces/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-interfaces) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`interop-libp2p`](//github.com/libp2p/interop) | [![npm](https://img.shields.io/npm/v/interop-libp2p.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/interop/releases) | [![Deps](https://david-dm.org/libp2p/interop.svg?style=flat-square)](https://david-dm.org/libp2p/interop) | [![Travis CI](https://flat.badgen.net/travis/libp2p/interop/master)](https://travis-ci.com/libp2p/interop) | [![codecov](https://codecov.io/gh/libp2p/interop/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/interop) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |
| **transports** |
| [`libp2p-tcp`](//github.com/libp2p/js-libp2p-tcp) | [![npm](https://img.shields.io/npm/v/libp2p-tcp.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-tcp/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-tcp.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-tcp) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-tcp/master)](https://travis-ci.com/libp2p/js-libp2p-tcp) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-tcp/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-tcp) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-webrtc-direct`](//github.com/libp2p/js-libp2p-webrtc-direct) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-direct.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-direct/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-direct.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-direct) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-webrtc-direct/master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-direct) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-direct) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-webrtc-star/master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-websockets`](//github.com/libp2p/js-libp2p-websockets) | [![npm](https://img.shields.io/npm/v/libp2p-websockets.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-websockets/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-websockets.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-websockets) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-websockets/master)](https://travis-ci.com/libp2p/js-libp2p-websockets) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-websockets/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-websockets) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **secure channels** |
| [`libp2p-noise`](//github.com/NodeFactoryIo/js-libp2p-noise) | [![npm](https://img.shields.io/npm/v/libp2p-noise.svg?maxAge=86400&style=flat-square)](//github.com/NodeFactoryIo/js-libp2p-noise/releases) | [![Deps](https://david-dm.org/NodeFactoryIo/js-libp2p-noise.svg?style=flat-square)](https://david-dm.org/NodeFactoryIo/js-libp2p-noise) | [![Travis CI](https://flat.badgen.net/travis/NodeFactoryIo/js-libp2p-noise/master)](https://travis-ci.com/NodeFactoryIo/js-libp2p-noise) | [![codecov](https://codecov.io/gh/NodeFactoryIo/js-libp2p-noise/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/NodeFactoryIo/js-libp2p-noise) | N/A |
| **stream multiplexers** |
| [`libp2p-mplex`](//github.com/libp2p/js-libp2p-mplex) | [![npm](https://img.shields.io/npm/v/libp2p-mplex.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mplex/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mplex.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mplex) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-mplex/master)](https://travis-ci.com/libp2p/js-libp2p-mplex) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mplex/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mplex) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **peer discovery** |
| [`libp2p-bootstrap`](//github.com/libp2p/js-libp2p-bootstrap) | [![npm](https://img.shields.io/npm/v/libp2p-bootstrap.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-bootstrap/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-bootstrap.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-bootstrap) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-bootstrap/master)](https://travis-ci.com/libp2p/js-libp2p-bootstrap) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-bootstrap/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-bootstrap) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-kad-dht/master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-mdns`](//github.com/libp2p/js-libp2p-mdns) | [![npm](https://img.shields.io/npm/v/libp2p-mdns.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-mdns/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-mdns.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-mdns) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-mdns/master)](https://travis-ci.com/libp2p/js-libp2p-mdns) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-mdns/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-mdns) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-webrtc-star`](//github.com/libp2p/js-libp2p-webrtc-star) | [![npm](https://img.shields.io/npm/v/libp2p-webrtc-star.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-webrtc-star/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-webrtc-star.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-webrtc-star) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-webrtc-star/master)](https://travis-ci.com/libp2p/js-libp2p-webrtc-star) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-webrtc-star) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`@chainsafe/discv5`](//github.com/ChainSafe/discv5) | [![npm](https://img.shields.io/npm/v/@chainsafe/discv5.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/discv5/releases) | [![Deps](https://david-dm.org/ChainSafe/discv5.svg?style=flat-square)](https://david-dm.org/ChainSafe/discv5) | [![Travis CI](https://flat.badgen.net/travis/ChainSafe/discv5/master)](https://travis-ci.com/ChainSafe/discv5) | [![codecov](https://codecov.io/gh/ChainSafe/discv5/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/discv5) | [Cayman Nava](mailto:caymannava@gmail.com) |
| **content routing** |
| [`libp2p-delegated-content-routing`](//github.com/libp2p/js-libp2p-delegated-content-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-content-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-content-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-content-routing) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-delegated-content-routing/master)](https://travis-ci.com/libp2p/js-libp2p-delegated-content-routing) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-delegated-content-routing) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-kad-dht/master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **peer routing** |
| [`libp2p-delegated-peer-routing`](//github.com/libp2p/js-libp2p-delegated-peer-routing) | [![npm](https://img.shields.io/npm/v/libp2p-delegated-peer-routing.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-delegated-peer-routing/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-delegated-peer-routing) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-delegated-peer-routing/master)](https://travis-ci.com/libp2p/js-libp2p-delegated-peer-routing) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-delegated-peer-routing) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| [`libp2p-kad-dht`](//github.com/libp2p/js-libp2p-kad-dht) | [![npm](https://img.shields.io/npm/v/libp2p-kad-dht.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-kad-dht/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-kad-dht.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-kad-dht) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-kad-dht/master)](https://travis-ci.com/libp2p/js-libp2p-kad-dht) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-kad-dht/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-kad-dht) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| **utilities** |
| [`libp2p-crypto`](//github.com/libp2p/js-libp2p-crypto) | [![npm](https://img.shields.io/npm/v/libp2p-crypto.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-crypto/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-crypto.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-crypto) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-crypto/master)](https://travis-ci.com/libp2p/js-libp2p-crypto) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-crypto/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-crypto) | [Jacob Heun](mailto:jacobheun@gmail.com) |
| **data types** |
| [`peer-id`](//github.com/libp2p/js-peer-id) | [![npm](https://img.shields.io/npm/v/peer-id.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-peer-id/releases) | [![Deps](https://david-dm.org/libp2p/js-peer-id.svg?style=flat-square)](https://david-dm.org/libp2p/js-peer-id) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-peer-id/master)](https://travis-ci.com/libp2p/js-peer-id) | [![codecov](https://codecov.io/gh/libp2p/js-peer-id/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-peer-id) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |
| [`libp2p-record`](//github.com/libp2p/js-libp2p-record) | [![npm](https://img.shields.io/npm/v/libp2p-record.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-record/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-record.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-record) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-record/master)](https://travis-ci.com/libp2p/js-libp2p-record) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-record/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-record) | [Jacob Heun](mailto:santos.vasco10@gmail.com) |
| **pubsub** |
| [`libp2p-floodsub`](//github.com/libp2p/js-libp2p-floodsub) | [![npm](https://img.shields.io/npm/v/libp2p-floodsub.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-floodsub/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-floodsub.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-floodsub) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-floodsub/master)](https://travis-ci.com/libp2p/js-libp2p-floodsub) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-floodsub/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-floodsub) | [Vasco Santos](mailto:vasco.santos@moxy.studio) |
| [`libp2p-gossipsub`](//github.com/ChainSafe/js-libp2p-gossipsub) | [![npm](https://img.shields.io/npm/v/libp2p-gossipsub.svg?maxAge=86400&style=flat-square)](//github.com/ChainSafe/js-libp2p-gossipsub/releases) | [![Deps](https://david-dm.org/ChainSafe/js-libp2p-gossipsub.svg?style=flat-square)](https://david-dm.org/ChainSafe/js-libp2p-gossipsub) | [![Travis CI](https://flat.badgen.net/travis/ChainSafe/js-libp2p-gossipsub/master)](https://travis-ci.com/ChainSafe/js-libp2p-gossipsub) | [![codecov](https://codecov.io/gh/ChainSafe/js-libp2p-gossipsub/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/ChainSafe/js-libp2p-gossipsub) | [Cayman Nava](mailto:caymannava@gmail.com) |
| **extensions** |
| [`libp2p-nat-mgnr`](//github.com/libp2p/js-libp2p-nat-mgnr) | [![npm](https://img.shields.io/npm/v/libp2p-nat-mgnr.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-nat-mgnr/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-nat-mgnr.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-nat-mgnr) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-nat-mgnr/master)](https://travis-ci.com/libp2p/js-libp2p-nat-mgnr) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-nat-mgnr/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-nat-mgnr) | N/A |
| [`libp2p-utils`](//github.com/libp2p/js-libp2p-utils) | [![npm](https://img.shields.io/npm/v/libp2p-utils.svg?maxAge=86400&style=flat-square)](//github.com/libp2p/js-libp2p-utils/releases) | [![Deps](https://david-dm.org/libp2p/js-libp2p-utils.svg?style=flat-square)](https://david-dm.org/libp2p/js-libp2p-utils) | [![Travis CI](https://flat.badgen.net/travis/libp2p/js-libp2p-utils/master)](https://travis-ci.com/libp2p/js-libp2p-utils) | [![codecov](https://codecov.io/gh/libp2p/js-libp2p-utils/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/libp2p/js-libp2p-utils) | [Vasco Santos](mailto:santos.vasco10@gmail.com) |

## 使用实例

<div style="padding: 20px">
  <p align="middle">
    <a href="https://lodestar.chainsafe.io/"><img width="300" src="https://github.com/ChainSafe/lodestar/blob/unstable/assets/lodestar_icon_text_black_stroke.png?raw=true"></a>
    <a href="https://hoprnet.org/"><img width="150" src="https://github.com/hoprnet/hopr-assets/blob/master/v1/logo/hopr_logo_padded.png?raw=true" alt="HOPR Logo">
    <a href="https://js.ipfs.io/"><img src="https://ipfs.io/ipfs/Qme6KJdKcp85TYbLxuLV7oQzMiLremD7HMoXLZEmgo6Rnh/js-ipfs-sticker.png" alt="IPFS in JavaScript logo" width="150" /></a>
  </p>
</div>

还有 [很多...](https://github.com/libp2p/js-libp2p/network/dependents)

## 做出贡献

libp2p的JavaScript的实现是一项正在进行的工作。因此，你现在可以做一些事情来帮助我们：

 - 通过模块，**检查现有的问题**。这对正在开发的模块尤其有用。可能需要一些关于IPFS/libp2p的知识，以及它背后的基础设施--例如，你可能需要阅读关于p2p和更复杂的操作，如muxing，以便能够在技术上提供帮助。
 - **进行代码审查**。其中大部分是由@diasdavid开发的，这意味着更多的眼睛将有助于：第一，加速项目的进展。第二，确保质量。第三，减少未来可能的bug。
 - **增加测试**。测试永远是不够的。

## License

在以下任何一种情况下获得许可

 * Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / http://www.apache.org/licenses/LICENSE-2.0)
 * MIT ([LICENSE-MIT](LICENSE-MIT) / http://opensource.org/licenses/MIT)

### 贡献

除非你明确说明，任何由你主观提交以纳入作品的贡献，如Apache-2.0许可中所定义的，应按上述规定获得双重许可，没有任何附加条款或条件。
