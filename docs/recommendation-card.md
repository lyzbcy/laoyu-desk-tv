# 信息流推荐卡片

现状：0.3.12候选，源码隐藏回归通过，发行构建待验收。
负责人：捞鱼。
最后更新：2026-10-13。

用户选择“信息流视频推荐”，明确拒绝主窗口的声音、设置、反馈提示。单一“拾光视频”卡片替代五种夸张文案与六秒轮换，白底、轻量广告标识、离线摄影封面；空白/老板状态沿用同一封面，正常播放嵌入原有视频区域。关闭按钮退出整个应用，停止各播放源。声音、设置、新版提示、一级反馈在托盘；读取、加载、失败详情在设置。网页失败隐藏并静音，重试成功恢复偏好。

默认360×320。保存过的尺寸/位置继续保留；托盘“恢复推荐卡片大小”保留窗口底边位置并按工作区钳制。网页区域使用cardLayout纯函数，与CSS阶段高度对应，设置模式另外扣除32像素地址栏。150% DPI下Electron客户区DIP与DOM取整可能相差1像素，原生回归检查各边界误差不超过1像素。

保留paid-to-watch配置目录、AppID、默认静音、老板键强制静音/遮挡、本地与网页独立声音偏好、防捕获及自动检查。反馈保持用户选定的预填GitHub表单和可选诊断ZIP，不包含群机器人密钥。

源码验证：66项核心测试；真实本地静默媒体解码、真实BrowserView静默夹具、默认静音/托盘开声/老板状态静音及恢复、设置模式区域、失败网页隐藏静音及重试、空白/播放/老板/失败无身份文案、托盘一级反馈及作者页回访、真实关闭IPC。所有窗口隐藏，临时userData，外链/剪贴板替身，未运行本机安装器或触碰用户播放。截图和原始失败/修复记录位于verification/card-0312。

封面使用内置image_gen生成，资产为src/renderer/assets/recommendation-street.png，随包离线提供。提示词：Use case: photorealistic-natural. Asset type: offline video recommendation cover for a compact Chinese desktop feed card. Wide 16:9 documentary photograph of an ordinary quiet Chinese city street corner after rain, small neighborhood cafe with a warm lit window and a parked bicycle, soft overcast morning light, wet stone pavement, muted natural sage and warm gray tones. Candid believable video still, modest everyday scene, restrained editorial photography, no cinematic effects or dramatic saturation. Eye level camera. No people close up, no logos, no readable writing, no UI, no captions, no watermarks. Make this a real photographic scene rather than an illustration.

独立Kimi浏览器观察使用scripts/preview.cjs的HTTP夹具；它验证卡片DOM/外观与浏览器操作，不证明真实主进程IPC、原生窗口退出或实际全局老板键。Mac真人听音/全屏空间/全局键与安装回滚仍需独立验证。
