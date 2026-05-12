import React from 'react'
import Card from 'antd/es/card'
import Row from 'antd/es/row'
import Col from 'antd/es/col'
import Statistic from 'antd/es/statistic'
import { BacktestMetrics } from '@/utils/fund-stragegy/backtest-metrics'

/** A 股常见配色：涨红跌绿 */
function colorForSignedReturn(v: number): string {
  if (v > 1e-9) {
    return '#cf1322'
  }
  if (v < -1e-9) {
    return '#3f8600'
  }
  return 'rgba(0,0,0,.85)'
}

export interface BacktestSummaryCardsProps {
  metrics: BacktestMetrics | null
  /** 标题旁说明，如基金代码或「组合」 */
  subtitle?: string
}

export const BacktestSummaryCards: React.FC<BacktestSummaryCardsProps> = ({ metrics, subtitle }) => {
  if (!metrics) {
    return null
  }

  const { totalReturn, cagr, maxDrawdown, endEquity, tradingDays, years } = metrics
  const cagrTitle = years >= 0.9 ? '年化收益率' : '年化收益率（样本不足一年，仅供参考）'
  const retColor = colorForSignedReturn(totalReturn)
  const cagrColor = colorForSignedReturn(cagr)

  return (
    <Card
      title="核心指标"
      size="small"
      extra={
        subtitle ? (
          <span style={{ color: 'rgba(0,0,0,.45)', fontWeight: 'normal' }}>{subtitle}</span>
        ) : null
      }
      style={{ marginTop: 16, textAlign: 'left' }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title="区间收益率"
            value={totalReturn * 100}
            precision={2}
            suffix="%"
            valueStyle={{ color: retColor }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title={cagrTitle}
            value={cagr * 100}
            precision={2}
            suffix="%"
            valueStyle={{ color: cagrColor }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic
            title="最大回撤"
            value={maxDrawdown * 100}
            precision={2}
            suffix="%"
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic title="期末总资产" value={endEquity} precision={2} prefix="¥" />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Statistic title="回测交易日" value={tradingDays} suffix="天" />
        </Col>
      </Row>
      <p style={{ margin: '12px 0 0', color: 'rgba(0,0,0,.45)', fontSize: 12 }}>
        说明：年化按自然年复利折算；最大回撤基于总资产曲线历史峰值。基金过往业绩不代表未来表现。
      </p>
    </Card>
  )
}

export { formatPercent } from '@/utils/fund-stragegy/backtest-metrics'
