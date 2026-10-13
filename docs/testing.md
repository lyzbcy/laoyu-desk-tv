# 测试与验收

现状：0.3.3品牌版验证，真机限制见roadmap；负责人：捞鱼；最后更新：2026-10-10。

2026-10-13：66项核心测试；新增独立ZIP CRC、旧日志字段/事件过滤、令牌撤销/失败重试/长备注、15×24h边界、BOM配置/恢复副本、真实目录异步扫描、缓存冷启动与原生重启登记门禁。smoke保持所有窗口隐藏，重复打开不show/focus，不创建真实托盘；外链/剪贴板/下载的替身仅在smoke模式，诊断文件只写隔离test-downloads。真正更新不得用smoke替代。

独立Kimi报告verification/standards-2026-10-13/observer/report.md记录两轮夹具：发现隐藏旧正文残留后，复验DOM清空与旧token的POST400。该HTTP夹具不是主进程IPC或真实Github提交，15天观察只证明当前RAM状态跨页面reload；真实规则/磁盘IPC由其他测试分别验证。最终包、正式状态和生产安装更新仍待本轮完成。

上游22项基线通过。单测覆盖真实状态转换、窗口工作区、Command录入、版本/平台/哈希和失败恢复。UI测试使用独立userData及本地媒体/网页fixture，不覆盖用户正在看的直播和设置。

用户指定“网页回归测试.md”：网页操作时需子Agent通过KimiBridge观察并记录报告。实际执行前检查扩展连接；无法连接则如实报告，不能把模拟或Electron自动测试写成Kimi观察通过。真实Windows/Mac安装、全屏桌面、按键、听音独立记录。

`npm test`：48项。`electron . --paid-to-watch-smoke`和打包exe相同参数使用临时userData，默认静音、声音切换、老板状态、直播隐藏、真实本地网页媒体解码及设置声音IPC均断言；`PAID_SMOKE_OUTPUT`指定报告目录。不触碰用户媒体、全局键、系统音量或外部反馈。

Windows完整更新：`node scripts/verify-installed-update.cjs <真实旧exe> <暂存安装器> <目标版本> <报告>`，以调试进程临时映射固定发行地址，实际点击设置按钮，核对helper新token/restarted回执与用户设置。不要复用旧回执，勿将调试映射加入客户端。MacCI原生arm64的打包启动与DOM验证通过，x64构建通过，真机听感/全局键/全屏与安装回滚未验证。
