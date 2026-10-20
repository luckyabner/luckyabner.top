---
target: 我的项目前端界面还有没有可优化的地方
total_score: 20
max_score: 28
na_heuristics: 5,9,10
p0_count: 0
p1_count: 0
target_identity: "file:/Users/abner/Desktop/projects/luckyabner.top/src/pages/index.mdx"
target_fingerprint: "sha256:3eb263efee436422880ad575207ed193621117b08badf8336d8c37b434fd3cd2"
target_path: /Users/abner/Desktop/projects/luckyabner.top/src/pages/index.mdx
timestamp: 2026-10-19T14-14-21Z
slug: src-pages-index-mdx
---
本次审查：现有个人站前端（首页为主目标，关联博客列表、项目与中英文文章）。
依据：两个独立代理分别完成设计评估和确定性检测/浏览器证据；桌面1280×720；移动端、真实屏幕阅读器、性能指标未实测。没有修改业务代码。
整体：20/28（71%，良好），现有极简阅读方向成立。暖白底、签名字标、灰阶和细分隔线一致。个性主要由文章内容体现，首页尚未连接这些内容。
优点：统一内容宽度与阅读排版；清晰简单的导航和整行点击；已有 skip link、focus-visible、44px导航、reduced-motion、代码复制反馈。
启发式（0–4）：状态3，现实语言3，用户控制3，一致性3，错误预防n/a，识别3，效率2，美观3，错误恢复n/a，帮助n/a。无输入或危险操作，不强行给后3项评分。
优先问题：
1. [P2] 首页缺少具体内容入口。src/pages/index.mdx:9-18。建议介绍下增加1个代表项目和1篇代表文章的文字链接，保留留白；修正 Here are something about me / Like photography。建议 impeccable clarify。
2. [P2] 项目区分度不足。src/content/projects.ts:10-25。Hexagram和HexVerse描述相近，难判断应访问哪个。补真实使用场景、差异或项目状态，无需卡片墙。建议 impeccable clarify。
3. [P2] 长文定位与读完后衔接不足。src/layouts/BlogPost.astro:34-69，src/content/blog/foreign-movies-notes.md:11。增加按长度启用的折叠目录、文末返回或下一篇；统一正文h2/h3，当前部分正文使用h1或直接跳到h3。建议 impeccable polish/typeset。
4. [P2] 教程截图缺少有效说明。src/content/blog/better-manage-playlists-in-applemusic/en.md:12。剔除代码样例后，41张Markdown图片中24个空alt、17个image.png，涉及9文件；需逐张判断重要性，为关键截图说明操作/状态，把关键步骤写回正文。浏览器AX确认image.png。图片已有WebP、lazy、async及尺寸，无图片性能缺陷证据。建议 impeccable harden。
5. [P2] 中文文章丢失Blog当前栏目反馈。src/components/HeaderLink.astro:8-16。/zh/blog/路径首段zh导致匹配失败，样式与aria-current一起缺失。匹配前归一化语言前缀。建议 impeccable harden。
认知负担：整体低，14篇博客中技术、读书、感想混排使查找略费力，可增加轻量主题提示。无需为当前规模引入复杂筛选。
情绪旅程：首页安静友好，身份与作品间衔接弱；列表可预期；正文舒适但长文重访和结束路径较弱。
读者风险：首次访客看不出代表作品；屏幕阅读器读者缺少截图信息；跨语言读者丢失当前位置反馈。移动用户未实测。
小项：内链和外链都用右上箭头，可区分；文章分享摘要固定Thanks for your visit，可提供逐篇摘要；主题按钮可补当前状态语义。这些优先级低于上述5项。
检测：impeccable detect --json src => []，exit 0，0 findings；不是完整可访问性或性能认证。
后续偏好：先做首页/项目表达、长文阅读、细节修复中的哪类？范围选前三项或全部五项？
