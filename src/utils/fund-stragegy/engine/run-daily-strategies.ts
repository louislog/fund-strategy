import { executeActions } from '../actions/execute-actions'
import { resolvePhaseActions } from './resolve-phase-actions'
import { createDefaultSingleFundStrategies } from '../strategies'
import { Action, DayStrategyConflicts, Strategy, StrategyContext } from '../types'

function collectActionsForSide(
  list: Strategy[],
  ctx: StrategyContext,
  side: 'BUY' | 'SELL'
): Action[] {
  const out: Action[] = []
  for (const s of list) {
    if (s.enabled === false) continue
    for (const a of s.evaluate(ctx)) {
      if (a.type === side) out.push(a)
    }
  }
  return out
}

/**
 * 与旧 `index.tsx` onEachDay 一致：同一自然日内先处理 SELL 相位，再处理 BUY 相位，
 * 这样 BUY 侧使用的 `leftAmount` 会反映当日已卖出释放的现金。
 *
 * SELL 仅来自 `kind === 'take_profit'`；BUY 来自 `add_position` / 未来 `invest` 等。
 */
export function runDailyStrategies(strategy: any, ctx: StrategyContext) {
  const strategies = createDefaultSingleFundStrategies()
  const sellStrategies = strategies.filter((s) => s.kind === 'take_profit')
  const buyStrategies = strategies.filter(
    (s) => s.kind === 'add_position' || s.kind === 'invest'
  )

  const rawSell = collectActionsForSide(sellStrategies, ctx, 'SELL')
  const resolvedSell = resolvePhaseActions(rawSell, 'sell')
  const sellActions = resolvedSell.accepted
  const txnsSell = executeActions(strategy, sellActions)

  const latest = strategy.latestInvestment
  const ctxAfterSell: StrategyContext = {
    ...ctx,
    latestInvestment: latest,
  }

  const rawBuy = collectActionsForSide(buyStrategies, ctxAfterSell, 'BUY')
  const resolvedBuy = resolvePhaseActions(rawBuy, 'buy')
  const buyActions = resolvedBuy.accepted
  const txnsBuy = executeActions(strategy, buyActions)

  const conflicts: DayStrategyConflicts | undefined =
    resolvedSell.rejected.length || resolvedBuy.rejected.length
      ? {
          ...(resolvedSell.rejected.length ? { sell: { rejected: resolvedSell.rejected } } : {}),
          ...(resolvedBuy.rejected.length ? { buy: { rejected: resolvedBuy.rejected } } : {}),
        }
      : undefined

  const actions = [...sellActions, ...buyActions]
  const txns = [...txnsSell, ...txnsBuy]
  if (txns.length > 0) {
    ;(strategy as any).transactions = [...((strategy as any).transactions || []), ...txns]
  }

  const ret: {
    actions: Action[]
    txns: typeof txns
    conflicts?: DayStrategyConflicts
  } = { actions, txns }
  if (conflicts) ret.conflicts = conflicts
  return ret
}
