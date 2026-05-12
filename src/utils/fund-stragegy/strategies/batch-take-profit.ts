import { Action, Strategy, StrategyContext } from '../types'

/**
 * 分批止盈：持仓收益率达到下限即卖出一次（不依赖上证/MACD/仓位门控）。
 * 默认关闭，避免影响 Sprint 1 黄金基线。
 */
export function createBatchTakeProfitStrategy(): Strategy {
  return {
    id: 'batch-take-profit',
    kind: 'take_profit',
    evaluate(ctx: StrategyContext): Action[] {
      const { latestInvestment, formData, fundId, date } = ctx
      if (!latestInvestment) return []

      const fd = formData || {}
      if (!fd.batchTpEnabled || fd.batchTpMinProfitPercent == null) return []

      const minRate = Number(fd.batchTpMinProfitPercent) / 100
      if (!(latestInvestment.profitRate > minRate)) return []

      const sellAmount =
        fd.batchTpSellUnit === 'amount'
          ? Number(fd.batchTpSellNum ?? 0)
          : (Number(fd.batchTpSellNum ?? 0) / 100) * latestInvestment.fundAmount

      const normalizedSellAmount =
        fd.batchTpSellUnit === 'amount' ? Number(sellAmount) : Number(sellAmount.toFixed(2))

      if (!(normalizedSellAmount > 0)) return []

      return [
        {
          type: 'SELL',
          fundId,
          date,
          amount: normalizedSellAmount,
          reason: `分批止盈：收益率>${fd.batchTpMinProfitPercent}%`,
          strategyId: 'batch-take-profit',
          tags: ['take_profit', 'batch'],
          priority: 11,
          mutexGroup: 'sprint2-tp-extra',
        },
      ]
    },
  }
}
