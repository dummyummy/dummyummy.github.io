---
title: TAA
categories:
    - 计算机图形学
    - CG
    - 实时渲染
tags:
    - 抗锯齿
---

# TAA实现小结

## 前言

刚把LearnOpenGL的渲染部分学完，IBL的效果是真不错，但是锯齿挺明显的：

![](notaa.png)

又因为跑的是defer管线，很难上MSAA，想着加一套抗锯齿进去，查了些资料后还是选择了TAA而非FXAA和SMAA等后处理抗锯齿。TAA有很多优点，比如不会随着运动而抖动，同时能够为画面中几乎所有的部分完成抗锯齿，生来就与Defer兼容等等。加入TAA后的效果如下：

![](taa.png)

锯齿肉眼可见地基本消失了。

## 实现思路

TAA作为经典算法已经有很多教程了，GDC和Siggraph Course上各大厂商也给出了很完善的解决方案，如果要从头学习的话，建议是先看知乎上的介绍[4]，然后是[1]和[5]这两篇很好的教程，另外[1]、[4]和[5]中提到的的很多技巧基本都是在[2]和[3]中提出来的。

TAA的流程大致可分为三个部分，分别是**Jitter**、**Motion Vector**和**Resolve**。

### Jitter

Jitter便是TAA的核心思路。首先回想下最原始的抗锯齿即SSAA的原理：在像素内额外进行多次采样并取平均颜色。TAA本质上是做了同样的事情，不过将所有的采样分摊到了多个连续帧中去做。Jitter便是生成这些采样点的过程，TAA会用一个随机的采样点序列来表示亚像素级的偏移，每帧使用不同的偏移，并在帧间进行累积。

一般来说不会使用一个全随机的Jitter Sequence而是会用低差异度序列来代替，基本上大家都用的是Halton序列。由于Jitter是个二维的向量，在生成Jitter时$x$分量的基数为2而$y$分量的基数为3。项目中使用的Halton序列生成器如下：
```typescript
// https://observablehq.com/@jrus/halton
function halton(index: number, base: number): number {
    let fraction = 1;
    let result = 0;
    while (index > 0) {
        fraction /= base;
        result += fraction * (index % base);
        index = Math.floor(index / base); // floor division
    }
    return result;
}

export function* generateHaltonSequence1D(base: number): Generator<number> {
    let index = 1;
    while (true) {
        yield halton(index, base);
        index++;
    }
}

export function* generateHaltonSequence2D(base1: number = 2, base2: number = 3): Generator<[number, number]> {
    let index = 1;
    while (true) {
        yield [halton(index, base1), halton(index, base2)];
        index++;
    }
}

export function HaltonSequence2D(count: number, base1: number = 2, base2: number = 3): [number, number][] {
    const gen = generateHaltonSequence2D(base1, base2);
    const result: [number, number][] = [];
    for (let i = 0; i < count; i++) {
        result.push(gen.next().value);
    }
    return result;
}
```

对于如何应用Jitter，有两种可选的方式，一种是直接修改投影矩阵的第三行，另一种则是修改Vertex Shader输出的Clip Space Position。第一种方法的好处在于不用修改原有的Shader逻辑，但是在计算Motion Vector时需要抵消Jitter的影响。为了逻辑的清晰，本文选择了第二种方法，伪代码[6]如下：

```hlsl
    float4 worldPos  = modelMatrix * float4(in.position, 1.0);
    float4 clipPos = viewportParams.viewProjectionMatrix * worldPos;
        
    clipPos += viewportParams.jitter*clipPos.w; // Apply Jittering

    out.position = clipPos;
```

这里还要额外做一些说明，Jitter其实只是通过扰动NDC坐标而对光栅化产生了影响，但光栅化又与插值相关联，因此到最后下面所有的这些输出都会受到影响，进而达到了边缘抗锯齿的效果：
```glsl
out highp vec2 fragTexCoord;
out highp vec3 fragNormal;
out highp vec4 fragTangent;
out highp vec3 fragPos;
out highp vec4 fragPosClip;
out highp vec4 fragPrevPosClip;
```

做完这一部分后，如果进行可视化，可以看到画面是抖动的：

![](jitter.gif)

### Motion Vector

在将当前帧的画面与历史颜色进行混合之前，我们还要去计算屏幕空间内的Motion Vector。在一个动态的场景中，运动可能来自于以下的几个方面：

- 相机的运动
- 物体的TRS运动
- Skinned Mesh的变化
- 顶点动画
- UV动画

前面四个的基本解决思路就是，保存历史的变换，比如对于第二种就是Previous Model Matrix，在当前帧中同时算出当前屏幕uv和历史屏幕uv，并将uv的插值累加到Motion Vector中。既然有了Jitter Offset，这一步就很好做了，直接在Vertex Shader中输出**未Jitter**且考虑了四种运动的Clip Space Position以及Previous Clip Space Position，在Fragment Shader中做差值即可。项目中为了方便只实现了考虑相机运动的Motion Vector，关键代码如下：

```glsl
    // Vertex Shader
	fragPosClip = matrix_VP * vec4(fragPos, 1.0);
    fragPrevPosClip = matrix_Prev_VP * vec4(fragPos, 1.0);

	/*********************************************************/

	// Fragment Shader
	// Motion vector
    vec2 prevNDCCoord = fragPrevPosClip.xy / fragPrevPosClip.w;
    vec2 currNDCCoord = fragPosClip.xy / fragPosClip.w;
    vec2 motionVec = (currNDCCoord - prevNDCCoord) * 0.5;
	
    GBuffer3 = vec4(motionVec, 0.0, 0.0);
```

注意这里一定要是**未Jitter**的Motion Vector，否则可能会错误采样到别的像素。原因也不难理解，Motion Vector代表的是像素间的对应关系，考虑Jitter就不合理了。

[3]也包含了UV动画产生的Motion Vector的计算方法，简单张贴一下：
![](uv.png)

### Resolve

Resolve负责进行帧间的累加，大致流程如下，图源[5]：

![](overview.png)

Resolve实际上很简单，就是利用Motion Vector算出当前像素在上一帧对应的位置，采样历史颜色并按一定的权重做混合，这样产生的画面就成功完成了抗锯齿，关键代码如下：

```glsl
    vec2 uv = fragTexCoord;
    vec2 offset = 1.0 / vec2(textureSize(currentFrame, 0));
    vec2 mv = texture(GBuffer3, uv).xy;
    vec3 currentColorHDR = texture(currentFrame, uv).rgb;
    vec2 jitteredUV = uv - mv;
    vec3 historyColorHDR;
    if (jitteredUV.x < 0.0 || jitteredUV.x > 1.0 || jitteredUV.y < 0.0 || jitteredUV.y > 1.0) {
        historyColorHDR = currentColorHDR;
    } else {
        historyColorHDR = texture(historyFrame, jitteredUV).rgb;
    }

	FragColor = vec4(mix(currentColorHDR, historyColorHDR, historyWeight), 1.0);
```

但是这样会有几个问题，下面逐一来解决。

#### 遮挡造成的鬼影

这里借助以下FSR的图进行说明，在场景发生运动时，遮挡关系也会随之发生变化，如下图所示，Disocclusion Mask的黑色部分是没有历史信息的。如果我们还是拿着Motion Vector去采样便会造成错误的结果。

![](disocclusion.png)

解决方式也不难，在当前帧中采样3x3邻域内的颜色，并计算这些颜色构成的AABB，然后将historyColor Clamp到对应的AABB中。另外在[2]中UE也提到在YCoCg颜色空间中进行Clamp会更好，最终代码如下：

```glsl
        // Clamping history color to avoid disocclusion artifacts
        vec3 minColor = RGBToYCoCg(currentColorHDR.rgb);
        vec3 maxColor = minColor;
        for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
                vec3 sampledColorHDR = texture(currentFrame, uv + vec2(x, y) * offset).rgb;
                sampledColorHDR = RGBToYCoCg(sampledColorHDR);
                minColor = min(minColor, sampledColorHDR.rgb);
                maxColor = max(maxColor, sampledColorHDR.rgb);
            }
        }
        historyColorHDR.rgb = clamp(RGBToYCoCg(historyColorHDR.rgb), minColor, maxColor);
        historyColorHDR.rgb = YCoCgToRGB(historyColorHDR.rgb);
```

AABB Clamp可能会造成偏色，[2]中提出了对应的解决方法，即将historyColor Clamp到AABB的边界而非角落，项目中没有实现就不再赘述了。

#### 闪烁

Clamping很容易导致高光部分发生闪烁的问题。由于我们采用的是周期性指数平均的混合方式并开启了HDR，某些亮点可能会周期性出现并主导混合结果进而导致闪烁。有两个解决这个瑕疵的Trick，第一个是在混合前进行可逆的临时性Tonemapping，第二个则是[2]中提出的根据Luminance降低高亮度样本的权重。两个方法都能一定程度上抑制闪烁，随便用一种即可。当然代价也是有的，高亮部分会稍显黯淡。Shader代码如下：

```glsl
        // Tonemapping
        vec3 currentColor = Tonemapping(currentColorHDR); 
        vec3 historyColor = Tonemapping(historyColorHDR);
        vec3 blendedColor = currentColor * (1.0 - historyWeight) + historyColor * historyWeight;
        FragColor = vec4(InverseTonemapping(blendedColor), 1.0);

        // Weighted blending
        vec4 currentColor = AdjustHDRColor(currentColorHDR); 
        vec4 historyColor = AdjustHDRColor(historyColorHDR);
        vec4 blendedColor = currentColor * (1.0 - historyWeight) + historyColor * historyWeight;
        FragColor = vec4(RestoreHDRColor(blendedColor), 1.0);
```

#### 效果

首先是不使用Clamping的效果图：
![](ghosting.png)

使用Clamping并抑制闪烁后：

![](no-ghosting.png)

### 渲染管线的其余部分

#### 天空盒

天空盒也要生成对应的Motion Vector。

#### SSAO

由于此时的Depth Buffer是Jitter过的，SSAO的半球面采样点投影后也要加上Jitter才行，否则画面会整体闪烁。

#### Forward管线

Forward管线理论上也是与TAA适配的，不过为了输出Motion Vector的话需要借助MRT或Multi-Pass。

# 遗留问题

- 当高频的细节如草地或法线贴图与其他部分混合时Clamping会失效，如下图所示，注意下图的草地部分有淡淡的轨迹，[3]中提出了解决方法。

  ![](hfreq.png)

- 由于采样history frame时用的是双线性插值，经过TAA的累积后图像可能会变得更加模糊，解决方式为使用5-tap的Catmull-Rom Filter来滤波，参考[1]的Blurring部分。

- 画面在场景发生运动时会变得模糊似乎是这类时间性抗锯齿方法的通病，既然借助于历史信息了就必定会有这个问题，不过怎么说都比发生时域上的高频闪烁好。

# 更好的方案

FSR2/3、DLSS3往上(DLAA)和TSR都可以在超分的同时抗锯齿，DLSS还能借助光流估计以及CNN或ViT的帮助来减少鬼影并提高稳定性[7]。

# 参考

1. [Temporal AA and the Quest for the Holy Trail](https://www.elopezr.com/temporal-aa-and-the-quest-for-the-holy-trail/)

2. [HIGH-QUALITY TEMPORAL SUPERSAMPLING SIGGRAPH COURSE 2014](https://advances.realtimerendering.com/s2014/epic/TemporalAA.pptx)
3. [Temporal Antialiasing In Uncharted 4](https://advances.realtimerendering.com/s2016/s16_Ke.pptx)
4. [主流抗锯齿方案详解（二）TAA](https://zhuanlan.zhihu.com/p/425233743)
5. [Temporal Reprojection Anti-Aliasing in INSIDE](https://www.gdcvault.com/play/1022970/Temporal-Reprojection-Anti-Aliasing-in)
6. [Temporal Anti-Aliasing(TAA) Tutorial](https://sugulee.wordpress.com/2021/06/21/temporal-anti-aliasingtaa-tutorial/)
7. [DLSS Wikipedia Page](https://en.wikipedia.org/wiki/Deep_Learning_Super_Sampling#DLSS_4.0)

