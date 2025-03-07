---
title: UE5 Lumen 学习笔记
date: 2025-03-06 23:10:03
categories:
    - 计算机图形学
    - CG
tags:
    - UE5
    - Lumen
---
该文章内容主要来自于虚幻5的官方文档[4]。
# 介绍
一开始只觉得Lumen听起来很高大上，以为它除了渲染之外还有一些内容，最后发现是和Nanite搞混了（难绷）。按照文档的介绍，Lumen其实就是UE5新推出的全局光照(GI)和反射系统。最离谱的是，Lumen可以近似反射了无限次的漫反射光照和高光光照，甚至能在复杂环境中达成实时渲染。Lumen是此前各种屏幕空间技术(SSGI)和距离场环境光遮蔽(DFAO)的替代品。P.S. DFAO是虚幻4中所用的环境光遮蔽方法，文档里描述其与SSAO最大的区别是`遮蔽在场景空间遮挡物中进行计算，因此出屏丢失数据不会导致瑕疵`，至于原理吗，我猜与GAMES202中所讲的距离场类似。

要启用Lumen，需要在Project Settings->Rnedering中启用Dynamic Global Illumination和Reflections这两项（新项目应该是默认启用的）。

# 特性
## 全局光照
- 不限制弹射次数的间接漫反射光照
- 真实阴影（在光线追踪器中，阴影就不需要用传统方法去做了）
- 要求实时性的情况下会以较低的分辨率来计算间接光照
## 天光(Sky Lighting)
天光在UE中负责模拟来自天空或远景的间接光照[1]，Skylight计算的光照会填充场景中的阴影部分，增强环境光照。Lumen也会为半透明材质和体积雾计算一个低质量的全局光照。
## 自发光材质
自发光材质的贡献在Lumen的Final Gather Process中被计算。目前Final Gather还不太理解，留个坑。
## 反射
Lumen支持各种粗糙度材质反射，包括清漆（clear coat）和不透明材质的glossy反射，打开对应选项后也能渲染出半透明材质在最前面一层surface上的反射。Lumen还支持渲染单层水面的镜面反射。
### Clear Coat材质
即基础层上覆盖了薄薄的一层透明涂料，比如车漆[2]。Clear coat材质也可以使用Cook-Torrance microfacet BRDF来表示[3]。
## 双面树叶
允许光线在树叶中的次表面散射，效果出奇的好。下图右边是开启Two-Sided Foliage之后的效果
![](https://raw.githubusercontent.com/dummyummy/dummyummy.github.io/refs/heads/source/external/lumen-foliage-1.png)

# 设置（略）

# 补充说明

## Lumen的更新速度
因为lumen似乎使用的是类似光照探针的技术并将计算压力分摊到多帧上来保证实时性的，所以局部光照条件的变化会快速传播，而全局的光照变化（如禁用阳光）需要一定的时间才能收敛。实测如果在项目中将主要的平行光设置为不可见的话，场景会缓慢变暗。而且如果仔细观察的话，直接光照会立即消失，间接光照则是缓慢黯淡。

## Lumen反射
Lumen Reflections没有与Lumen GI耦合，可以单独拿出来配合静态烘焙光照（Lightmap）来使用。

## 材质环境光遮蔽（AO贴图）
由于使用了光线追踪，屏幕空间的AO和AO贴图也就没有必要了，不过还是可以在项目设置中启用的。
P.S.1 UE编辑器界面中Buffer Visualization->Ambient Occulusion似乎指的是SSAO，此时由于未启用SSAO所以应该只能观察到纯白色。
P.S.2 [5]中提到，Buffer Visualization其实就是绘制了G-Buffer中的内容，但是材质里面的AO贴图并不会被写入到G-buffer中，而是会被叠加到Lightmap，Stationary sky light和Reflection capture specular中去，因此预览Material Ambient Occlusion无法得到正确的内容。

# 参考资料
1. [What exactly is a Skylight in UE4?](https://forums.unrealengine.com/t/what-exactly-is-a-skylight-in-ue4/113646)
2. [车漆渲染做法Clear-Coat](https://blog.csdn.net/xing_1337/article/details/128866637)
3. [Physically Based Rendering in Filament#Clear coat model](https://google.github.io/filament/Filament.html#materialsystem/clearcoatmodel/clearcoatspecularbrdf)
4. [Lumen Global Illumination and Reflections](https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-global-illumination-and-reflections-in-unreal-engine)
5. [Unreal | AO那些事](https://zhuanlan.zhihu.com/p/357083123)