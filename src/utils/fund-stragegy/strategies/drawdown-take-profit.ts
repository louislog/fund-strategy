import { Action, Strategy, StrategyContext } from '../types'

/**
 * 回撤止盈：自历史最大「累计收益」峰值回撤超过阈值时减仓（仍为浮盈时可触发）。
 * 默认关闭。
 */
export function createDrawdownTakeProfitStrategy(): Strategy {
  return {
    id: 'drawdown-take-profit',
    kind: 'take_profit',
    evaluate(ctx: StrategyContext): Action[] {
      const { latestInvestment, formData, fundId, date } = ctx
      if (!latestInvestment) return []

      const fd = formData || {}
      if (!fd.ddTpEnabled || fd.ddTpPullbackFromPeakPercent == null) return []

      const peak = latestInvestment.maxAccumulatedProfit?.amount ?? 0
      const cur = latestInvestment.accumulatedProfit
      if (!(peak > 0 && cur > 0)) return []

      const pullback = (peak - cur) / peak
      const th = Number(fd.ddTpPullbackFromPeakPercent) / 100
      if (!(pullback >= th)) return []

      const sellAmount =
        fd.ddTpSellUnit === 'amount'
          ? Number(fd.ddTpSellNum ?? 0)
          : (Number(fd.ddTpSellNum ?? 0) / 100) * latestInvestment.fundAmount

      const normalizedSellAmount =
        fd.ddTpSellUnit === 'amount' ? Number(sellAmount) : Number(sellAmount.toFixed(2))

      if (!(normalizedSellAmount > 0)) return []

      return [
        {
          type: 'SELL',
          fundId,
          date,
          amount: normalizedSellAmount,
          reason: `回撤止盈：累计收益自峰值 ${peak.toFixed(2)} 回撤 ${(pullback * 100).toFixed(2)}% ≥ ${fd.ddTpPullbackFromPeakPercent}%`,
          strategyId: 'drawdown-take-profit',
          tags: ['take_profit', 'drawdown_peak'],
          priority: 8,
          mutexGroup: 'sprint2-tp-extra',
        },
      ]
    },
  }
}
