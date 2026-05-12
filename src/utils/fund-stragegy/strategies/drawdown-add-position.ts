import { Action, Strategy, StrategyContext } from '../types'

/** 从历史快照序列计算截止某日（含）的单位净值最高点 */
function peakFundNav(strategy: any, asOfDate: string): number {
  let peak = 0
  for (const snap of strategy?.data || []) {
    if (snap.date > asOfDate) break
    const v = Number(snap.curFund?.val)
    if (!Number.isNaN(v) && v > peak) peak = v
  }
  return peak
}

/**
 * 从阶段高点回撤达阈值时分批买入。
 * 默认关闭：`formData.ddAddEnabled` 不为真则永不产出 Action（黄金基线不受影响）。
 */
export function createDrawdownAddPositionStrategy(): Strategy {
  return {
    id: 'drawdown-add-position',
    kind: 'add_position',
    evaluate(ctx: StrategyContext): Action[] {
      const { latestInvestment, formData, fundId, date } = ctx
      if (!latestInvestment) return []

      const fd = formData || {}
      if (!fd.ddAddEnabled || fd.ddAddThresholdPercent == null) return []

      const strategy = latestInvestment.fundStrategy as any
      const peak = peakFundNav(strategy, date)
      if (peak <= 0) return []

      const cur = Number(latestInvestment.curFund.val)
      const dd = (peak - cur) / peak
      const th = Number(fd.ddAddThresholdPercent) / 100
      if (!(dd >= th)) return []

      let buyAmount = 0
      const rule = fd.ddAddCashRule === 'fixed' ? 'fixed' : 'percentLeft'
      if (rule === 'fixed') {
        buyAmount = Math.round(Number(fd.ddAddBuyAmount || 0))
      } else {
        const pct = Number(fd.ddAddBuyPercent ?? 10)
        buyAmount = Math.round((latestInvestment.leftAmount * pct) / 100)
      }
      if (!(buyAmount > 0)) return []

      return [
        {
          type: 'BUY',
          fundId,
          date,
          amount: buyAmount,
          reason: `回撤补仓：从净值高点回撤 ${(dd * 100).toFixed(2)}% ≥ ${fd.ddAddThresholdPercent}%`,
          strategyId: 'drawdown-add-position',
          tags: ['add_position', 'drawdown'],
          priority: 15,
        },
      ]
    },
  }
}
