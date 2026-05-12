import { roundToFix } from '@/utils/common'
import { Action, Transaction } from '../types'

function sideRank(type: Action['type']) {
  return type === 'SELL' ? 0 : 1
}

export function executeActions(strategy: any, actions: Action[]): Transaction[] {
  const sorted = [...actions].sort((a, b) => {
    const bySide = sideRank(a.type) - sideRank(b.type)
    if (bySide !== 0) return bySide
    return (a.priority ?? 100) - (b.priority ?? 100)
  })

  const txns: Transaction[] = []

  function getSnapshot(date: string): any {
    const snap =
      strategy.dataMap[date] || strategy.data.find((d: any) => d.date === date)
    return snap!
  }

  for (const a of sorted) {
    if (a.type === 'BUY') {
      const gross = Number(a.amount ?? 0)
      if (!(gross > 0)) continue

      const beforeInvested = strategy.latestInvestment
      const beforePortion = beforeInvested ? beforeInvested.portion : 0

      strategy.buy(gross, a.date)

      const after = getSnapshot(a.date)
      const portionDelta = roundToFix(after.portion - beforePortion, 2)
      const price = portionDelta > 0 ? roundToFix(after.dateBuyAmount / portionDelta, 4) : Number(after.curFund.val)
      const netSubscription = roundToFix(price * portionDelta, 2)
      const fee = roundToFix(after.dateBuyAmount - netSubscription, 2)

      txns.push({
        date: a.date,
        fundId: a.fundId,
        side: 'BUY',
        price,
        portion: portionDelta,
        grossAmount: after.dateBuyAmount,
        netAmount: -after.dateBuyAmount,
        fee,
        cashDelta: -after.dateBuyAmount,
        strategyId: a.strategyId,
        reason: a.reason,
        tags: a.tags,
      })
    } else if (a.type === 'SELL') {
      const gross = Number(a.amount ?? 0)
      if (!(gross > 0)) continue

      const beforeInvested = strategy.latestInvestment
      const beforePortion = beforeInvested ? beforeInvested.portion : 0

      strategy.sell(gross, a.date)

      const after = getSnapshot(a.date)
      const portionDelta = roundToFix(beforePortion - after.portion, 2)
      const netCash = after.dateSellAmount
      const price = Number(after.curFund.val)
      const grossNotional = roundToFix(price * portionDelta, 2)
      const fee = roundToFix(grossNotional - netCash, 2)

      txns.push({
        date: a.date,
        fundId: a.fundId,
        side: 'SELL',
        price,
        portion: portionDelta,
        grossAmount: grossNotional,
        netAmount: netCash,
        fee,
        cashDelta: netCash,
        strategyId: a.strategyId,
        reason: a.reason,
        tags: a.tags,
      })
    }
  }

  return txns
}

