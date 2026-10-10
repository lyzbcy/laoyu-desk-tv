# 开发进度

现状：0.3.2已公开发行；负责人：捞鱼；最后更新：2026-10-10。

用户授权：基于上游继续开发，遵守软件开发规范；Mac版、声音体验和软件中心接入全部实施。上游0.2.1基线22项测试通过。新开发仓库lyzbcy/paid-to-watch，保留上游历史。

| 工作 | 状态/验收 |
|---|---|
| 项目Skill及渐进式文档 | 已建立，quick_validate通过 |
| 声音开关、老板键一致性 | 已实现主进程统一状态，Windows/Mac真实Electron隔离回归通过 |
| Mac窗口/Command键/两种架构包 | Intel/Apple Silicon的DMG/ZIP均已发布；arm64实际打包应用的隔离启动、UI状态、声音IPC和解码通过 |
| 日志/用户反馈 | 有限技术日志、导出与用户确认GitHub反馈，不包含群机器人密钥，未外发测试消息 |
| 自身更新 | Windows安装版0.3.1候选→0.3.2真实UI更新/校验/退出/重启通过，目录、Shift+Z及声音设置保留 |
| 软件中心接入 | 0.8.4已登记，严格自查全通过；下载打开验收另见软件中心docs/paid-to-watch-adapter.md |
| 原有Windows便携版 | 已迁移到安装版；D:/Downloads/-0.2.1-win原目录保留 |

验证：44项单元测试；CI https://github.com/lyzbcy/paid-to-watch/actions/runs/38030804459 Windows/Mac通过。独立Kimi报告verification/ui-observer/regression-report.md；Windows原生与打包报告ui-final-windows/ui-final-packaged-windows，升级installed-update-windows.json；Mac证据ci-mac-final-ui-strict。浏览器fixture只证明DOM/视觉交互，silent.webm只证明解码和状态，不证明音频听感。Mac隐藏offscreen截图有合成缓存，DOM状态与声音IPC已通过强制断言，截图不作为动态数值证据。

Windows经验：进程级ExecutionPolicy Bypass运行随包助手；版本资源兼容第四段.0；主进程等待存在竞态须允许进程已退出，安装前还需等待Chromium子进程。ready/commit/abort握手通过才退出；失败保留备份。0.3.0/0.3.1为内部候选，未正式发行。

Mac真人听音、原生全局快捷键/全屏空间、更新安装及回滚尚未真机验收。Windows未签名；Mac未签名公证。设置备份verification/config-before-migration.json只留本地，不上传。
