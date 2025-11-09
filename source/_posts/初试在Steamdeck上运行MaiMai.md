---
title: 初试在Steamdeck上运行MaiMai
tags:
  - MaiMai DX
categories:
  - Steamdeck
date: 2025-11-09 16:14:13
---


# 引子

说在前面，本人并非wmc，同样也是音游苦手。本次只是为了探索Steamdeck的潜力，因此对于一些关于Maimai的概念解释和术语可能不准确，请见谅。

目前的效果是，能在Steamdeck的桌面模式下进行竖屏的游玩，只显示P1，解锁全曲目和难度，支持Freeplay但只能以Guest模式进入游戏，同时MelonLoader无法加载，因此没办法加载Mod如AquaMai。

另外请注意，这只是一次探索，并非最优雅的解决方式。

在开始前请速览下一节列出的资料。

# 资料速览

- Maimai版本与Dump的对应关系：https://web.archive.org/web/20230730211439/http://teknoparrot.link.free.fr/multi/maimai%20finale.html

- SDEZ 1.55 DX Prism Plus Download：https://www.emuline.org/topic/3489-reposted-maimai-finale-dx-dx-splash-universe-festival-sega-ringedge/page/12/#comment-165666

- SDEZ 1.56 Download：https://dc.evilleaker.com/?lang=zh-cn

- SDEZ配置指南1：https://performai.evilleaker.com/manual/games/maimai_dx/setup/

- SDEZ配置指南2（主要看评论区）：https://www.94joy.cn/maimai/267/

- Segatools Git Repo：https://gitea.tendokyu.moe/TeamTofuShop/segatools

建议首先遵循**SDEZ配置指南1**完成相关资源的下载和配置，出现问题后再从**Emuline**和**SDEZ配置指南2**的评论区中寻找解决方案。

P.S. Emuline目前已经关闭了注册渠道。

# 部署指南

## Steamdeck的初步配置

1. 进入Desktop Mode，打开应用商店，安装ProtonUp-Qt和ProtonTricks。

2. 打开ProtonUp-Qt安装GE-Proton，这是Proton的一个开源的增强版本，添加了若干的Patch。另外补充一下，Proton是在Wine的基础上改动的，因此如果要在Linux跑游戏的话还是首选Proton，不行了可以再尝试Wine。

   **P.S.** 在GE-Proton的[官方Repo](https://github.com/GloriousEggroll/proton-ge-custom?tab=readme-ov-file)中看到说在Proton是会跑在容器中的，如果要在Steam之外运行程序的话只能借助某个特定Launcher才能做到。不过本人并没有使用该Launcher，我猜是该容器只是为Proton配置好了对应的环境变量和文件系统，当然可以借助其他的方式完成。

## 下载和配置SDEZ

1. 在电脑上下载1.55或1.56版本的SDEZ，如果是在evilleaker下载的话，请按照**SDEZ配置指南1**解压和配置Segatools，在Emuline提供的Pixeldrain下载的则是已经配置好的版本。
2. 配置好后可以先在PC上试试，如果OK的话说明配置大体没问题，这里不用虚拟Aime卡并注册AquaDX和MuNet也行，因为目前来看Deck上也用不了。
3. 将配置好的传输到Deck，由于文件不小，建议的传输方式为使用Wrapinator，如果网络的好的话用SMB或SFTP也行。

## SDEZ在Steamdeck上的配置

注意，**下面的所有操作都在桌面模式中进行！**

1. 将Package/Sinmai.exe右键添加到Non Steam Game，打开Steam，首先将游戏执行文件的路径改为Package文件夹中的Start.bat或Launch.bat，注意路径中不能有中文；然后设置兼容性，改为GE-Proton。

2. 此时试着启动游戏，Sinmai会闪退，只有bat和inject的命令行窗口出现，在Steam中停止游戏即可。

3. 打开刚才安装好的ProtonTricks，进入到SDEZ默认的Wine容器，选择第一项即安装Windows DLL或组件，安装下面的功能：

   - dotnet 3.5
   - dotnet 4.0
   - dotnet 4.8
   - dxvk
   - ucrtbase2019
   - vcrun2012
   - vcrun2019

4. 装好后还是使用ProtonTrick对SDEZ的容器运行Wine配置程序，选择驱动器一栏，删除掉根目录到Z盘的映射，添加容器根目录到D盘的映射。

5. 修改Package/segatools.ini，dns一栏中的default填aquadx.hydev.org或play.mumur.net都行，keychip请留空，否则游戏会卡死。

6. 修改config_client.json，lan_install/server和net_delivery/enable都修改为true，否则会卡配信サーバーcheck过不去。

7. 修改config_common.json，找到credit项修改为如下所示的内容，开启freeplay：

   ```json
   "credit":
   {
   	"enable": true,
   	"max_credit": 24,
   	"config":
   	{
   		"coin_chute_type_common": true,
   		"service_type_common": true,
   		"freeplay": true,
   		"coin_chute_multiplier": [ 1, 1 ], 
   		"coin_to_credit": 1,
   		"bonus_adder": 0,
   		"game_cost": [ 1,2,2 ]
   	}
   }
   ```

8. 修改Start.bat（或Launch.bat），将Sinmai的启动参数改为：

   `-screen-fullscreen 1 -screen-width 1600 -screen-height 1280`

9. 因为没有找到让窗口变成portrait的方法，最抽象的一步要来了：打开系统设置，找到显示和监视器一栏，将屏幕的方向调整为第一个也就是800x1280。由于这一步的存在，之后进行游玩时也只能在桌面模式下玩。如果有人能找到旋转屏幕的方法就好了，实测config_common.json中video一栏的配置不会生效。
10. 打开Steam，完成最后的按键映射，新建一个控制器布局，将`ABXY`和`D-Pad`一一映射到键盘的`QWEADZXC`八键上，分别对应洗衣机（bushi）的每个按钮，同时建议把背面握持键也做一下映射，比如`R5`映射到`Esc`，这样可以方便退出游戏。

## 大功告成

可以开玩了！

# 注意事项

- 游玩前请进入到桌面模式，并调整为竖屏。
- 长按右侧手柄的三道杠按钮可以切换按键绑定，在游戏中需要使用我们之前配置好的布局。
