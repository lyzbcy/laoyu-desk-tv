# 软件中心接入

现状：0.3.2正式包与0.8.4软件中心已登记，严格自查通过；负责人：捞鱼；最后更新：2026-10-10。

适配Skill：E:/共享/tools/软件开发/启动器适配/laoyu-launcher-adapter/SKILL.md。产品ID paid-to-watch，主程序捞鱼桌脚看电视.exe。自己仓库lyzbcy/laoyu-desk-tv用于发布；包名带平台/架构，下载以版本无关前缀和后缀匹配。

最终包生成launcher-adapter.json，运行严格自查，再修改软件中心catalog、installed和portable登记并随客户端发布。真实下载、校验、安装/准备、打开和升级后保留关联分别验收。Mac发布单独提供，Windows软件中心不能证明Mac运行正常。

`node scripts/release-metadata.cjs <软件中心根目录>`从最终ZIP生成真实哈希与fallback，描述文件只提供验收数据；实际识别仍由客户端白名单提供。报告verification/launcher-adapter-report.json全PASS，包括真实安装识别；公开集中统计已包含paid-to-watch自有仓库且latestRelease由正式发行动态提供。下载累计包含Windows/Mac全部附件和重复/更新下载，不等于独立用户。
