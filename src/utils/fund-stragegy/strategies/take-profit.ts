import { roundToFix } from '@/utils/common'
import { Action, Strategy, StrategyContext } from '../types'

export function createTakeProfitStrategy(): Strategy {
  return {
    id: 'take-profit',
    kind: 'take_profit' as const,
    evaluate(ctx: StrategyContext): Action[] {
      const { latestInvestment, curSzIndex, curReferIndex, formData, fundId, date } = ctx
      if (!latestInvestment) return []

      const level = roundToFix(latestInvestment.fundAmount / latestInvestment.totalAmount, 2)

      const shouldSell =
        level > formData.fundPosition / 100 &&
        curSzIndex?.val > formData.shCompositeIndex &&
        (!formData.sellAtTop || latestInvestment.maxAccumulatedProfit.date === latestInvestment.date) &&
        (!formData.sellMacdPoint || curReferIndex?.txnType === 'sell') &&
        latestInvestment.profitRate > (formData.profitRate / 100 || -100)

      if (!shouldSell) return []

      const sellAmount =
        formData.sellUnit === 'amount'
          ? formData.sellNum
          : (formData.sellNum / 100) * latestInvestment.fundAmount

      // 保持与旧逻辑一致：比例卖出时先 toFixed(2) 再 Number
      const normalizedSellAmount =
        formData.sellUnit === 'amount' ? Number(sellAmount) : Number(sellAmount.toFixed(2))

      return [
        {
          type: 'SELL',
          fundId,
          date,
          amount: normalizedSellAmount,
          reason: `止盈：仓位>${formData.fundPosition}% 且上证>${formData.shCompositeIndex} 且收益率>${formData.profitRate}%`,
          strategyId: 'take-profit',
          tags: ['take_profit'],
          priority: 10,
        },
      ]
    },
  }
}

