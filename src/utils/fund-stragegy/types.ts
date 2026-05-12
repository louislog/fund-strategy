export type ActionSide = 'BUY' | 'SELL'

/** 三大类策略分类（对齐 DEV_PLAN，供引擎分相位与未来 UI 分组） */
export type StrategyKind = 'invest' | 'add_position' | 'take_profit'

export interface Action {
  type: ActionSide
  fundId: string
  date: string
  amount?: number
  portion?: number
  reason: string
  strategyId: string
  tags?: string[]
  /**
   * 用于排序同日动作：数值越小越先执行
   * - 约定：SELL < BUY（保持与旧 onEachDay 一致：先卖后买）
   */
  priority?: number
  /**
   * 同自然日同一 mutexGroup（且与 fundId/date 同属一批执行）内最多放行一条，
   * 详见 `resolve-phase-actions.ts`。
   */
  mutexGroup?: string
}

export interface Transaction {
  date: string
  fundId: string
  side: ActionSide
  price: number
  portion: number
  /**
   * grossAmount：下单时输入金额（卖出时是“按金额卖出”的 gross）
   * netAmount：实际现金变化（买入为负，卖出为正，且已计费率）
   */
  grossAmount: number
  netAmount: number
  fee: number
  cashDelta: number
  strategyId: string
  reason: string
  tags?: string[]
}

export interface ConflictEntry {
  phaseHint: string
  action: Action
  reason: string
}

export interface StrategyContext {
  fundId: string
  date: string
  /**
   * 注意：这里不强约束类型，Sprint 1 先以最小侵入方式落地，
   * 由策略实现自行读取所需字段（latestInvestment / 指数数据 / 表单参数等）
   */
  latestInvestment: any
  curSzIndex: any
  curReferIndex: any
  formData: any
}

export interface Strategy {
  id: string
  kind?: StrategyKind
  /** 预留：禁用策略时跳过 evaluate */
  enabled?: boolean
  evaluate: (ctx: StrategyContext) => Action[]
}

/** runDailyStrategies 单日汇总（不参与净值计算） */
export interface DayStrategyConflicts {
  sell?: { rejected: ConflictEntry[] }
  buy?: { rejected: ConflictEntry[] }
}

/** 一页收集的「有互斥」的自然日记录（供复盘 UI） */
export interface StrategyConflictDayRecord {
  date: string
  conflicts: DayStrategyConflicts
}

/** Sprint 3：组合层日快照（总资产 = 各分腿之和，等权拆分口径） */
export interface PortfolioSnapshotRow {
  date: string
  /** 各腿 totalAmount 之和（现金+持仓） */
  total: number
  cash: number
  positionsValue: number
}

/** Sprint 3：分基金市值占比（relative to 组合 total） */
export interface PortfolioPositionSnapshotRow {
  date: string
  fundId: string
  fundValue: number
  weight: number
}

