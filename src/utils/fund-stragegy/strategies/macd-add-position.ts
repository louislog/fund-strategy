import { Action, Strategy, StrategyContext } from '../types'

export function createMacdAddPositionStrategy(): Strategy {
  return {
    id: 'macd-add-position',
    kind: 'add_position' as const,
    evaluate(ctx: StrategyContext): Action[] {
      const { latestInvestment, curReferIndex, formData, fundId, date } = ctx
      if (!latestInvestment) return []

      const shouldBuy = formData.buyMacdPoint && curReferIndex?.txnType === 'buy'
      if (!shouldBuy) return []

      // 保持与旧逻辑一致：
      // - buyAmountPercent <= 100：按剩余现金比例
      // - 否则：视为固定金额
      const buyAmount =
        formData.buyAmountPercent <= 100
          ? Math.round((latestInvestment.leftAmount * formData.buyAmountPercent) / 100)
          : formData.buyAmountPercent

      return [
        {
          type: 'BUY',
          fundId,
          date,
          amount: buyAmount,
          reason: `补仓：参考指数 MACD 买点；买入 ${formData.buyAmountPercent <= 100 ? `${formData.buyAmountPercent}% 现金` : '固定金额'}`,
          strategyId: 'macd-add-position',
          tags: ['add_position', 'macd'],
          priority: 20,
        },
      ]
    },
  }
}

