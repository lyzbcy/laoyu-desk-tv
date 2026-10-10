# 技术边界

现状：开发中；负责人：捞鱼；最后更新：2026-10-10。

保留Electron架构，Mac/Windows共享业务逻辑。主进程控制播放模式和声音偏好；渲染层只应用明确状态，不自行切换另一个bossOn。独立BrowserView承载直播，默认隔离且无Node能力。

用户设置在系统userData/paid-to-watch；声音、目录、快捷键沿用原配置。配置原子保存。日志只含有限技术事件。网络、反馈分享及更新包验证都由主进程完成。

发布源固定为lyzbcy/laoyu-desk-tv，主程序为捞鱼桌脚看电视.exe、捞鱼桌脚看电视.app；启动器ID paid-to-watch。跨平台构建与平台验收独立，不能用Windows样本证明Mac正常。
