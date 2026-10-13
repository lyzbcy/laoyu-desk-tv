# 0.3.7 规范完善验收

2026-10-13，正式发布[0.3.7](https://github.com/lyzbcy/laoyu-desk-tv/releases/tag/v0.3.7)。对照E:/共享/tools/软件开发，完整核查表见standards-audit.md。稳定AppID、paid-to-watch设置目录和产品ID、旧名兼容入口保留。

本轮修复日志分享前二次过滤、独立诊断ZIP、预填GitHub及预览撤销；同日重启缓存新版提醒、安装前实时查新；设置内评价邀请与完整15天冷却；配置恢复副本和目录异步状态；Windows安装登记/Unicode快捷方式共同核验及完整恢复。用户明确选择GitHub渠道，未嵌入机器人密钥或发送真实反馈。

| 验收 | 最终证据 |
|---|---|
| 核心/隐藏界面 | 66项核心测试；0.3.7源程序及真实公开Windows ZIP打包程序SMOKE_OK，全新隔离配置，实际媒体、声音/老板状态及反馈IPC/ZIP；预期旧令牌拒绝留证。 |
| Windows/Mac原生构建 | [38339371823](https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38339371823)，源5e8d3cdb7adaa16604e8b5208be49534219404e5；Mac ARM打包应用隐藏回归、Intel构建。 |
| 同字节发布 | [38339846328](https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38339846328)，八个完整平台附件逐项SHA/大小匹配后转正式；没有覆盖同版公开资产，旧0.3.3八包保持。 |
| 正式更新0.3.3→0.3.7 | [38340440778](https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38340440778)，实际安装版UI检查/点击、正式在线查询/网络原字节、旧PID退出、卸载登记/快捷方式、可见新版与桌面重开、安装ID/合成偏好保留。 |
| 修复基线0.3.6→0.3.7 | [38340437825](https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38340437825)，同上；正式run没有主进程调试器或发布元数据映射，明确存在缓存输入但安装强制查新。 |
| 安装后故障恢复 | [38340080082](https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38340080082)，从真实不可变0.3.6 ASAR提取助手，只在实际0.3.7 NSIS替换和目标登记/链接确认后注入一次异常，原catch恢复所有原程序哈希、完整HKCU登记及快捷方式字节，旧版可见打开。 |
| 现有软件中心 | [38341469840](https://github.com/lyzbcy/laoyu-desk-tv/actions/runs/38341469840)，未修改0.8.10正式ZIP、真实旧0.3.3缓存与忽略旧关联状态，实际界面查新/下载0.3.7、校验/准备、中心重开保留关联、正常可见打开。严格adapter全PASS。 |
| 官网 | 原网址v1.22.4，21卡片及其他产品、三Skill、中心Win0.8.10/Mac0.9.4保留；隐藏桌面/手机/两Mac芯片选择回归通过。独立Kimi发现并复验手机误用Mac安装说明的修复；预览与最终live分别记录。 |
| 网页备份/统计 | 全文SHA 8a9e9a103e1ae017ce46a678c1224f109beacd1de4f124d2b069599390be01be，859284字节；私有备份1742f7a7741616d84021c78a47009accd40eb16d字节一致。统计run38340543696成功，公网产品latestRelease版本/原ZIP SHA正确。 |

Windows ZIP：40a7389d6b8963630985d911a9452b6c9901e94de9b41ceb141f98919350c553，156477353字节；安装器：81a436b48034f618de083bd9242915eb6d8b22ecb548fa4a4a8a82390f3959f5，115973780字节。其余平台包见Release中的SHA256SUMS-0.3.7.txt。

0.3.4故障注入实测发现Copy-Item回拷目录嵌套，原ASAR未恢复；修复后递增版本，未覆盖候选。候选升级早期wait-parent失败源自测试调试器阻止退出，断开后通过，没有放宽客户端门禁。软件中心初期验证脚本假定ZIP根目录/ASAR布局，后按实际包结构严格核验；旧缓存夹具隔离启动时自动准备行为后完成查新验证。历史失败和被替代尝试仍保留，不冒充产品通过。

旧客户端首次升级使用其固化助手，完整恢复能力从修复版后续升级生效。0.2.1没有更新器，首次须手动安装。所有正常可见安装测试在临时GitHub Windows主机；本机只用隐藏/offscreen和隔离目录，未升级用户正在运行的软件。Kimi预览使用明确RAM测速夹具，不能证明公网速度/下载或实时看到独立Electron窗口；独立观察、真实IPC/ZIP与生产安装分开报告。

Mac真人听音、全局键、全屏空间及安装更新回滚仍待真机确认；静音媒体只证明解码和状态。Windows未代码签名，Mac未签名公证。完整本地证据在verification/standards-2026-10-13，开发文档及私有产品metadata备份分别保留其既定仓库可见性。
