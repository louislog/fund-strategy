import { FundFormObj } from '@/pages/components/search-form'
import { FundJson, IndexData } from '@/utils/fund-stragegy/fetch-fund-data'
import { InvestmentStrategy } from '@/utils/fund-stragegy/index'
import { dateFormat } from '@/utils/common'
import { runDailyStrategies } from '@/utils/fund-stragegy/engine/run-daily-strategies'
import { StrategyConflictDayRecord } from '@/utils/fund-stragegy/types'

export interface RunSingleFundBacktestOptions {
  szData: Record<string, IndexData>
  indexData: Record<string, IndexData>
  /**
   * 组合等权分腿时的规模系数：单基金为 1；N 只基金等权时用 1/N，
   * 初始本金、工资、定投金额同比例缩放，避免多腿重复计入全量现金流。
   */
  legScale?: number
}

export interface RunSingleFundBacktestResult {
  investment: InvestmentStrategy
  strategyConflictRecords: StrategyConflictDayRecord[]
}

/**
 * 与 `pages/index.tsx` 原 `createInvestStragegy` 等价（`legScale=1` 时）。
 */
export function runSingleFundBacktestFromForm(
  fundData: FundJson,
  formData: FundFormObj,
  opt: RunSingleFundBacktestOptions
): RunSingleFundBacktestResult {
  const scale = opt.legScale != null && opt.legScale > 0 ? opt.legScale : 1
  const strategyConflictRecords: StrategyConflictDayRecord[] = []

  const initialTotal = (formData.totalAmount + formData.purchasedFundAmount) * scale
  const purchased = formData.purchasedFundAmount * scale
  const salary = formData.salary * scale
  const fixedAmt = formData.fixedAmount * scale

  const investment = new InvestmentStrategy({
    totalAmount: initialTotal,
    salary,
    shangZhengData: opt.szData,
    indexData: opt.indexData,
    stop: {
      rate: 0.05,
      minAmount: 50000,
    },
    tInvest: {
      rate: 0.05,
      amount: 1000,
    },
    fundJson: fundData,
    onEachDay(this: InvestmentStrategy, curDate: number) {
      const dateStr = dateFormat(curDate)
      const latestInvestment = this.latestInvestment
      const curSzIndex = this.getFundByDate(dateStr, {
        origin: opt.szData,
      })
      const curReferIndex = (opt.indexData[dateStr] || {}) as any as IndexData

      const rs = runDailyStrategies(this, {
        fundId: formData.fundId,
        date: dateStr,
        latestInvestment,
        curSzIndex,
        curReferIndex,
        formData,
      })
      if (rs.conflicts) {
        strategyConflictRecords.push({ date: dateStr, conflicts: rs.conflicts })
      }
    },
  })

  investment
    .buy(purchased, formData.dateRange[0])
    .fixedInvest({
      fixedInvestment: {
        period: formData.period[0],
        amount: fixedAmt,
        dateOrWeek: formData.period[1],
      },
      range: [dateFormat(formData.dateRange[0]), dateFormat(formData.dateRange[1])],
    })

  return { investment, strategyConflictRecords }
}
