---
title: ECS系统
tags:
  - ECS系统
categories:
  - 游戏引擎
  - 游戏客户端
date: 2025-11-06 17:39:30
---


# 简介

暴雪在2017年的GDC上做了关于守望先锋中ECS系统设计的分享，那个时候的暴雪啊，反观现在。B站有大佬的译制版本，[链接在此](https://www.bilibili.com/video/BV1p4411k7N8/)。

# ECS系统

ECS的核心目的是将行为与状态严格解耦。为了做到这一点，ECS系统将架构划分为了实体 Entity、组件 Component还有系统 System，见下图：

![](ecs-arch.png)

- Component只包含状态以及一些用于读取状态的辅助函数，辅助函数无行为且无副作用，Component的生命周期管理会使用多态来实现，即重写构造和析构函数。

- Entity基本就是一个Components的集合，另外有唯一的Entity ID作为标识符。

- System负责纯粹的行为，可以读取并更新Components，System的更新逻辑大致如下，EntityAdmin发起System的更新，每个System会重写自己的Update。System在Update时会遍历行为所涉及到的所有Component，并利用Component中保存的状态完成行为，必要时还可以使用访问同一个Entity上作为Sibling出现的其他类型Component。

  ![](ecs-update.png)

## 行为与状态的解耦

上面的设计初看已经能解决行为与状态的耦合了，但是必须还要考虑System中的一些细节。比如系统A与系统B存在交互，系统B需要访问系统A并且保持一些状态，同时B的行为还会在A中产生副作用。暴雪最初的方法是创建一个全局变量用于维护这些一次性状态，这样做有若干的问题：

- 增加编译开销，改全局变量会使所涉及到的任何System都重新编译
- System间产生了耦合，无法确定Side Effect是该在A还是在B中

解决方法就是将这些一次性状态和逻辑移动到每个EntityAdmin中只有一个的Singleton Component中。说它时Component也不尽然，它既有行为又有状态，同时也不归属到Entity而是由Admin直接管理，不过考虑到有状态这一点叫Component也不是不行。

使用Singleton Component后，B就可以执行其中所实现的辅助行为函数了，这样就防止了A和B间的行为互相渗透。暴雪也对这些Utility Function提出了具体的要求，如下图所示：

![](utility_function_requirements.png)

## 副作用

对于Singleton Component的辅助行为函数，我们当然是希望其中的副作用越少越好，并且副作用所影响的东西也是越少越好。对于这种共享的行为来说，当然副作用是难以避免的，同时与共享该行为的System数量有关。一旦Side Effect的数量增多，实际上也就产生了很严重的耦合，这里我猜可能的例子就是Side Effect有先后顺序的情况。

暴雪因此提议将所有的Side Effect延迟执行，一个系统会将要发生的Minor Effect提交到一个对应类型的Pending列表中，并在Entity Admin的Update步骤最后添加对应类型Side Effect的ResolveSystem来将所有待执行的Minor Effect合成为每帧一个的Major Effect。

Tim举了个形象的例子，比如猎空（应该说闪光？）和法鸡（还是讲法老之鹰？）都在设计同一个位置，猎空的双枪会带来大量的弹痕贴花，法鸡的火箭炮则会带来一个爆炸贴花，理论上如果猎空的子弹先命中那么法鸡的爆炸贴花应该是要覆盖弹痕贴花的。将每个贴花视作一个Minor Effect，完全可以延迟到ResolveSystem中再应用LOD和覆盖等等规则，从而大幅降低开销。

## 初步总结

通过ECS系统的约束，可以大幅提高工程的可维护性、解耦度以及可读性。

分享的后半部分是关于Netcode与ESC的结合的，这个先挖个坑。
