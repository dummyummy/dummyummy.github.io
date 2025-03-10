---
title: GAMES202-作业3
tags:
  - GAMES202
categories:
  - 计算机图形学
  - CG
date: 2025-03-10 22:14:51
---

GAMES202 HW3的完成记录~

# 总览
在延迟渲染管线下，为一个光源为方向光，材质为漫反射 (Diffuse) 的场景实现屏幕空间下的全局光照效果（两次反射）。

作业3共分为三个部分：
1. 实现对场景直接光照的着色 (考虑阴影)。
2. 实现屏幕空间下光线的求交 (SSR)。
3. 实现对场景间接光照的着色。

作业文档里使用的术语是BSDF，不过既然本次作业只会涉及到漫反射材质，下文可能会出现BSDF和BRDF的互换。

# Part 1：直接光照

这部分的两个子任务是计算漫反射材质BSDF的值以及光照的强度（包含可见性），非常简单。

首先是EvalDiffuse函数的实现。虽然EvalDiffuse接收了三个参数$w_i, w_o$和$uv$，但是对于漫反射材质来说，前两个代表方向的参数都是不需要的。作业说明中提示要用到保存在G-Buffer中的法线信息，意味着计算出来的BSDF是cosine weighted的。知道了这些之后，实现EvalDiffuse就是随手的事啦：

```glsl
vec3 EvalDiffuse(vec3 wi, vec3 wo, vec2 uv) {
  vec3 albedo = GetGBufferDiffuse(uv);
  vec3 n = GetGBufferNormalWorld(uv);
  float cos_theta = dot(n, wi);
  vec3 bsdf = albedo * max(0.0, cos_theta) * INV_PI;
  return bsdf;
}
```

## 漫反射BSDF

要注意的一点是，对于最终的漫反射值我们要乘上$\pi$才能保证BSDF的能量守恒。这个结论之前是知道的，下面给出一个简单的推导。首先根据反射率$\rho$的定义有（$E_i$和$E_o$分别代表irradiance和radiant exitance）：

$$E_o=\int_\Omega L(\omega_o)\cos \theta_o \mathrm{d}\omega=\rho E_i$$

由BRDF的定义可得：

$$\mathrm{d}L(\omega_o) = f_r \mathrm{d}E(\omega_i)$$

我们知道漫反射材质的$f_r$是常数，两边同时积分可得（注意$E(\omega_i)$和$E_i$不是一个东西）：

$$L(\omega_o) = f_r E_i$$

带入到反射率的定义后：

$$\rho E_i = \int_\Omega f_r E_i \cos\theta_o \mathrm{d}\omega = f_r E_i \int_\Omega \cos\theta_o \mathrm{d}\omega = \pi f_r E_i$$

从上式可知：

$$f_r = \frac{\rho}{\pi}$$

然后是EvalDirectionalLight的实现，需要考虑可见性项，也就是要从GBuffer中提取阴影信息：

```glsl
vec3 EvalDirectionalLight(vec2 uv) {
  vec3 Le = vec3(0.0); // 自发光项
  vec3 Ld = uLightRadiance * GetGBufferuShadow(uv);
  return Le + Ld;
}
```

至此第一部分就结束了。

# Part 2：Ray Marching

第二部分需要实现一个RayMarching算法来完成屏幕空间的求交，基本思路就是从某个像素对应的世界坐标出发，沿着给定的方向按照一定的步长行进若干步，直到当前坐标在屏幕空间中被遮挡，说明找到了交点。

由于我们不知道光线会行进多远，所以必须设置一个最大的行进步数。同时我们也不知道光线每步要走多远，所以这个值也是个超参数。当然，这种所谓线性搜索地方法是很慢的，老师在课上提到了使用HiZ方法来自适应地调整步长进而提高求交效率，不过在作业框架中实现HiZ是很困难的，这里就先留个坑，有意实现可以参考[2]。

回到算法的实现上来，其实就是一个步进光线然后与深度图比较的过程：

```glsl
bool RayMarch(vec3 ori, vec3 dir, out vec3 hitPos) {
  const float threshold = MARCH_STRIDE * 2.0;
  for (int i = 0; i < MARCH_MAX_STEPS; i++)
  {
    ori += dir * MARCH_STRIDE;
    float ray_depth = GetDepth(ori);
    vec2 uv = GetScreenCoordinate(ori);
    float geo_depth = GetGBufferDepth(uv);
    if (ray_depth > geo_depth) { // intersection found
      if (ray_depth - geo_depth > threshold)
        return false;
      if (dot(dir, GetGBufferNormalWorld(uv)) >= 0.0)
        return false;
      hitPos = ori;
      return true;
    }
  }
  return false;
}
```

其中关于threshold会放在第三部分之后解释。其实在其他同学的实现中，只需要判断`ray_depth > geo_depth`就足够了，不过我这边如果这么写的话阴影部分会出现严重的噪点。分析了一下发现遮挡物如果是背朝光线的话一定不会对最终的结果有贡献，就额外增加了一个判断光线与法线夹角的判断。按照文档的提示验证镜面反射效果：

![](/external/games202-hw3-ssr.png)

由于步长并不是非常小，所以在图像中间会有明显的瑕疵（跳变），不过整体效果是对的，说明实现基本正确。

# Part 3：间接光照

Part 3是最有意思的一部分，需要实现支持one-bounce的间接光照。当然，如SSRT的名字所暗示的，采样是不可避免的。对于每个像素点，我们采样一条光线，然后使用Part 2实现的方法来完成屏幕空间内的求交，计算该交点的直接光照后加权并累加到最终的间接光照中去，按照给出的伪代码实现即可。框架提供了均匀采样和按照余弦分布采样两种半球采样方式，后者算是一种重要性采样了，直接无脑选择。代码如下：

```glsl
vec3 EvalIndirectLight(vec3 wo, vec2 uv, vec3 worldPos, vec3 lightDir, inout float s) {
  vec3 n = GetGBufferNormalWorld(uv);
  vec3 t, b;
  LocalBasis(n, t, b);
  float pdf;
  vec3 hitPos;
  vec2 uv1;
  vec3 L = vec3(0.0); // one bounce
  for (int i = 0; i < SAMPLE_NUM; i++)
  {
    vec3 dir = normalize(mat3(t, b, n) * SampleHemisphereCos(s, pdf));
    if (RayMarch(worldPos, dir, hitPos))
    {
      uv1 = GetScreenCoordinate(hitPos);
      L += EvalDiffuse(dir, wo, uv) * EvalDiffuse(lightDir, -dir, uv1) * 
           EvalDirectionalLight(uv1) / pdf;
    }
  }
  L /= float(SAMPLE_NUM);
  return L;
}
```

由于采样出来的方向向量是在局部空间的，所以需要构造局部坐标系的基向量并将方向向量转换到世界坐标系中。`LocalBasis`所用的方法似乎是叫Frisvad方法（GPT说的），很容易验证它是对的，但是不知道原理是什么。

# 改进

终于可以看到结果了，却大失所望，画面中有很多的噪点，而且不同角度下的渲染结果非常不一致，尤其是在圈出的部分有漏光现象：

![](/external/games202-hw3-leak-1.png)

转动视角后更加明显：

![](/external/games202-hw3-leak-2.png)

来探究一下原因，其实与老师上课讲的是一样的：屏幕空间会丢失信息。具体来讲，由于GBuffer只会记录位于最前面的表面的信息，当前视角中被遮挡的表面的任何信息都是未知的。在RayMarching的过程中，由于判断交点存在的条件只是深度更大，所以会出现对于遮挡关系的误判。算法错误地认为某个可见的表面会对结果产生贡献，其实真正的交点在更远处的表面上或根本不存在。为了减少误判，[1]中使用了加threshold并动态调整步长的方式在优化。在试验中发现只需要threshold就能达到较好的效果，所需的改动就是如果某一次判断时光线的深度与GBuffer中的深度相差较大就认为交点不可见并返回false，改进后的算法如下：

```glsl
bool RayMarch(vec3 ori, vec3 dir, out vec3 hitPos) {
  vec3 last_ori;
  const float threshold = MARCH_STRIDE * 2.0;
  for (int i = 0; i < MARCH_MAX_STEPS; i++)
  {
    last_ori = ori;
    ori += dir * MARCH_STRIDE;
    float ray_depth = GetDepth(ori);
    vec2 uv = GetScreenCoordinate(ori);
    float geo_depth = GetGBufferDepth(uv);
    if (ray_depth > geo_depth) { // intersection found
      if (dot(dir, GetGBufferNormalWorld(uv)) >= 0.0 || ray_depth - geo_depth > threshold)
        return false;
      hitPos = ori;
      return true;
    }
  }
  return false;
}
```

其中threshold的大小与STRIDE呈正相关，降低在某些STRIDE较大的场景中错误地舍弃交点的几率。

# 最终的结果如下

场景1，采样数=8, stride=0.1, max_steps=50：
![](/external/games202-hw3-scene-1.png)

场景1，采样数=8, stride=0.1, max_steps=50：
![](/external/games202-hw3-scene-2.png)

场景3，采样数=8, stride=0.6, max_steps=30（记得在engine.js中切换灯光，要么场景会很暗）：
![](/external/games202-hw3-scene-3.png)

暗处的噪点说实话并不明显，场景三还是很震撼的，除了硬阴影的锯齿有点扎眼外。

# 参考
1. [Games202 作业三 SSR实现](https://remoooo.com/202hw3/)
2. [GAMES202-作业3](https://zhuanlan.zhihu.com/p/599842851)