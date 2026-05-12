import { InvestmentStrategy } from '@/utils/fund-stragegy/index'
import { PortfolioPositionSnapshotRow, PortfolioSnapshotRow } from '@/utils/fund-stragegy/types'

export interface EqualWeightPortfolioLeg {
  fundId: string
  investment: InvestmentStrategy
}

/**
 * 将若干等权分腿的日快照合并为组合层总资产曲线与分基金权重。
 */
export function aggregateEqualWeightPortfolio(
  legs: EqualWeightPortfolioLeg[]
): { portfolioSnapshots: PortfolioSnapshotRow[]; positionSnapshots: PortfolioPositionSnapshotRow[] } {
  if (legs.length === 0) {
    return { portfolioSnapshots: [], positionSnapshots: [] }
  }

  const dateSet = new Set<string>()
  for (const leg of legs) {
    for (const d of leg.investment.data) {
      dateSet.add(d.date)
    }
  }
  const dates = [...dateSet].sort()

  const portfolioSnapshots: PortfolioSnapshotRow[] = []
  const positionSnapshots: PortfolioPositionSnapshotRow[] = []

  for (const date of dates) {
    let cash = 0
    let positionsValue = 0
    for (const leg of legs) {
      const snap = leg.investment.dataMap[date] || leg.investment.data.find((s) => s.date === date)
      if (!snap) continue
      cash += snap.leftAmount
      positionsValue += snap.fundAmount
    }
    const total = cash + positionsValue
    portfolioSnapshots.push({ date, total, cash, positionsValue })

    for (const leg of legs) {
      const snap = leg.investment.dataMap[date] || leg.investment.data.find((s) => s.date === date)
      if (!snap) continue
      const fv = snap.fundAmount
      const w = total > 0 ? fv / total : 0
      positionSnapshots.push({
        date,
        fundId: leg.fundId,
        fundValue: fv,
        weight: w,
      })
    }
  }

  return { portfolioSnapshots, positionSnapshots }
}
