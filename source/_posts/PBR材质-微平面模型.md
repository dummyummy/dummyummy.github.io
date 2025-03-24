---
title: PBR材质-微平面模型
date: 2025-03-24 13:38:10
tags:
  - GAMES202
categories:
  - 计算机图形学
  - PBR
  - CG
---
本文为GAMES 202 PBR Material的笔记

## PBR和PBR材质

所谓PBR，指的是渲染过程中的一切都是基于物理的，包括材质、光源、相机和光照传输，不过在实践中一般单指材质。

## 实时渲染中的PBR Materials

表面的材质主要有两种，Microfacet模型和Disney Principled BRDFs。不过按照课件所说，这两种其实并非是基于物理的，它们仍然遵循着RTR领域的优良传统：hack和近似。

体积渲染的话，关注点更多是在如何快速近似单次或多次散射。

## Microfacet(微平面)模型

Microfacet模型将表面近似成若干微小的镜面，并通过控制微平面的法线朝向来模拟不同的材质。回顾一下Microfacet BRDF的公式：

$$ f(\mathbf{i}, \mathbf{o}) = \frac{\mathbf{F}(\mathbf{i}, \mathbf{h})\mathbf{G}(\mathbf{i}, \mathbf{o}, \mathbf{h})\mathbf{D}(\mathbf{h})}{4(\mathbf{n}, \mathbf{i})(\mathbf{n}, \mathbf{o})} $$

其中$\mathbf{F}$项是菲涅尔项，可以让材质展现菲涅尔效应，$\mathbf{G}$项是阴影-遮挡项（阴影和遮挡其实是两码事，下文会解释），$\mathbf{G}$是法线分布。

### F

大多数材质在观察视角接近掠射时反射会增强，这就是菲涅尔效应。对于绝缘体来说，这种效应尤其明显，而导体（金属）的菲涅尔效应则没有那么明显，因为无论观察角度如何反射率都很接近$1$。

菲涅尔项的计算非常复杂，不仅要考虑光的极化（偏振），对于金属还会涉及复数域上的计算，因此RTR领域中必须找到快速近似的方法。常用的近似是Schilick's approximation，它不考虑极化。Schlick's appoximatio的公式如下，其中$n_1$和$n_2$分别是入射介质和出射介质的折射率：

$$ R(\theta)=R_0+(1-R_0)(1-\cos \theta)^5, R_0=(\frac{n_1-n_2}{n_1+n_2})^2 $$

### D

描述法线的分布，分布越集中则高光更明显，分布越分散则越接近diffuse材质。常用的模型有Beckmann和GGX。

#### Beckmann NDF

Beckmann NDF在形式上类似高斯分布，都是指数族的。各项同性Beckmann分布的公式如下：

![](beckmann.png)

其中$\alpha$代表粗糙度，$\theta_h$代表半程向量与法线的夹角。老师也解释了为何其中会有$\tan \theta$项，因为Beckmann是定义在Slope Space（就是垂直于半径的切平面）上的，所以原来的$x$值就被替换为了$\tan \theta$（见下图）。

![](slope_space.png)

#### GGX(or Trowbridge-Reitz)

与Beckmann相比峰度更小，拥有更长的尾部，因而材质会展现出更平缓的高光过渡，公式如下（$m$就是半程向量）：

![](ggx.png)

GGX还有一个通用的形式GTR(Generalized Trowbridge-Reitz)，它可以通过额外的参数$\gamma$进一步控制long-tail的程度，下面是GTR的可视化：

![](gtr.png)

Unity 2022对于GGX的实现如下：

```glsl
inline float GGXTerm (float NdotH, float roughness)
{
    float a2 = roughness * roughness;
    float d = (NdotH * a2 - NdotH) * NdotH + 1.0f; // 2 mad
    return UNITY_INV_PI * a2 / (d * d + 1e-7f); // This function is not intended to be running on Mobile,
                                            // therefore epsilon is smaller than what can be represented by half
}
```

### G

G项为所谓的Shadowing-masking term，用于计算微平面间的自遮挡现象。Shadowing是指入射光被微平面所遮挡，而masking是指出射光被微平面所遮挡，分别对应下面左右两张图：

![](shadowing_masking.png)

同时也可以直接从BRDF公式的角度来说明G项存在的必要性，由于归一化常数$(\mathbf{n}, \mathbf{i})$的存在，分母在观察角度近乎垂直时会接近$0$。此时不考虑自遮挡的话，边缘会异常明亮。

#### Smith Shadowing-masking term

Smith是常用的阴影遮挡项，它假设shadowing和masking是独立的两项，公式如下：

![](smith.png)

Unity 2022中对应的实现如下：

```glsl
inline half SmithVisibilityTerm (half NdotL, half NdotV, half k)
{
    half gL = NdotL * (1-k) + k;
    half gV = NdotV * (1-k) + k;
    return 1.0 / (gL * gV + 1e-5f); // This function is not intended to be running on Mobile,
                                    // therefore epsilon is smaller than can be represented by half
}
```

### Kulla-Conty Approximation

上文中的Microfacet BRDF存在一些问题，考虑下面白炉测试(white furnace test)的结果，菲涅尔项固定为$1$：

![](white_furnace_test.png)

上图是渲染的效果，下图是cosine-weighted BRDF在半球上的积分，从下图中可以很明显地看到有能量损失。消失的能量去哪里了呢，由于菲涅尔项为$1$，而不同法线的分布又不会造成能量的损耗，说明问题只有可能出在$\mathbf{G}$项上。此前我们假设了那些被遮挡的光线被吸收了，然而这与微平面是镜面的假设是相悖的，被遮挡的光线应该在多次弹射后重新射出。只有额外考虑经历Multiple Bounces的光线后，BRDF才是守恒的。

Kulla-Conty即采用了这个思路去实现能量守恒，首先计算反射率：

![](kulla_conty_E.png)

Kulla-Conty近似希望使用一个额外的BRDF来补全多次弹射的能量，这个额外的BRDF的cosine-weighted积分为$1-E(\mu_o)$。又因为BRDF需要满足reciprocity，Kulla-Conty干脆就假设额外的BRDF满足形式$c(1-E(\mu_i))(1-E(\mu_o))$，这样需要计算归一化常数$c$就可以了。经过一番计算后，可以得到BRDF的公式：

![](kulla_conty.png)

不过$E(\mu)$和$E_{avg}$都是积分，需要预计算才能用在实时渲染中。$E(\mu)$可以制成一张关于roughness和$\mu$的2D纹理，而$E_{avg}$由于对于$\mu$进行了积分，只需要一张1D纹理即可存储。

### Kulla-Conty Approximation with Color

如果BRDF带有颜色信息呢？这时我们就不能简单地将菲涅尔项固定为$1$了，因为颜色信息就在$\mathbf{F}$中。颜色就是对光线的吸收，也就是能量损失，所以思路就是再去计算一个衰减系数乘到$f_{ms}$前面。首先定义平均菲涅尔项为：

![](average_frensel.png)

这时候经历了$k$次弹射的能量为：

$$ F_{avg}^k(1-E_{avg})^k\cdot F_{avg}E_{avg} $$

将各次弹射的能量累加起来进行无穷级数求和后得到：

$$ \frac{F_{avg}E_{avg}}{1-F_{avg}(1-E_{avg})} $$

将这个系数乘到额外的BRDF即可。

### 结果

使用Kulla-Conty近似后，明显明亮了许多：

![](kulla_conty_white.png)
![](kulla_conty_colored.png)