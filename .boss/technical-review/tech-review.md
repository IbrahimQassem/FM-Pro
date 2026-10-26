---
type: tech-review
outputFor: [scrum-master, frontend, backend]
dependencies: [existing-source, architecture-contract, firebase-data-contract, security-privacy-contract]
---

# HudHud FM 技术代码评审报告

## 摘要

- **结论：评审完成，需要修改。** 确认 13 项问题：1 项 P1、12 项 P2；没有需要重写主架构的证据。
- **主要风险：** 公共电台文档混入内部资料；播放器隐藏计时器及完成后重播有可复现缺陷；客户端查询存在截断或无界加载。
- **发布阻塞：** 若内部电台字段已填充，R01 构成发布阻塞。未读取生产数据，不宣称已发生线上泄漏。
- **验证：** 现有检查合计 **368 passed、17 skipped**；另有 **3 个预期失败的临时复现**，证明两类播放器缺陷，不能计为通过。
- **边界：** 仅生成 `.boss/technical-review/` 产物，源代码未修改；这是独立 Boss Tech Lead 评审，不要求运行完整研发流水线，也不构成发布批准。

## 1. 评审概述

- **项目：** `hudhud_fm`，不包括相邻 `FM-Pro`。
- **日期：** 2026-10-25。
- **基线：** `9fae3248aadecaa53198a5fb9f06576fdcc182cf`；初始工作树干净。
- **流程：** 已安装 Boss 5.0.3 的独立 review/Tech Lead 流程、代码评审与技术规范方法，辅以 HudHud workspace-check。
- **范围：** Flutter/Riverpod 应用、React 管理与公共网站、Firebase Functions、Firestore/Storage Rules 及相关测试。
- **方法：** 实际代码、调用者、测试与契约交叉检查；对关键缺陷使用临时测试或合成输入复现。
- **技术栈：** packs 自动检测受根 `package.json` 影响给出 `api-only`；本次直接检查混合 Flutter/React/Firebase 项目，不依赖该分类缩小范围。
- **输入：** 采用现有契约，不虚构本任务专属 PRD、architecture.md 或 UI 设计文件。

评审依据：

- [架构契约](../../docs/contracts/architecture-contract.md)、[Firebase 数据契约](../../docs/contracts/firebase-data-contract.md)。
- [安全隐私契约](../../docs/contracts/security-privacy-contract.md)、[播放契约](../../docs/contracts/playback-contract.md)。
- [节目单集契约](../../docs/contracts/station-content-contract.md)、[内容自动化契约](../../docs/contracts/content-automation-contract.md)。
- [账号评论通知契约](../../docs/contracts/account-comments-notifications-contract.md)。

P1 表示应优先阻断的实质安全风险；P2 表示需修复的功能、数据一致性、隐私契约或规模化问题。代码路径的高置信度不等于已经观察到生产事故。

## 2. 评审结论

| 维度 | 结论 | 依据 |
|---|---|---|
| 架构合理性 | 保留主架构，修正边界 | Riverpod/repository/data source 可沿用；公共/内部数据缺乏隔离 |
| 技术选型 | 无须更换技术栈 | 基于当前依赖与 Node 22 检查，未作未验证的依赖漏洞声明 |
| 可扩展性 | 需要改进 | Flutter 任意截断、管理站 2,000 条上限、公共站全量归档、调度预算问题 |
| 可维护性 | 可局部修复 | 生命周期、派生计数与时区语义不一致 |
| 安全与隐私 | 存在 P1 和契约偏差 | 内部字段可公开读取，邮箱持久化违背明确约束 |
| 验证充分性 | 有定向证据，非完整验收 | 现有测试通过但漏掉关键分支；没有设备/部署验收 |

**总体评价：评审完成，代码需要修改；不得将现有测试通过解释为已修复。**

## 3. 技术风险评估

| ID | 等级 | 问题 | 影响 |
|---|---|---|---|
| R01 | P1 | 内部电台资料存于公共文档 | 未认证者读取已填充的联络和运营字段 |
| R02 | P2 | 睡眠计时器脱离可见状态 | 隐藏计时器停止后续播放 |
| R03 | P2 | 完成的单集不能正确重播 | 无声音，可能停留 loading |
| R04 | P2 | Flutter 筛选排序前截断单集 | 有效或最新内容不可见 |
| R05 | P2 | 验证邮件失败仍提示发送成功 | 用户等待未发送验证码 |
| R06 | P2 | 管理站分页止于 2,000 条 | 内容、搜索、总数和导出不完整 |
| R07 | P2 | 非超级管理员统计查询被拒绝 | 已提供的统计页面无法加载 |
| R08 | P2 | 公共站加载渲染完整归档 | 读取量、内存和 DOM 随归档增长 |
| R09 | P2 | RSS 未解码 XML 属性实体 | 参数化音频 URL 失效 |
| R10 | P2 | 邮箱重复写入 Firestore | 违反数据最小化契约 |
| R11 | P2 | 健康扫描无预算续跑 | 慢 Development 站点阻塞 Official |
| R12 | P2 | 评论创建不维护计数 | 单集评论数长期失真 |
| R13 | P2 | 节目通知忽略 schedule 时区 | 通知错时或错日 |

### R01 — P1：Separate private station metadata from public documents

- **位置：** [firestore.rules:247](../../firestore.rules:247)、[admin-content.js:7](../../functions/lib/admin-content.js:7)、[editorial-audit.js:109](../../functions/lib/editorial-audit.js:109)。
- **触发：** 管理员保存含 `contactEmail`、`contactPhone`、`contactPerson`、`owner`、地址或技术资料的电台。
- **影响：** `allow read: if isKnownRoot(root)` 不要求认证；游客读完整文档即可获取这些字段，Flutter 忽略字段不能保护它们。
- **证据/置信度：** 高；字段白名单、同一文档写入与 Rules 连通。[数据契约:104](../../docs/contracts/firebase-data-contract.md:104) 明确这些字段仅用于内部管理/Super User。现有 Rules 测试不是该字段泄漏的专属复现。
- **建议：** 将受限字段移到独立私有文档，公共文档保留 allowlist projection；检查管理编辑/导出并计划已有数据迁移。
- **验收：** 两个 root 的游客和未授权角色无法读取私有文档，公共播放资料仍可访问，授权管理与导出正常。
- **发布判断：** 字段已填充时阻塞发布；生产字段是否实际填充未检查，不能推断泄漏数量。

### R02 — P2：Synchronize sleep-timer state and lifecycle

- **位置：** [station_player_controller.dart:125](../../lib/features/player/presentation/controllers/station_player_controller.dart:125)、[同文件:315](../../lib/features/player/presentation/controllers/station_player_controller.dart:315)。
- **触发：** 设置计时器后切换单集；或系统通知停止后再次开始播放。
- **影响：** 状态重建清除 `sleepTimerEnd`，但 `_sleepTimer` 仍运行；UI 没有计时器提示时，旧回调仍停止新会话。
- **证据/置信度：** 高；两个临时 controller 测试分别复现这两个分支并失败。
- **建议：** 明确定义切换时保留或取消计时器并同步截止时间；远程停止与本地停止使用一致的清理语义。
- **验收：** 两个复现变绿；保留时截止时间可见，取消后旧会话回调不影响新会话。

### R03 — P2：Seek completed episodes before replay

- **位置：** [station_player_controller.dart:196](../../lib/features/player/presentation/controllers/station_player_controller.dart:196)、[同文件:351](../../lib/features/player/presentation/controllers/station_player_controller.dart:351)、[just_audio_player_data_source.dart:277](../../lib/features/player/data/datasources/just_audio_player_data_source.dart:277)。
- **触发：** 单集播放完成后再次点击播放。
- **影响：** `completed` 映射为 `paused`，resume 仅调用 `play()`，没有归零 seek；controller 先进入 loading，随后可能没有新 phase 将其解除。
- **证据/置信度：** 高；临时测试证明既未 seek 也未 reload；本地锁定 `just_audio 0.10.6` 源码及 README 支持完成后需 seek 的结论。未做真实设备音频测试。
- **建议：** 保留完成语义；重播执行绑定 episode/generation 的归零 seek，处理失败和过期会话。
- **验收：** 重播从头开始，异步 seek 不操作新单集，不能永久停留 loading。

### R04 — P2：Filter and order episodes before limiting

- **位置：** [station_content_firestore_data_source.dart:23](../../lib/features/station_content/data/datasources/station_content_firestore_data_source.dart:23)、[firebase_station_content_repository.dart:57](../../lib/features/station_content/data/repositories/firebase_station_content_repository.dart:57)、[同文件:66](../../lib/features/station_content/data/repositories/firebase_station_content_repository.dart:66)。
- **触发：** 电台超过 100 个单集文档，第一批含草稿或旧内容。
- **影响：** 查询只有 `stationId` 与默认 `limit(100)`，随后才在客户端筛发布状态、排日期；遗漏的有效/最新单集无法恢复，也没有下一页入口。
- **证据/置信度：** 高，静态调用链确定；未执行 101+ 文档 emulator 复现。契约推迟分页不意味着任意截断正确。
- **建议：** 定义已发布查询和稳定服务端排序，增加有界分页或目标单集读取，同步检查索引与通知深链。
- **验收：** 101+ 草稿/发布混合数据中最新内容可见，翻页无重漏，深链不受第一批限制。

### R05 — P2：Report verification delivery failure accurately

- **位置：** [account_auth_data_source.dart:192](../../lib/features/account/data/datasources/account_auth_data_source.dart:192)、[account_controller.dart:79](../../lib/features/account/presentation/controllers/account_controller.dart:79)。
- **触发：** 账号注册成功，但验证码 callable 因限流或邮件服务问题失败。
- **影响：** data source 吞掉投递异常后正常返回，controller 无条件设置 `verificationCodeSent: true`，UI 提示验证码已发送。
- **证据/置信度：** 高；实际错误处理和状态写入直接连通，现有 controller 测试未覆盖此组合结果。
- **建议：** 保留账号创建成功，单独返回投递结果；仅确认发送成功时显示成功，否则提供可重试状态。
- **验收：** 账号成功/投递失败分支不显示“已发送”，重试成功才显示，且不重复创建账号。

### R06 — P2：Admin pagination stops at 2,000 records

- **位置：** [admin-app.tsx:1088](../../web_admin/components/admin/admin-app.tsx:1088)、[同文件:1777](../../web_admin/components/admin/admin-app.tsx:1777)、[同文件:1852](../../web_admin/components/admin/admin-app.tsx:1852)。
- **触发：** 单集、用户、评论或其他资源超过 2,000 条匹配记录。
- **影响：** 只有 reports 使用服务端 cursor；其他资源固定取 2,000 条再本地分页，把数组长度称为总数。后续内容无法正常访问，本地搜索与导出也不完整。
- **证据/置信度：** 高；查询、本地切片与 Next 禁用逻辑连通；未执行 2,001 条 emulator 数据集。
- **建议：** 使用稳定服务端 cursor 分页与准确统计；若部分加载，明确标示范围并提供完整访问路径。
- **验收：** 第 2,001 条可访问和搜索，分页无重漏，总数与导出范围准确。

### R07 — P2：Scoped administrators cannot load user statistics

- **位置：** [admin-app.tsx:887](../../web_admin/components/admin/admin-app.tsx:887)、[users-aggregate-view.tsx:34](../../web_admin/components/admin/users-aggregate-view.tsx:34)、[firestore.rules:284](../../firestore.rules:284)。
- **触发：** station admin/moderator 打开已提供的 Users 导航。
- **影响：** 代码将非 super-admin 路由至聚合视图，却对 users 集合执行无范围 count；Rules 的 list 只允许 super-admin。页面进入错误态，重试仍失败。
- **证据/置信度：** 高；路由、查询和权限规则共同确定拒绝路径；未做浏览器角色会话复现。
- **建议：** 提供经过授权的 aggregate-only 服务端接口或安全维护的汇总值，不放宽整个 users 集合的读取权限。
- **验收：** scoped admin 能读取被允许的统计，仍不能列出个人资料；超级管理员完整管理不受影响。

### R08 — P2：Public station pages load the full archive

- **位置：** [content-repository.ts:9](../../web_hudhud/lib/content-repository.ts:9)、[同文件:17](../../web_hudhud/lib/content-repository.ts:17)、[discovery.ts:41](../../web_hudhud/lib/discovery.ts:41)、[station-detail.tsx:44](../../web_hudhud/station-detail.tsx:44)。
- **触发：** 电台节目和单集归档持续增长。
- **影响：** 查询没有 limit/cursor；映射逐单集扫描节目，渲染逐节目扫描全部单集并创建所有行，分钟计时器重渲染该树。读取量、内存、DOM 和部分 O(P×E) 工作随归档增长。
- **证据/置信度：** 高，增长路径由代码确定；未测量生产延迟、内存或计费，不能声称具体节省比例。
- **建议：** 有界单集页、深链目标单独获取、按 program ID 一次分组；根据实际规模验证边界。
- **验收：** 大归档首屏读取和 DOM 有上限，翻页/深链可用，分钟更新不重复遍历完整历史归档。

### R09 — P2：Decode XML entities in RSS enclosure URLs

- **位置：** [rss-ingestion.js:69](../../functions/lib/rss-ingestion.js:69)、[同文件:196](../../functions/lib/rss-ingestion.js:196)。
- **触发：** 合法 enclosure URL 含 `?part=1&amp;sig=abc` 等 XML 转义查询分隔符。
- **影响：** parser 原样保存属性，参数名成为 `amp;sig` 而非 `sig`；签名或参数依赖音频失效，文本实体也未完整解码。
- **证据/置信度：** 高；真实 `parseRssFeed` 的合成断言确认参数损坏，无网络访问。
- **建议：** 在 URL 校验和 identity 计算前正确解码 XML 属性/文本，覆盖数值实体，保留安全校验。
- **验收：** XML 实体解码后 URL 参数与原始语义一致；重复导入保持幂等。

### R10 — P2：Resolve listener-email persistence against the privacy contract

- **位置：** [index.js:559](../../functions/index.js:559)、[station-subscriptions.js:49](../../functions/lib/station-subscriptions.js:49)、[user-management.js:52](../../functions/lib/user-management.js:52)。
- **触发：** 创建/修复 profile、订阅电台、注册提醒或相关用户管理操作。
- **影响：** Auth email 被写入或补入 Firestore，违反[安全契约:41](../../docs/contracts/security-privacy-contract.md:41) 的“仅从 Auth 在账号页显示，不写 Firestore”约束，扩大个人数据存储面。
- **证据/置信度：** 高；源码及合成 mock transaction 均确认写入；没有声称 listener profile 对游客公开。
- **建议：** 明确裁决契约偏差；若保留最小化原则，以 Auth 为邮箱来源，检查管理使用者后计划旧字段清理。不能静默修改契约掩盖偏差。
- **验收：** 所有 profile/订阅路径符合选定策略，旧数据处理和管理员必要功能具有明确验收记录。

### R11 — P2：Bound stream-health work and preserve progress

- **位置：** [stream-health.js:180](../../functions/lib/stream-health.js:180)、[同文件:198](../../functions/lib/stream-health.js:198)、[index.js:787](../../functions/index.js:787)。
- **触发：** 慢或不可达的电台较多，每台主/备用源分别可能耗尽 8 秒。
- **影响：** 300 秒函数先全量顺序扫描 Development 再 Official；19 台双源超时已需 304 秒，未计数据库开销。无 cursor，后续运行从头重复，Official 可持续得不到检查。
- **证据/置信度：** 高，明确 timeout 与循环顺序的预算分析；未宣称发生生产超时。
- **建议：** 有界批次与持久进度，确保 root 独立或公平获得预算；保留出站并发限制。
- **验收：** 注入大量超时 probe 后所有 root/电台最终完成检查，崩溃恢复不会无限重做同一前缀。

### R12 — P2：Maintain comment counts across lifecycle changes

- **位置：** [comment-moderation.js:170](../../functions/lib/comment-moderation.js:170)、[admin-report-review.js:58](../../functions/lib/admin-report-review.js:58)、[index.js:644](../../functions/index.js:644)。
- **触发：** 新单集收到发布评论，或自动 moderation 改变已计数评论的可见状态。
- **影响：** 创建 trigger 只更新 comment，不增加 episode `stats.commentsCount`；现有路径只有管理 review 减计数和账号删除时重算。Flutter 在 [program_details_screen.dart:329](../../lib/features/station_content/presentation/program_details_screen.dart:329) 显示失真数字。
- **证据/置信度：** 高；完整计数写入搜索和 trigger 调用链未找到创建增量维护；未执行专属端到端计数测试。
- **建议：** 幂等服务端 lifecycle 维护 published 数量，覆盖重投递、人工/自动 moderation 与删除，保留核对修复能力。
- **验收：** 创建、拒绝、隐藏、删除、重复事件及并发后，计数等于实际 published 评论数。

### R13 — P2：Use each schedule's UTC offset for program alerts

- **位置：** [program-notifications.js:45](../../functions/lib/program-notifications.js:45)、[同文件:115](../../functions/lib/program-notifications.js:115)、[admin-content.js:148](../../functions/lib/admin-content.js:148)。
- **触发：** 合法节目 `schedule.utcOffsetMinutes != 180`；validator 接受 −720 至 840，[契约:37](../../docs/contracts/station-content-contract.md:37) 将偏移作为显式数据。
- **影响：** notifier 用固定 Yemen 时间比较所有节目。UTC 周一 10:00 节目在 07:00Z 被判定可通知，实际 10:00Z 却不满足条件；跨日时星期与去重日期也可能偏离。
- **证据/置信度：** 高；真实 `shouldNotifyProgram/getYemenTimeInfo` 纯函数断言复现 2026-10-26 两时刻的错误，无实际 FCM 发送。
- **建议：** 按每个 schedule 偏移计算本地日期、星期和分钟，统一 delivery identity/去重日期；或通过明确契约决策拒绝不支持的偏移。
- **验收：** UTC、UTC+3、负偏移和跨日正确，同一节目本地日期只生成一个正确通知意图。

## 4. 技术可行性分析

### 4.1 核心功能可行性

| 功能 | 结论 | 修复边界 |
|---|---|---|
| 公共/管理电台资料 | 可修复，需跨层验证 | 私有隔离、编辑导出、已有字段迁移 |
| 播放生命周期 | 可沿用现有分层 | completed、timer ownership、generation |
| 内容查询 | 可修复，需统一语义 | 稳定分页、深链和索引 |
| 导入/通知/评论 | 可局部修复 | XML、时区、幂等计数、调度批次 |

### 4.2 技术难点

- 私有字段迁移须兼容管理员查询/导出及旧数据，仅隐藏 UI 无效。
- 翻页须明确过滤、排序、索引与 cursor 稳定性，提高 limit 不能解决完整性。
- 计数和通知必须考虑重复事件与并发，不能直接增加无幂等保护的计数器。
- 数据规模和设备验收未确认，本次不提供虚构实施工时。

## 5. 架构改进建议

### 5.1 必须修改（阻塞项）

- [ ] R01：含内部字段的环境先完成私有隔离、已有数据复核及权限验证，再发布。

### 5.2 建议优化（P2 修复）

- [ ] R02–R05：播放器生命周期与邮件结果，保持既有 Riverpod/领域接口。
- [ ] R06–R08：统一查询完整性和加载预算，不以任意截断或全量读取替代分页。
- [ ] R09–R13：导入、隐私契约、扫描预算、计数与时区语义。
- 原始错误日志和重复 account watcher 仅列为后续检查方向；未证实凭据泄漏或量化读取放大，不另计确认问题。

## 6. 实施建议

### 6.1 开发顺序建议

1. 确认 R01 已存字段范围与隔离方案，先建立权限测试再计划迁移。
2. 将三个临时播放器复现转为正式回归并修复 R02/R03；修正 R05 结果表达。
3. 按客户端拆分 R04/R06–R08，先确定查询、索引与深链契约。
4. 分别修复 R09–R13，以合成数据、mock 发送器或 demo emulator 验收。

### 6.2 里程碑建议与实际验证

| 里程碑 | 交付证据 | 状态 |
|---|---|---|
| M1 安全边界 | 字段隔离、游客拒绝、迁移复核 | 未实施 |
| M2 用户可见正确性 | 播放、邮件、分页、角色统计回归 | 已定位，未修复 |
| M3 后台一致性 | RSS、计数、时区、超时批次测试 | 已定位，未修复 |

| 检查 | 实际结果 | 限制 |
|---|---|---|
| Functions `npm run lint` / `npm test` | 152 passed，20 suites，0 failed/skip；lint 通过 | Node 22.23.3；`/tmp/boss-backend-node22-tests.log` |
| 公共网站 test/lint/typecheck | 53 passed；lint/typecheck 通过 | Node 22.23.3；无浏览器实测 |
| 管理网站 test/lint | 76 passed、17 skipped、0 failed；lint 通过 | 跳过项依赖 emulator，不计为通过 |
| Flutter 定向测试 | 54 passed | player、account、subscriptions、home controller |
| 根 `npm run emulators:test` | 33 passed，5 suites，0 failed/skip | 仅 demo 项目；`/tmp/boss-rules-tests.log` |
| 现有测试合计 | **368 passed、17 skipped** | 不是完整项目验收 |
| 临时 Flutter 缺陷复现 | **3 expected failures** | 证明 R02 两分支与 R03，不是修复验收 |
| 治理检查/Git diff 检查 | 通过 | 仅 `.boss/` 新产物，无源代码修改 |
| RSS、邮箱、时区合成检查 | 相应缺陷复现成功 | 无真实邮件、推送、生产数据访问 |

Flutter 实际命令：

```sh
flutter test --no-pub test/features/player test/features/account/presentation/account_controller_test.dart test/features/subscriptions/station_subscriptions_controller_test.dart test/features/home/presentation/home_controller_test.dart
flutter test --no-pub /tmp/hudhud-boss-playback-review_test.dart --plain-name 'review:'
```

环境说明：默认 Node 26.6.0 不符合 Functions Node 22 目标，公共网站测试还因已移除参数失败；使用已安装 Node 22.23.3 重跑后，上表以支持环境结果为准。Rules emulator 初次因 sandbox 禁止 localhost 绑定而失败，获准升级后通过；Flutter SDK cache 写入也使用允许的测试升级路径。这些环境失败未列为产品缺陷。

未执行完整 Flutter 套件、全量 analyzer、平台/web 构建、真实设备/浏览器音频验收、部署或线上探测。未发送真实邮件/FCM，未检查生产数据库。独立评审不要求补齐 PRD/tasks 或运行完整 Boss pipeline；本报告不将缺少那些产物作为 gate 失败。

### 6.3 技术债务预警

| 债务 | 成因 | 处理时机 |
|---|---|---|
| 公共/私有模型混合 | station 文档同时承担展示与管理 | 填充内部字段前，已有数据立即评估 |
| 查询契约分散 | 客户端分别截断或全量加载 | 分页修复及数据增长前 |
| 生命周期语义丢失 | completed/paused 合并、timer/state 分离 | 播放器下次发布前 |
| 派生计数与日期 | 事件维护不完整、固定全局时区 | 对应后台修复时 |

## 7. 代码规范建议

### 7.1 目录结构规范

保持 `presentation -> domain <- data`、`app/providers.dart` 组装职责、`functions/lib` 和两个 web 工程的现有结构。只在所有者明确的边界增加必要逻辑，不建立平行实现或新状态管理框架。

### 7.2 命名规范

遵循项目 Dart/JavaScript/TypeScript 约定，不把个人命名偏好列为缺陷。`completed`、`sent`、`count` 与 pagination total 等名称应对应真实可观察语义。

### 7.3 代码风格

- 服务端授权与字段隔离优先于 UI 隐藏，保留默认拒绝策略。
- 异步资源和可见状态同生命周期，generation/ownership 检查覆盖切换场景。
- 回归测试验证业务结果、权限与竞态，不仅镜像实现。

## 8. 评审结论

- **评审状态：** 完成，`DONE_WITH_CONCERNS`；应用发布未获批准。
- **确认问题：** 13 项：P1 1 项、P2 12 项。
- **发布阻塞：** R01，在内部字段已填充时成立；生产数据状态未知。
- **产物：** `.boss/technical-review/tech-review.md`；源代码未修改。
- **下一步：** 按 R01–R13 实施最小修复，满足对应验收后再评审；现有通过测试不抵消已复现缺陷。
- **Runtime：** 协调者负责正式产物记录与 review 状态登记，不执行完整研发/部署流程。
