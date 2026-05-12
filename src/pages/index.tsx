import React, { Component } from 'react';
import styles from './index.css';
import { FundChart } from './components/fund-line'
import { SearchForm, FundFormObj } from './components/search-form'
import { getFundData, FundJson, getIndexFundData, IndexFund, IndexData, txnByMacd } from '@/utils/fund-stragegy/fetch-fund-data';
import { InvestDateSnapshot } from '@/utils/fund-stragegy';
import  notification  from 'antd/es/notification';
import moment from 'moment'
import Spin from 'antd/es/spin';
import Empty from 'antd/es/empty';
import Card from 'antd/es/card';
import { runSingleFundBacktestFromForm } from '@/utils/fund-stragegy/backtest/run-single-from-form';
import { StrategyConflictsTable } from './components/strategy-conflicts-table';
import { StrategyConflictDayRecord } from '@/utils/fund-stragegy/types';
import { BacktestSummaryCards } from './components/backtest-summary-cards';
import { computeBacktestMetrics } from '@/utils/fund-stragegy/backtest-metrics';



export default class App extends Component<{}, {
  fundData: InvestDateSnapshot[]
  strategyConflictRecords: StrategyConflictDayRecord[]
  loading: boolean
  lastFundId: string
}> {
  
  state = {
    fundData: [] as InvestDateSnapshot[],
    strategyConflictRecords: [] as StrategyConflictDayRecord[],
    loading: false,
    lastFundId: '',
  }


  /**
   * 基金数据查询
   */
  getFundData = async (formData: FundFormObj) => {
    this.setState({ loading: true });
    formData.referIndex = formData.referIndex || IndexFund.ShangZheng

    try {
      const [result, szData, referIndexData] = await Promise.all([
        getFundData(formData.fundId, formData.dateRange),
        getIndexFundData({
          code: IndexFund.ShangZheng,
          range: formData.dateRange
        }),
        formData.referIndex ? getIndexFundData({
          code: formData.referIndex,
          range: formData.dateRange
        }) : Promise.resolve(null)
      ]) 

      txnByMacd(Object.values(referIndexData), formData.sellMacdPoint/100, formData.buyMacdPoint / 100)


      const startDate = new Date( Object.keys(result.all).pop()! )
      if(startDate.getTime() > new Date(formData.dateRange[0]).getTime()) {
        formData.dateRange[0] = moment(startDate)
      }
      return this.createInvestStragegy(result, formData, {
        szData,
        indexData: referIndexData 
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      notification.error({
        message: '基金创建错误',
        description: msg,
      });
      throw e instanceof Error ? e : new Error(msg);
    } finally {
      this.setState({ loading: false })
    }
  }

  /**
   * 创建投资策略对象
   * @param fundData 基金源数据
   * @param formData 基金表单自定义选项
   */
  createInvestStragegy(fundData: FundJson, formData: FundFormObj, opt: {
    szData: Record<string, IndexData>,
    indexData: Record<string, IndexData>
  }) {
    const { investment, strategyConflictRecords } = runSingleFundBacktestFromForm(fundData, formData, {
      szData: opt.szData,
      indexData: opt.indexData,
    })

    this.setState({
      fundData: investment.data,
      strategyConflictRecords,
      lastFundId: formData.fundId,
    })
    return investment
  }
  
  render() {
    const { fundData, loading, lastFundId } = this.state;
    const equityPoints = fundData.map((s) => ({
      date: s.date,
      totalAmount: s.totalAmount,
    }));
    const metrics = computeBacktestMetrics(equityPoints);
    const kpiSubtitle = fundData.length > 0 && lastFundId ? `标的 ${lastFundId}` : undefined;

    return (
      <div className={styles.normal}>
        <div className={styles.backtestWorkspace}>
          <div className={styles.backtestChartCol}>
            <Spin spinning={loading} tip="正在拉取行情并计算回测…">
              {!loading && fundData.length === 0 ? (
                <Card style={{ marginTop: 0 }} className={styles.contentCard}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="请先完成「标的与时间、资金与定投、止盈与补仓」等参数，点击「开始回测」。净值与总资产等图表将在此处展示。"
                  />
                </Card>
              ) : null}
              {fundData.length > 0 ? (
                <>
                  <BacktestSummaryCards metrics={metrics} subtitle={kpiSubtitle} />
                  <Card title="回测详情" style={{ marginTop: 16 }} className={styles.contentCard}>
                    <FundChart data={this.state.fundData} />
                  </Card>
                  <StrategyConflictsTable records={this.state.strategyConflictRecords} />
                </>
              ) : null}
            </Spin>
          </div>
          <aside className={styles.backtestFormCol}>
            <SearchForm onSearch={this.getFundData} compactSidebar />
          </aside>
        </div>
      </div>
    );
  }
}
