---
name: paid-to-watch-dev
description: 开发、修复、打包和维护带薪看片的 Windows/macOS 版本，包括声音、老板键、网页播放、日志、更新与捞鱼软件中心适配。
---

# 带薪看片开发入口

## 项目与技术

伪装成右下角广告弹窗的本地视频/网页播放器。基于 a295371927-sys/paid-to-watch 二次开发，Electron 31、原生 JavaScript/CSS、electron-builder、Vitest；Windows x64、macOS x64/arm64。

## 目录地图

- docs/agent.md：唯一文档导航；开发功能前先读对应模块及 roadmap.md。
- src/core/：配置、按键、播放状态、窗口几何、版本与日志纯逻辑。
- src/main/：Electron宿主、托盘、存储、更新与反馈窗口。
- src/renderer/、src/preload/：本地页面与有限IPC桥；直播网页无Node权限。
- scripts/、tests/：构建、隔离回归与测试；reference/保存深度资料。
- launcher-adapter.json：启动器验收输入，须以最终包的真实哈希生成。

## 开发约定

从分支 codex/* 开发，提交说明写具体行为。遵守 E:/共享/tools/软件开发，保持代码、文档与 package.json.version 同步；完成后推送自己的 origin，upstream只用于比较/同步。日志使用有限技术事件，不写用户路径、网址、内容或凭据；状态和失败在控制面板可见。

## 版本与更新

package.json.version是唯一版本源。当前0.3.0开发候选，正式上游仍0.2.1。读取 docs/updater.md：每天按上海日期检查正式新版，尝试/成功分别记录，手动可重试；版本较新且包SHA-256验证通过后，由用户点击安装并重启，失败保留旧版恢复路径。没有更新器的0.2.1须手动安装首次迁移。源码推送不是软件发布。

## 功能与验收

本轮范围：Mac适配、声音可控、日志/反馈、自身更新、启动器接入。实现状态与真实证据以 docs/roadmap.md 为准，不能将设计当作完成。单测 npm test，隔离UI/构建命令见 docs/testing.md；启动器规范为 E:/共享/tools/软件开发/启动器适配/laoyu-launcher-adapter/SKILL.md，发布前严格自查并实际下载、识别、打开。

## 红线

老板键必须同时遮挡并静音所有播放源，退出伪装只恢复用户此前声音偏好。默认静音，不自动修改系统音量或输出设备。更新须固定来源、平台/架构匹配和哈希核验；公开包不可覆盖同版本。先验证后迁移用户正在运行的旧版本；Mac未经真机验证的内容写明。
