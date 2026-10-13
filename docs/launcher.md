# 软件中心接入

现状：0.3.7正式包与既有Windows0.8.10软件中心规则匹配，最终ZIP严格自查通过。
负责人：捞鱼。
最后更新：2026-10-13。

适配Skill：E:/共享/tools/软件开发/启动器适配/laoyu-launcher-adapter/SKILL.md。产品ID paid-to-watch，主程序捞鱼桌脚看电视.exe。自己仓库lyzbcy/laoyu-desk-tv用于发布；包名带平台/架构，下载以版本无关前缀和后缀匹配。

最终包生成launcher-adapter.json，运行严格自查，再修改软件中心catalog、installed和portable登记并随客户端发布。真实下载、校验、安装/准备、打开和升级后保留关联分别验收。Mac发布单独提供，Windows软件中心不能证明Mac运行正常。

`node scripts/release-metadata.cjs <软件中心根目录>`从最终ZIP生成真实哈希与fallback，描述文件只提供验收数据；实际识别仍由客户端白名单提供。报告verification/launcher-adapter-final.json全PASS，包括真实安装识别；公开集中统计已包含paid-to-watch自有仓库且latestRelease由正式发行动态提供。下载累计包含Windows/Mac全部附件和重复/更新下载，不等于独立用户。

本轮没有新增白名单或重发软件中心同版客户端；0.8.10按版本无关规则查询当前正式产品，私有权威源码目录catalog仅同步0.3.7 fallback。严格报告verification/standards-2026-10-13/launcher-adapter-037.json，对实际最终ZIP校验SHA、88条目、390405417字节声明解压量、根目录主程序与真实匹配规则。Windows ZIP SHA-256 40a7389d6b8963630985d911a9452b6c9901e94de9b41ceb141f98919350c553，156477353字节。Mac软件中心0.9.4不变，Windows验收不能替代Mac接入真人确认。

run38341469840使用未修改的正式软件中心0.8.10 ZIP，真实旧0.3.3 ZIP缓存与已忽略旧关联的合成状态，实际界面下载→查新→校验→准备0.3.7、重开软件中心保留关联、点击打开正常可见0.3.7全部通过。不是重新构建的软件中心，也没有替换其内置catalog或下载API；旧缓存本体仍为原SHA。报告verification/standards-2026-10-13/center-product-final/center-product.json，源码metadata私有备份e539267。
