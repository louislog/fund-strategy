import { roundToFix } from '@/utils/common'
import { Action, Strategy, StrategyContext } from '../types'

/**
 * 目标仓位补仓：基金市值/总资产低于目标比例时买入，直至接近目标（受现金与单次下单规则限制）。
 * 默认关闭。
 */
export function createTargetPositionAddStrategy(): Strategy {
  return {
    id: 'target-position-add',
    kind: 'add_position',
    evaluate(ctx: StrategyContext): Action[] {
      const { latestInvestment, formData, fundId, date } = ctx
      if (!latestInvestment) return []

      const fd = formData || {}
      if (!fd.tpAddEnabled || fd.tpAddTargetPercent == null) return []

      const total = latestInvestment.totalAmount
      if (!(total > 0)) return []

      const level = roundToFix(latestInvestment.fundAmount / total, 4)
      const target = Number(fd.tpAddTargetPercent) / 100
      if (!(level < target)) return []

      const gapCash = Math.max(0, roundToFix(total * target - latestInvestment.fundAmount, 2))
      if (!(gapCash > 0)) return []

      const rule = fd.tpAddCashRule === 'fixed' ? 'fixed' : 'percentLeft'
      let buyAmount = 0
      if (rule === 'fixed') {
        buyAmount = Math.round(Number(fd.tpAddBuyAmount || 0))
      } else {
        const pct = Number(fd.tpAddBuyPercent ?? 10)
        buyAmount = Math.round((latestInvestment.leftAmount * pct) / 100)
      }

      buyAmount = Math.min(buyAmount, Math.round(gapCash), Math.round(latestInvestment.leftAmount))
      if (!(buyAmount > 0)) return []

      return [
        {
          type: 'BUY',
          fundId,
          date,
          amount: buyAmount,
          reason: `目标仓位补仓：持仓占比 ${(level * 100).toFixed(2)}% < 目标 ${fd.tpAddTargetPercent}%`,
          strategyId: 'target-position-add',
          tags: ['add_position', 'target_weight'],
          priority: 13,
        },
      ]
    },
  }
}
