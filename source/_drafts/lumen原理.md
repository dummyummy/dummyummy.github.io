---
title: lumen原理
date: 2025-03-07 18:04:39
categories:
    - 计算机图形学
    - CG
    - 引擎
tags:
    - UE5
    - Lumen
---
本文内容主要来自官方文档[1]。

Lumen虽然是SSGI的替代品，但是首先还是会执行屏幕追踪，然后再运行软件或硬件光线追踪。软件光线追踪的基础是有向距离场（SDF）。

有趣的是，文档中提到了Lumen的主要性能关注点：`Lumen的全局光照和反射最初的主要目标是支持在下一代主机上以每秒60帧（FPS）运行的大型开放世界`。


# 参考
1. [Lumen技术细节](https://dev.epicgames.com/documentation/zh-cn/unreal-engine/lumen-technical-details-in-unreal-engine)
2. [UE5 Lumen 源码解析（二）Surface Cache 篇](https://zhuanlan.zhihu.com/p/516141543)