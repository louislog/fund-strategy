import React, { Component } from 'react'
import Card from 'antd/es/card'
import Table from 'antd/es/table'
import Alert from 'antd/es/alert'
import { ConflictEntry, StrategyConflictDayRecord } from '@/utils/fund-stragegy/types'

export { StrategyConflictDayRecord }

function formatEntryAction(a: ConflictEntry['action']) {
  const amt = a.amount != null ? `金额 ${Number(a.amount).toFixed(2)}` : ''
  const por = a.portion != null ? `份额 ${a.portion}` : ''
  const extra = [amt, por].filter(Boolean).join('，')
  return `${a.type}${extra ? `（${extra}）` : ''}`
}

/** 某日多相位被拒绝动作 → 扁平行 */
function flattenRecord(rec: StrategyConflictDayRecord): ConflictRow[] {
  const rows: ConflictRow[] = []
  const { date, conflicts: c } = rec
  if (c.sell?.rejected?.length) {
    c.sell.rejected.forEach((e, idx) => {
      rows.push({
        key: `${date}-sell-${idx}-${e.action.strategyId}`,
        date,
        phaseLabel: '卖出相位',
        strategyId: e.action.strategyId,
        mutexReason: e.reason,
        intentReason: e.action.reason,
        actionBrief: formatEntryAction(e.action),
      })
    })
  }
  if (c.buy?.rejected?.length) {
    c.buy.rejected.forEach((e, idx) => {
      rows.push({
        key: `${date}-buy-${idx}-${e.action.strategyId}`,
        date,
        phaseLabel: '买入相位',
        strategyId: e.action.strategyId,
        mutexReason: e.reason,
        intentReason: e.action.reason,
        actionBrief: formatEntryAction(e.action),
      })
    })
  }
  return rows
}

interface ConflictRow {
  key: string
  date: string
  phaseLabel: string
  strategyId: string
  mutexReason: string
  intentReason: string
  actionBrief: string
}

export class StrategyConflictsTable extends Component<{ records: StrategyConflictDayRecord[] }> {
  render() {
    const { records } = this.props
    const data: ConflictRow[] = []
    for (const r of records) {
      data.push(...flattenRecord(r))
    }

    if (data.length === 0) {
      return (
        <Card title="策略冲突复盘" style={{ marginTop: 16 }}>
          <Alert type="info" showIcon message="本次回测内没有因「同日互斥组」被拦截的策略信号。" />
        </Card>
      )
    }

    return (
      <Card title="策略冲突复盘" style={{ marginTop: 16 }}>
        <p style={{ color: 'rgba(0,0,0,.45)', marginBottom: 12 }}>
          以下信号在当日排序后，因共享互斥组（mutex）仅执行其中一条，其余未撮合执行。
        </p>
        <Table
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          dataSource={data}
          columns={[
            { title: '日期', dataIndex: 'date', width: 110 },
            { title: '相位', dataIndex: 'phaseLabel', width: 100 },
            { title: '策略', dataIndex: 'strategyId', width: 160 },
            { title: '互斥说明', dataIndex: 'mutexReason', ellipsis: true },
            { title: '原计划说明', dataIndex: 'intentReason', ellipsis: true },
            { title: '动作', dataIndex: 'actionBrief', width: 180 },
          ]}
        />
      </Card>
    )
  }
}
