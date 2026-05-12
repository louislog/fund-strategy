/** 由权益曲线估算回测摘要（与主流回测工具口径对齐：区间收益、年化、最大回撤） */

export interface EquityPoint {
  date: string
  totalAmount: number
}

export interface BacktestMetrics {
  tradingDays: number
  years: number
  startEquity: number
  endEquity: number
  /** 小数，如 0.12 表示 12% */
  totalReturn: number
  /** 年化，区间短于约一年时与 totalReturn 二选一展示由 UI 决定 */
  cagr: number
  /** 最大回撤，负数小数如 -0.23 */
  maxDrawdown: number
}

export function computeBacktestMetrics(points: EquityPoint[]): BacktestMetrics | null {
  if (!points || points.length < 2) {
    return null
  }
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const startEquity = sorted[0].totalAmount
  const endEquity = sorted[sorted.length - 1].totalAmount
  if (!(startEquity > 0)) {
    return null
  }

  const t0 = new Date(sorted[0].date).getTime()
  const t1 = new Date(sorted[sorted.length - 1].date).getTime()
  const ms = Math.max(0, t1 - t0)
  const years = ms / (365.25 * 24 * 3600 * 1000)
  const tradingDays = sorted.length

  const totalReturn = (endEquity - startEquity) / startEquity

  let cagr = totalReturn
  if (years > 1 / 365) {
    cagr = Math.pow(endEquity / startEquity, 1 / years) - 1
  }

  let peak = sorted[0].totalAmount
  let maxDd = 0
  for (const p of sorted) {
    const v = p.totalAmount
    if (v > peak) {
      peak = v
    }
    if (peak > 0) {
      const dd = (v - peak) / peak
      if (dd < maxDd) {
        maxDd = dd
      }
    }
  }

  return {
    tradingDays,
    years,
    startEquity,
    endEquity,
    totalReturn,
    cagr,
    maxDrawdown: maxDd,
  }
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${(value * 100).toFixed(fractionDigits)}%`
}
