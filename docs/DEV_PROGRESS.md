# 开发进度记录（DEV_PROGRESS）

> 约定：本文件是本仓库开发过程的**唯一进度日志**。  
> 每次开始/完成一个可验证的小步（例如：新增一个核心类型、迁移一段策略逻辑、完成一次一致性对比、修复一个关键 bug），都需要追加一条记录。

## 2026-04-28

### 22:23 初始化

- **动作**：创建 `docs/DEV_PROGRESS.md` 作为进度日志入口
- **来源**：`docs/DEV_PLAN.md`（v1.0，2026-04-28）
- **下一步**：
  - 为 Sprint 1~4 创建执行子 Agent，梳理改动面与任务拆分
  - 以 Sprint 1 为先：抽离 `src/pages/index.tsx` 的交易 if 逻辑到策略模块，建立 `Action/Transaction` 结构并保持回测结果一致

### 22:25 启动执行子 Agent（并行）

- **动作**：按 Sprint 1~4 分别启动并行子 Agent，输出各自的改动清单/迁移步骤/验收对比/风险点
- **监控方式**：
  - 子 Agent 输出完成后，将其结论摘要写入本文件，并据此更新仓库内的实现任务拆分与验收清单
- **已定位关键落点（Sprint 1）**：
  - 页面交易逻辑：`src/pages/index.tsx` 内 `InvestmentStrategy` 构造参数 `onEachDay`
  - 回测核心：`src/utils/fund-stragegy/index.ts`（`InvestmentStrategy` / `InvestDateSnapshot`）

### 22:26 Sprint 1 方案梳理完成（子 Agent）

- **动作**：完成 Sprint 1 改动面与迁移步骤梳理，明确“策略产信号 / 执行改仓位”边界，并锁定一致性验收要点
- **下一步**：
  - 在 `src/utils/fund-stragegy/` 下新增 `types.ts`、`strategies/`、`actions/`、`engine/` 的最小实现骨架
  - 将 `src/pages/index.tsx` 的 `onEachDay` 迁移为调用策略模块并记录交易原因（`reason/strategyId/tags`）

### 22:29 Sprint 1 骨架落地（最小可用）

- **新增**：
  - `src/utils/fund-stragegy/types.ts`（`Action`/`Transaction`/`Strategy`/`StrategyContext`）
  - `src/utils/fund-stragegy/strategies/*`（止盈 + MACD 补仓）
  - `src/utils/fund-stragegy/actions/execute-actions.ts`（先卖后买执行 + 生成 `Transaction`）
  - `src/utils/fund-stragegy/engine/run-daily-strategies.ts`（每日策略评估与执行入口）
- **修改**：
  - `src/pages/index.tsx`：移除页面内两段交易 if，改为 `runDailyStrategies(...)`
  - `src/utils/fund-stragegy/index.ts`：为 `InvestmentStrategy` 增加 `transactions` 承载交易流水
- **一致性关键约束**：
  - 保持“同日先 SELL 后 BUY”与卖出金额 `toFixed(2)` 的舍入口径
  - 买入/卖出手续费与份额换算与现有 `fulfillBuyTxn/fulfillSellTxn` 对齐

### 22:31 测试运行记录

- **动作**：尝试运行现有 `npm test`
- **结果**：失败（Jest 运行时对 `antd/es/*` 的 ESM `import` 报错：`Cannot use import statement outside a module`）
- **说明**：该失败与 Sprint 1 改动无直接关联（属于测试环境/转译配置问题），后续如需 CI 可用，需要单独修复 Jest 转译配置或改用 `antd/lib`/增加 transform 白名单

### 22:32 Sprint 2/3/4 方案梳理完成（子 Agent）

- **动作**：完成 Sprint 2（通用策略体系）、Sprint 3（Portfolio 组合回测）、Sprint 4（Web 体验优化）的改动面梳理与落点建议
- **下一步（按优先级）**：
  - 继续推进 Sprint 1：补齐“重构前后曲线一致”的对比方法与最小验收用例（并将对比结果记录到本文件）
  - Sprint 2：在现有 `Strategy` 体系上扩展“投资/补仓/止盈”策略接口与组合/互斥/冲突解释机制
  - Sprint 3：新增 `portfolio/` 域模型与组合引擎 + 配置与页面路由
  - Sprint 4：补齐加载态/错误态与复盘流水视图，并升级保存结构为方案（Plan）

### 22:41 Sprint 1：`Transaction` 与真实成交对齐 + 兼容性修复（ts-node）

- **动机**：避免流水字段与 `InvestDateSnapshot`（真实成交链路）产生舍入口径漂移，进而影响复盘与 Sprint 4 的表格/图表标注
- **改动**：
  - `execute-actions.ts`：在执行 `InvestmentStrategy.buy/sell` 后，基于快照 **份额增量** 与 **`dateBuyAmount/dateSellAmount`** 反推成交价/手续费/份额，尽量与底层一致
  - 移除仓库内 `import type`：`ts-node`/旧 TS 会直接解析失败；同时避免 `fund-stragegy/index.ts ⇄ actions` 运行时循环依赖，执行层不显式导入 `InvestmentStrategy`
- **离线冒烟**：
  - 新增 `tools/sprint1-static-backtest.smoke.ts`：读取静态 `基金净值 + 上证指数` 跑最小回测（Node 需 shim `window/document`，因为 `@/utils/common` 会向 `window` 挂 JSONP 工具）
  - **本次跑出示例输出**：快照点数 **1488**；默认表单参数在该区间未触发止盈/补仓，因此 **`transactions`=0（符合预期可作为基线冒烟）**

### 22:51 Sprint 1：黄金一致性脚本 + 同日「先卖后买」上下文修复

- **根因**：单日内若同时止盈 + MACD 补仓，旧页面顺序为 `sell` → `buy`，补仓金额依赖**卖出后的** `leftAmount`；原先的 `run-daily-strategies` 在同一 `StrategyContext` 上并行评估两套策略，MACD 补仓仍拿**卖出前**现金，累计状态会与旧逻辑分叉
- **修复**：`run-daily-strategies.ts` 改为两阶段：先执行止盈（SELL）并落地成交，再以更新后的 `latestInvestment` 作为上下文评估补仓（BUY）
- **验收**：新增 `tools/sprint1-golden-compare.ts` + `tools/node-fund-polyfill.cjs`；在项目根目录执行 **`npm run sprint1:golden`**，对比 **legacy（页面 if）** vs **modern（引擎）**：结果 **`ok: true`**，逐日快照在容差内一致

### 对话小结（归档）

- **目标**：按 `DEV_PLAN.md` 分期推进；所有进展写入本文件并可验收。
- **已完成（Sprint 1）**：
  - 页面交易逻辑从 `index.tsx` 迁入策略模块：`Action`/`Transaction`、`strategies`、`execute-actions`、`run-daily-strategies`。
  - 记录 `InvestmentStrategy.transactions`；离线工具：`npm run sprint1:golden`、`tools/sprint1-static-backtest.smoke.ts`，`tools/node-fund-polyfill.cjs`。
  - **关键正确性**：单日内必须与旧逻辑一致——**先卖后买**；补仓评估必须在**止盈成交后**刷新 `latestInvestment`。
- **已知限制**：根目录 `npm test` 仍因 Jest/antd ESM 转译报错（需在后续单独修）。
- **当前优先级**：转入 **Sprint 2**（通用策略体系与组合/冲突可解释）、随后 Sprint 3 组合引擎与 Sprint 4 交互与方案保存升级。

### 执行 Agent（新一轮，继续推进）

- **Agent-S2**：在现有 `Strategy`/`run-daily-strategies`/`execute-actions` 上，列出 Sprint 2 的 **文件级 backlog**（投资/补仓/止盈多策略、优先级、互斥、冲突报表 `ConflictReport`、与表单字段映射）；给出 **最先可合并的最小 PR 切片顺序**。
- **Agent-S3**：输出 Sprint 3 的 **`portfolio/` 最小落地包**（类型文件、引擎主循环伪代码、`calcMACD`/`txnByMacd` 与多日对齐的注意点、`/.umirc.ts` 路由增补项）。
- **Agent-S4**：输出 Sprint 4 的 **页面改造清单**（`index.tsx`/`compare.tsx` loading+error、`TransactionTable` 数据源接 `transactions`）、`saved-fund-form` → `saved-plans:v1` **兼容迁移步骤**。
- **派发状态**：已为 **Agent-S2 / Agent-S3 / Agent-S4** 启动并行执行子 Agent（聚焦下一批可落地的实现 backlog）；本轮输出入库后将以摘要形式追加到本文件的下一条记录。

### Agent-S4 输出已归档（进度状态）

- **状态**：✅ Sprint 4 **最小可实现路径（文件级 checklist）**已由子 Agent 产出（覆盖 `loading/error` state 建模、`transactions`→复盘组件、`saved-plans:v1` 兼容与 compare 表单刷新注意点）。
- **约定**：**不在本文件复述长清单**，进入 Sprint 4 迭代时以此为实施顺序逐项改代码并联调验收。

### Agent-S2 输出已归档（进度状态）

- **状态**：✅ Sprint 2 **实现 backlog（按可合并小 PR 拆分）**与 **`npm run sprint1:golden`** 扩展约束、多日多 SELL/BUY 相位与排序原则已由子 Agent 产出。
- **约定**：同上，**不在本文件复述长清单**；落地时以 PR 切片顺序改代码，并保持黄金对比回归。

### Agent-S3 输出已归档（进度状态）

- **状态**：✅ Sprint 3 **Portfolio 目录/引擎/页面/路由**的结构化落点、组合主循环步骤、性能风险与缓解已由子 Agent 产出（只读设计整理；实际加文件与路由需在后续实现迭代中完成）。
- **约定**：同上，**不在本文件复述长清单**。

### Agent 汇总与下一步

- **状态**：**Agent-S2 / Agent-S3 / Agent-S4** 产出均已接收并以上述方式入库（仅状态锚点）。
- **下一步**：在实现阶段按 Sprint 优先级执行（当前仓库仍以 **Sprint 2** 为主干扩展，其次 **Sprint 3** 组合、**Sprint 4** 体验）；每项落地后在本文件追加「可验证的小步」记录。

### Sprint 2 实施：`PR-A`/`PR-B`/`PR-C`（本轮已落地）

- **动作**：`types.ts` 增加 `StrategyKind`、`ConflictEntry`、`DayStrategyConflicts`、`Action.mutexGroup`，`Strategy` 增加可选 `kind`/`enabled`；新增 `resolve-phase-actions.ts`；`run-daily-strategies.ts` 接入 `createDefaultSingleFundStrategies`、两相位 + `resolvePhaseActions`，可选返回 `conflicts`；`take-profit`/`macd-add-position` 标注 `kind`；`strategies/index.ts` 增加 `createDefaultSingleFundStrategies`。
- **回归**：`npm run sprint1:golden` → **通过**（`ok: true`，与黄金基线一致）。
- **下一步**：按 backlog 推进新策略（分批止盈、回撤止盈、回撤/目标仓位补仓）、表单字段与 `ConflictReport` 复盘展示（可独立 PR）。

### Sprint 2：`drawdown-add-position`（回撤补仓，默认关）

- **动作**：新增 `strategies/drawdown-add-position.ts`（净值阶段高点回撤达阈值触发 BUY，`priority` 15）；注册进 `createDefaultStrategies()`；`FundFormObj` 与 `buy-stragegy-form.tsx` 增加可选字段与「回撤补仓」区块（开关默认关）。
- **回归**：`npm run sprint1:golden` → **通过**（未勾选开关时语义与 Sprint 1 基线一致）。

### Sprint 2：分批止盈 / 回撤止盈 / 目标仓位补仓（默认关）

- **动作**：
  - 新增 `strategies/batch-take-profit.ts`（仅按持有收益率阈值触发卖出，`mutexGroup: sprint2-tp-extra`，`priority` 11）
  - 新增 `strategies/drawdown-take-profit.ts`（自 `maxAccumulatedProfit` 峰值相对回撤达阈值卖出，同组互斥，`priority` 8）
  - 新增 `strategies/target-position-add.ts`（基金市值/总资产低于目标占比时买入，`priority` 13）
  - `strategies/index.ts` 注册上述策略；`FundFormObj` + `stop-profit-form.tsx` / `buy-stragegy-form.tsx` 增加对应可选字段与表单项（开关均默认关）
- **回归**：`npm run sprint1:golden` → **通过**（`ok: true`）
- **下一步**：`ConflictReport` / 流水 UI 接 `conflicts`（Sprint 4 可并行）；或进入 Sprint 3 `portfolio/` 最小包

### 冲突复盘 UI

- **动作**：`createInvestStrategy` 中收集 `runDailyStrategies(...).conflicts`，写入页面 state；新增 `strategy-conflicts-table.tsx`，在图表下方展示「相位 / 策略 / 互斥说明 / 原计划 / 动作」；无拦截时提示空态。
- **回归**：逻辑与引擎一致，未改 `run-daily-strategies`；`npm run sprint1:golden` 建议仍 **通过**（页面行为不影响脚本）。

### Sprint 3：`portfolio/` 等权组合 v1

- **动作**：
  - 抽取 `backtest/run-single-from-form.ts`（`legScale` 支持与单基金等价默认 1），首页单基金回测改用该函数。
  - 新增 `portfolio/aggregate-equal-weight.ts`、`portfolio/run-equal-weight-portfolio.ts`：`N` 条腿 `1/N` 缩放初始本金、工资、定投；合并 `PortfolioSnapshotRow` / `PortfolioPositionSnapshotRow`；拼接各腿 `transactions`（供后续流水表）。
  - `types.ts` 增补组合快照类型；`SearchForm` 支持 `variant="portfolio"` + `portfolioFundCodes`，并导出 `PortfolioSearchForm`（独立表单 name）。
  - 新页 `#/portfolio`：拉取多基金净值、组合总资产曲线、期末持仓占比表、冲突复盘；顶部布局增加「组合回测」入口。
- **口径说明**：本版为 **等权分拆子账户** + 资产加总，尚未实现「单笔现金池撮合」级统一记账（见 DEV_PLAN Sprint 3 深化项）。
- **回归**：`npm run sprint1:golden` → **通过**（`ok: true`）。
