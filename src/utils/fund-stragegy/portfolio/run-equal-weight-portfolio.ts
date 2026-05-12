import { FundFormObj } from '@/pages/components/search-form'
import { FundJson, IndexData } from '@/utils/fund-stragegy/fetch-fund-data'
import { runSingleFundBacktestFromForm } from '@/utils/fund-stragegy/backtest/run-single-from-form'
import { aggregateEqualWeightPortfolio, EqualWeightPortfolioLeg } from '@/utils/fund-stragegy/portfolio/aggregate-equal-weight'
import { PortfolioPositionSnapshotRow, PortfolioSnapshotRow, StrategyConflictDayRecord, Transaction } from '@/utils/fund-stragegy/types'

export interface RunEqualWeightPortfolioOptions {
  szData: Record<string, IndexData>
  indexData: Record<string, IndexData>
}

export interface EqualWeightPortfolioRunResult {
  legs: EqualWeightPortfolioLeg[]
  portfolioSnapshots: PortfolioSnapshotRow[]
  positionSnapshots: PortfolioPositionSnapshotRow[]
  strategyConflictRecords: StrategyConflictDayRecord[]
  allTransactions: Transaction[]
}

/**
 * 多基金等权拆分现金与定投：每条腿独立跑 `InvestmentStrategy`，再合并总资产曲线。
 */
export function runEqualWeightPortfolioFromLegs(
  fundLegs: Array<{ fundId: string; fundJson: FundJson }>,
  formData: FundFormObj,
  opt: RunEqualWeightPortfolioOptions
): EqualWeightPortfolioRunResult {
  const n = fundLegs.length || 1
  const scale = 1 / n
  const legs: EqualWeightPortfolioLeg[] = []
  const strategyConflictRecords: StrategyConflictDayRecord[] = []
  const allTransactions: Transaction[] = []

  for (const fl of fundLegs) {
    const fd = { ...formData, fundId: fl.fundId }
    const { investment, strategyConflictRecords: dayRecs } = runSingleFundBacktestFromForm(fl.fundJson, fd, {
      ...opt,
      legScale: scale,
    })
    legs.push({ fundId: fl.fundId, investment })
    strategyConflictRecords.push(...dayRecs)
    if (investment.transactions?.length) {
      allTransactions.push(...investment.transactions)
    }
  }

  strategyConflictRecords.sort((a, b) => a.date.localeCompare(b.date))

  const { portfolioSnapshots, positionSnapshots } = aggregateEqualWeightPortfolio(legs)

  return {
    legs,
    portfolioSnapshots,
    positionSnapshots,
    strategyConflictRecords,
    allTransactions,
  }
}
