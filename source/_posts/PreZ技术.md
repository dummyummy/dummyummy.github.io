---
title: PreZ技术
date: 2025-02-28 13:59:01
categories:
    - 计算机图形学
    - CG
tags:
    - 渲染管线
---

# 背景

PreZ技术的全称是Pre-depth Pass，从这个名字中大概就能得知该技术的一些要点如2-pass和depth pass。PreZ是为了防止开启Alpha Test时可能出现的渲染顺序错误。假如现在我们开启了Alpha Test并且启用了Early-Z来提高渲染效率，由于在片元着色器运行之前我们并不知道哪些片元会被Alpha Test所剔除，提前进行深度测试很可能会导致错误。

# 方法

PreZ的思路也很简单，既然将深度测试提前的终极目标就是尽可能地减少渲染的开销，那能不能在保持Alpha Test开启的情况下只渲染最低限度的信息？既然Alpha Test会导致深度信息错误，那不如直接把depth buffer取出来单独渲染，得到正确的深度信息后再进行更复杂的光照计算。这样我们就构想出了一个两趟的算法：

1. Pass 1：保持Alpha Test开启，Z-Write开启，只渲染深度图

2. Pass 2：关闭Z-Write，将深度测试的条件设置为EQUAL，运行片元着色

这样因为Pass 1中已经渲染了考虑discard后正确的深度图，在Pass 2中关闭Z-Write后，由于根本不会改变深度，GPU便可以对所有物体开启Early-Z了，大大减少了Overdraw。