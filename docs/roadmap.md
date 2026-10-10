# 开发进度

现状：Laoyu Desk TV 0.3.3已公开发行；负责人：捞鱼；最后更新：2026-10-10。

中文名「捞鱼桌脚看电视」，英文名「Laoyu Desk TV」。主仓库lyzbcy/laoyu-desk-tv；旧lyzbcy/paid-to-watch只保留0.3.2固化更新器的兼容发行通道。上游出处a295371927-sys/paid-to-watch及MIT许可保留。

- 声音：主进程统一状态、本地/网页独立开关、默认静音；老板键同时遮挡和静音，恢复用户偏好。隔离媒体回归通过。
- 平台：Windows x64、Mac Intel/Apple Silicon DMG/ZIP；Command键、工作区与多屏定位。Mac原生arm64打包应用的启动、解码和声音IPC通过。
- 无感：保护和自动自检默认开启，可分别关闭并保存。Windows原生保护/不可激活/工具窗回读，以及独立GDI正基线、保护探针和实际宿主小区域验证通过。自动检查不弹窗，不显示校准图块；完整捕获检查由用户触发。
- 更新：真实已安装0.3.2→最终0.3.3的校验、退出、安装、可见重启及旧名兼容入口通过，Shift+Z、媒体目录和声音偏好保留。报告verification/english-brand-installed-update.json。最终版以后读取新品牌仓库。
- 安装：Windows无边框WPF主题、盘符/路径与快捷方式选项；保留已有位置，首次优先非系统盘。源码前端原生可见性与真实后台安装版本登记通过。
- 软件中心：0.8.5新名称/Logo、新仓库、主程序识别与ZIP准备；真实下载、重启关联和打开以软件中心的最终验收报告为准。
- 日志反馈：有限技术日志，不记录媒体路径、网页内容或登录态。用户自行确认提交GitHub反馈；没有外发测试消息。

48项单测通过。品牌版Windows/Mac CI：https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38038840901；证据verification/ci-english-brand。独立Kimi观察报告verification/ui-observer/regression-0.3.3.md只证明模拟宿主DOM/视觉。真实捕获证据verification/privacy-windows.json，原生接口成功不能证明所有会议软件不可见。

Mac真人听音、原生全屏/全局键、更新安装及回滚仍需真机验证；静音WebM只证明解码和播放状态。Windows未签名，Mac未签名公证。系统文件选择器和安装器不在播放器保护范围。会议/录屏前须在目标软件预览，Mac ScreenCaptureKit可能绕过保护。开发目录保留E:/共享/创业/带薪看片，稳定AppID、userData和软件中心产品ID不变。


最终Windows设置验收：关闭无感保护与自动自检后冷启动仍关闭，原生标志关闭/恢复成功，最终两项恢复开启；媒体、老板键和声音偏好保留。见verification/privacy-installed-restart.json。网页介绍页已同步v1.20.0，私有备份提交15dce0e5b8e8ba835972696b26269339ef885b9e。
