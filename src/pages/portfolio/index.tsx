import React, { Component } from 'react';
import notification from 'antd/es/notification';
import Spin from 'antd/es/spin';
import Table from 'antd/es/table';
import Card from 'antd/es/card';
import Empty from 'antd/es/empty';
import styles from '../index.css';
import moment from 'moment';

import { PortfolioSearchForm, FundFormObj } from '../components/search-form';
import {
  getFundData,
  FundJson,
  getIndexFundData,
  IndexFund,
  IndexData,
  txnByMacd,
} from '@/utils/fund-stragegy/fetch-fund-data';
import {
  PortfolioPositionSnapshotRow,
  PortfolioSnapshotRow,
  StrategyConflictDayRecord,
} from '@/utils/fund-stragegy/types';
import { runEqualWeightPortfolioFromLegs } from '@/utils/fund-stragegy/portfolio/run-equal-weight-portfolio';
import { StrategyConflictsTable } from '../components/strategy-conflicts-table';
import { CommonFundLine } from '../components/common-line';
import { keyTextMap } from '../components/fund-line';
import { BacktestSummaryCards } from '../components/backtest-summary-cards';
import { computeBacktestMetrics } from '@/utils/fund-stragegy/backtest-metrics';

export default class PortfolioPage extends Component<
  {},
  {
    portfolioSnapshots: PortfolioSnapshotRow[];
    positionSnapshots: PortfolioPositionSnapshotRow[];
    strategyConflictRecords: StrategyConflictDayRecord[];
    loading: boolean;
    lastFundIds: string[];
  }
> {
  state = {
    portfolioSnapshots: [] as PortfolioSnapshotRow[],
    positionSnapshots: [] as PortfolioPositionSnapshotRow[],
    strategyConflictRecords: [] as StrategyConflictDayRecord[],
    loading: false,
    lastFundIds: [] as string[],
  };

  runPortfolio = async (formData: FundFormObj) => {
    formData.referIndex = formData.referIndex || IndexFund.ShangZheng;

    const rawCodes = formData.portfolioFundCodes || '';
    const fundIds = rawCodes
      .split(/[\s,，]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (fundIds.length < 2) {
      notification.warning({
        message: '请选择至少 2 只基金',
        description: '组合回测需多只基金；单只基金请使用首页单基金回测。',
      });
      return;
    }

    if (fundIds.length > 8) {
      notification.warning({
        message: '基金数量过多',
        description: '为保持浏览器端性能，建议不超过 8 只；已仅取前 8 只。',
      });
      fundIds.splice(8);
    }

    this.setState({ loading: true });
    try {
      const [szData, referPack, ...fundJsonList] = await Promise.all([
        getIndexFundData({
          code: IndexFund.ShangZheng,
          range: formData.dateRange,
        }),
        formData.referIndex
          ? getIndexFundData({
              code: formData.referIndex,
              range: formData.dateRange,
            })
          : Promise.resolve({} as Record<string, IndexData>),
        ...fundIds.map((id) => getFundData(id, formData.dateRange)),
      ]);

      const referIndexData = referPack || ({} as Record<string, IndexData>);
      txnByMacd(
        Object.values(referIndexData),
        formData.sellMacdPoint / 100,
        formData.buyMacdPoint / 100
      );

      let rangeStart = moment(formData.dateRange[0]);
      for (const result of fundJsonList) {
        const startDate = new Date(Object.keys(result.all).pop()!);
        if (startDate.getTime() > new Date(formData.dateRange[0]).getTime()) {
          rangeStart = moment(startDate);
        }
      }
      if (rangeStart.getTime() > new Date(formData.dateRange[0]).getTime()) {
        formData.dateRange[0] = rangeStart;
      }

      const fundLegs = fundIds.map((id, i) => ({
        fundId: id,
        fundJson: fundJsonList[i] as FundJson,
      }));

      const {
        portfolioSnapshots,
        positionSnapshots,
        strategyConflictRecords,
      } = runEqualWeightPortfolioFromLegs(fundLegs, formData, {
        szData,
        indexData: referIndexData,
      });

      this.setState({
        portfolioSnapshots,
        positionSnapshots,
        strategyConflictRecords,
        lastFundIds: [...fundIds],
        loading: false,
      });
    } catch (e: any) {
      this.setState({ loading: false });
      notification.error({
        message: '组合回测失败',
        description: String(e?.message || e),
      });
    }
  };

  render() {
    const { portfolioSnapshots, positionSnapshots, strategyConflictRecords, lastFundIds } = this.state;
    const chartData = portfolioSnapshots.map((p) => ({
      date: p.date,
      totalAmount: p.total,
    }));

    const portfolioMetrics = computeBacktestMetrics(chartData);

    const lastDate = portfolioSnapshots.length
      ? portfolioSnapshots[portfolioSnapshots.length - 1].date
      : '';
    const lastSnapRows = lastDate ? positionSnapshots.filter((row) => row.date === lastDate) : [];

    const commonProp = {
      chart: {
        forceFit: true,
        height: 520,
        padding: [20, 80, 80, 80],
      },
    };

    const mapWithTotal = {
      ...keyTextMap,
      totalAmount: '组合总资产',
    };

    return (
      <div className={styles.normal}>
        <div className={styles.backtestWorkspace}>
          <div className={styles.backtestChartCol}>
            <Spin spinning={this.state.loading} tip="正在拉取多只基金净值并计算组合回测…">
              {portfolioSnapshots.length > 0 ? (
                <>
                  <BacktestSummaryCards
                    metrics={portfolioMetrics}
                    subtitle={`等权 ${lastFundIds.join('、')}`}
                  />
                  <Card
                    title={`组合总资产（等权拆分：${lastFundIds.join('、')}）`}
                    style={{ marginTop: 16 }}
                    className={styles.contentCard}
                  >
                    <CommonFundLine
                      y="totalAmount"
                      data={chartData as any}
                      textMap={mapWithTotal as any}
                      commonProp={commonProp as any}
                    />
                  </Card>
                  {lastSnapRows.length ? (
                    <Card title="期末持仓占比（占组合总资产）" style={{ marginTop: 16 }}>
                      <Table
                        size="small"
                        pagination={false}
                        dataSource={lastSnapRows.map((row) => ({
                          key: row.fundId,
                          fundId: row.fundId,
                          fundValue: row.fundValue.toFixed(2),
                          weight: `${(row.weight * 100).toFixed(2)}%`,
                        }))}
                        columns={[
                          { title: '基金', dataIndex: 'fundId' },
                          { title: '市值', dataIndex: 'fundValue' },
                          { title: '权重', dataIndex: 'weight' },
                        ]}
                      />
                    </Card>
                  ) : null}
                  <StrategyConflictsTable records={strategyConflictRecords} />
                </>
              ) : (
                !this.state.loading && (
                  <Card style={{ marginTop: 0 }} className={styles.contentCard}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="请在参数区输入 2～8 只基金代码与时间区间，点击「开始回测」查看组合权益曲线与核心指标。"
                    />
                  </Card>
                )
              )}
            </Spin>
          </div>
          <aside className={styles.backtestFormCol}>
            <PortfolioSearchForm variant="portfolio" onSearch={this.runPortfolio} compactSidebar />
          </aside>
        </div>
      </div>
    );
  }
}
