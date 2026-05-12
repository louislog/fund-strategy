import { Strategy } from '../types'
import { createBatchTakeProfitStrategy } from './batch-take-profit'
import { createDrawdownAddPositionStrategy } from './drawdown-add-position'
import { createDrawdownTakeProfitStrategy } from './drawdown-take-profit'
import { createMacdAddPositionStrategy } from './macd-add-position'
import { createTakeProfitStrategy } from './take-profit'
import { createTargetPositionAddStrategy } from './target-position-add'

export function createDefaultStrategies(): Strategy[] {
  return [
    createTakeProfitStrategy(),
    createDrawdownTakeProfitStrategy(),
    createBatchTakeProfitStrategy(),
    createDrawdownAddPositionStrategy(),
    createMacdAddPositionStrategy(),
    createTargetPositionAddStrategy(),
  ]
}

/** 单基金页默认注册的完整策略列表（与设计文档措辞对齐） */
export function createDefaultSingleFundStrategies(): Strategy[] {
  return createDefaultStrategies()
}
