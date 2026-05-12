import React, { Component } from 'react';
import Form, { FormComponentProps } from '@ant-design/compatible/es/form';
import type { GetFieldDecoratorOptions } from '@ant-design/compatible/es/form/Form';
import DatePicker from 'antd/es/date-picker';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Select from 'antd/es/select';
import Input from 'antd/es/input';
import InputNumber from 'antd/es/input-number';
import Cascader from 'antd/es/cascader';
import Divider from 'antd/es/divider';
import Tabs from 'antd/es/tabs';
import Alert from 'antd/es/alert';
import moment from 'moment';
import { dateFormat } from '@/utils/common';
import { FundInfo, getFundInfo, IndexData } from '@/utils/fund-stragegy/fetch-fund-data';
import styles from '../index.css';
import { StopProfitForm } from './stop-profit-form';
import { BuyStragegyForm } from './buy-stragegy-form'
import { SavedSearchCondition } from './saved-search'
import throttle from 'lodash/throttle'

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

export interface FundFormObj {
  /**
   * 基金 id
   */
  fundId: string
  /**
   * 时间范围
   */
  dateRange: [any, any]

  /**
   * 定投周期 + 定投时间
   */
  period: ['weekly' | 'monthly' | 'tradingDay', number]

  /**
   * 初始资产
   */
  totalAmount: number
  /**
   * 工资
   */
  salary: number
  /**
   * 定投资金
   */
  fixedAmount: number
  /**
   * 已买入基金
   */
  purchasedFundAmount: number


  // 止盈策略参数
  /**
   * 上证指数
   */
  shCompositeIndex: number

  /**
   * 持有仓位
   */
  fundPosition: number

  /**
   * 是否最高值止盈
   */
  sellAtTop: boolean


  /**
   * 卖出多少
   */
  sellNum: number

  /**
   * 卖出单位
   */
  sellUnit: 'amount' | 'fundPercent'

  /**
   * 持有收益率大于 xx 时止盈
   */
  profitRate: number

  /**
   * 参考指数
   */
  referIndex: string

  /**
   * 补仓macd（参考指数） 百分位临界点
   */
  buyMacdPoint: number

  /**
   * 卖出 macd （参考指数）百分位临界点
   */
  sellMacdPoint: number


  /**
   * 补仓买入时的 百分比
   */
  buyAmountPercent: number

  /** —— Sprint 2 可选：回撤补仓（未配置时等同关闭） —— */
  /** 是否启用从净值阶段高点的回撤补仓 */
  ddAddEnabled?: boolean
  /** 从高点回撤百分比阈值（填 10 表示 10%） */
  ddAddThresholdPercent?: number
  /** 买入现金规则：按剩余现金比例 或 固定金额 */
  ddAddCashRule?: 'percentLeft' | 'fixed'
  /** `percentLeft`：使用剩余现金的比例（默认 10，与补仓描述习惯对齐） */
  ddAddBuyPercent?: number
  /** `fixed`：每次补仓固定金额（元） */
  ddAddBuyAmount?: number

  /** —— Sprint 2：分批止盈（默认关） —— */
  batchTpEnabled?: boolean
  batchTpMinProfitPercent?: number
  batchTpSellUnit?: 'amount' | 'fundPercent'
  batchTpSellNum?: number

  /** —— Sprint 3 组合页：逗号分隔多基金编号（可与 fundId 二选一） —— */
  portfolioFundCodes?: string

  /** —— Sprint 2：回撤止盈（默认关）：自累计收益峰值回撤 —— */
  ddTpEnabled?: boolean
  ddTpPullbackFromPeakPercent?: number
  ddTpSellUnit?: 'amount' | 'fundPercent'
  ddTpSellNum?: number

  /** —— Sprint 2：目标仓位补仓（默认关） —— */
  tpAddEnabled?: boolean
  tpAddTargetPercent?: number
  tpAddCashRule?: 'percentLeft' | 'fixed'
  tpAddBuyPercent?: number
  tpAddBuyAmount?: number
}

export interface FundSearchProp extends FormComponentProps<FundFormObj> {
  onSearch: (form: FundFormObj) => any
  /** single：默认单基金下拉；portfolio：多只基金编码输入 */
  variant?: 'single' | 'portfolio'
  /** 嵌入右侧栏时收窄表单项并排布 */
  compactSidebar?: boolean
}


export class InnerSearchForm extends Component<FundSearchProp, {
  searchFundData: FundInfo[]
}> {

  state = {
    searchFundData: [] as FundInfo[]
  }
  private weekOpt = ['一', `二`, `三`, `四`, `五`].map((item, index) => {
    return {
      value: index + 1 as any as string,
      label: `周` + item
    }
  })

  private monthOpt = Array(28).fill('').map((item, index) => {
    return {
      value: index + 1 as any as string,
      label: `${index + 1}号`
    }
  })


  get periodOpts() {
    return [{
      value: 'weekly',
      label: '每周',
      children: this.weekOpt
    }, {
      value: 'monthly',
      label: '每月',
      children: this.monthOpt
    }, {
      value: 'tradingDay',
      label: '每个交易日',
      children: [{
        value: 1 as any as string,
        label: '交易日'
      }]
    }]
  }

  /**
   * 基金数据搜索
   */
  handleSearch = throttle(async (value) => {
    if (value) {
      const result = await getFundInfo(value)
      this.setState({ searchFundData: result });
    } else {
      this.setState({ searchFundData: [] });
    }
  }, 1000)

  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        const v = { ...values } as FundFormObj
        if (this.props.variant === 'portfolio' && v.portfolioFundCodes) {
          const first =
            v.portfolioFundCodes
              .split(/[\s,，]+/)
              .map((s) => s.trim())
              .find(Boolean) || ''
          v.fundId = first
        }
        this.props.onSearch(v)
      }
    });
  }

  reset = () => {
    this.props.form.resetFields()
  }

  private disabledDate = (date) => {
    const selectDate = new Date(date).getTime()
    const now = Date.now()
    return selectDate > now
  }

  /**
   * 当前搜索条件保存成功
   */
  // private savedSearchForm = (values: FundFormObj) => {

  // }

  /**
   * 更新当前搜索条件
   */
  private updateSearchForm = (name: string, values: FundFormObj) => {
    this.handleSearch(values.fundId)

    this.props.form.setFieldsValue({
      ...values,
      dateRange: values.dateRange.map(t => moment(t))
    })
    this.props.onSearch(values)

  }

  render() {

    const { getFieldDecorator } = this.props.form;
    const { searchFundData } = this.state
    let [curYear, curMonth, curDate] = dateFormat(new Date()).split('-').map(Number)
    curMonth = Number(curMonth) - 1

    const formItemLayout = {
      style: this.props.compactSidebar
        ? { width: '100%', maxWidth: 'none' as const }
        : {
            width: '100%',
            maxWidth: 560,
          },
      labelCol: {
        xs: { span: 24 },
        sm: { span: this.props.compactSidebar ? 24 : 8 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: this.props.compactSidebar ? 24 : 16 },
      },
    };
    const rangeConfig: GetFieldDecoratorOptions = {
      rules: [{ type: 'array', required: true, message: '请选择时间范围' }],
      initialValue: [moment([Number(curYear) - 1, curMonth, curDate]), moment([curYear, curMonth, curDate])]
    };

    const variant = this.props.variant || 'single'
    const cardTitle = variant === 'portfolio' ? '组合回测选项（等权拆分）' : '基金选项'
    const formVal: FundFormObj = this.props.form.getFieldsValue() as any

    return <Card title={cardTitle}
      extra={<SavedSearchCondition form={this.props.form} onSelected={this.updateSearchForm} />}
      style={{
        textAlign: 'initial',
        margin: this.props.compactSidebar ? 0 : '20px 0',
      }} >

      <Form onSubmit={this.handleSubmit} >
        <Tabs type="card" animated={false} defaultActiveKey="base">
          <TabPane tab="标的与时间" key="base">
            <Form.Item {...formItemLayout} label={variant === 'portfolio' ? '基金编号（多只）' : '基金编号'}>
              {variant === 'portfolio' ? (
                getFieldDecorator<FundFormObj>('portfolioFundCodes', {
                  rules: [{ required: true, message: '请输入基金编号，英文逗号分隔' }],
                  initialValue: '260108,161725',
                })(
                  <Input.TextArea rows={2} placeholder="多只基金代码英文逗号或空格分隔，如 260108,161725" />
                )
              ) : (
                getFieldDecorator<FundFormObj>('fundId', {
                  rules: [{ required: true, message: '请输入基金编号' }],
                })(
                <Select
                  showSearch
                  placeholder="输入基金名称或基金编号"
                  defaultActiveFirstOption={false}
                  showArrow={false}
                  filterOption={false}
                  onSearch={this.handleSearch}
                  notFoundContent={null}
                >
                  {searchFundData.map(d => <Option key={d.code}>{d.name}[{d.code}]</Option>)}
                </Select>
                )
              )}
            </Form.Item>

            <Form.Item {...formItemLayout} label="时间范围">
              {getFieldDecorator<FundFormObj>('dateRange', rangeConfig)(
                <RangePicker
                  placeholder={['开始时间', '结束时间']}
                  ranges={{
                    '最近一年': [moment([Number(curYear) - 1, curMonth, curDate]), moment([curYear, curMonth, curDate])],
                    '最近两年': [moment([Number(curYear) - 2, curMonth, curDate]), moment([curYear, curMonth, curDate])],
                    '最近三年': [moment([Number(curYear) - 3, curMonth, curDate]), moment([curYear, curMonth, curDate])],
                    '最近五年': [moment([Number(curYear) - 5, curMonth, curDate]), moment([curYear, curMonth, curDate])],
                  }}
                  disabledDate={this.disabledDate} />)}
            </Form.Item>
          </TabPane>

          <TabPane tab="资金与定投" key="capital">
            <p className={styles.hint} style={{ marginBottom: 16 }}>
              默认假设：分红方式为红利复投；买入费率 0.15%；卖出费率 0.5%。
            </p>
            <Form.Item {...formItemLayout} label="初始本金">
              {getFieldDecorator<FundFormObj>('totalAmount', {
                initialValue: 10000,
                rules: [{ required: true, message: '请输入本金' }]
              })(
                <InputNumber style={{ width: '100%' }} min={0} />
              )}
            </Form.Item>

            <Form.Item {...formItemLayout} label="月工资[每月增量资金]">
              {getFieldDecorator<FundFormObj>('salary', {
                initialValue: 10000,
                rules: [{ required: true, message: '请输入月工资' }]
              })(
                <InputNumber style={{ width: '100%' }} min={0} />
              )}
            </Form.Item>

            <Form.Item {...formItemLayout} label="初始持有基金金额">
              {getFieldDecorator<FundFormObj>('purchasedFundAmount', {
                initialValue: 0,
                rules: [{ required: true, message: '输入持有基金金额, 从0开始定投则填0' }]
              })(
                <InputNumber style={{ width: '100%' }} min={0} placeholder="投资开始时持有的基金金额" />
              )}
            </Form.Item>

            <Form.Item {...formItemLayout} label="定投金额">
              {getFieldDecorator<FundFormObj>('fixedAmount', {
                rules: [{ required: true, message: '输入定投金额' }],
                initialValue: 1000,
              })(
                <InputNumber style={{ width: '100%' }} min={0} />
              )}
            </Form.Item>

            <Form.Item {...formItemLayout} label="定投周期">
              {getFieldDecorator<FundFormObj>('period', {
                initialValue: ['monthly', 1],
                rules: [{ required: true, }],
              })(
                <Cascader options={this.periodOpts} placeholder="选择定投周期" />,
              )}

            </Form.Item>
          </TabPane>

          <TabPane tab="止盈策略" key="stop">
            <StopProfitForm form={this.props.form} compactSidebar={this.props.compactSidebar} />
          </TabPane>

          <TabPane tab="补仓与指标" key="add">
            <BuyStragegyForm form={this.props.form} compactSidebar={this.props.compactSidebar} />
          </TabPane>
        </Tabs>

        <Divider />

        <Form.Item wrapperCol={this.props.compactSidebar ? {
          xs: { span: 24 },
          sm: { span: 24 },
        } : {
          xs: { span: 24 },
          sm: { span: 16, offset: 8 }
        }} style={{
          marginBottom: 0,
          textAlign: this.props.compactSidebar ? 'center' : undefined,
        }}>
          <Button type="primary" htmlType="submit" size="large">
            开始回测
          </Button>

          <Button style={{ marginLeft: 16 }} onClick={this.reset} size="large">
            重置
          </Button>
        </Form.Item>
      </Form>

      {
        formVal.dateRange ?
          <Alert
            style={{ marginTop: 16, textAlign: 'left' }}
            type="info"
            showIcon
            message="当前策略摘要（只读）"
            description={
              <div>
                <p style={{ marginBottom: 8 }}>
                  定投：{formVal.dateRange[0].format('YYYY-MM-DD')} ~ {formVal.dateRange[1].format('YYYY-MM-DD')}，
                  标的 {variant === 'portfolio' ? (formVal.portfolioFundCodes || '-') : formVal.fundId}，
                  初始持仓 {formVal.purchasedFundAmount} 元，可用现金 {formVal.totalAmount} 元，月工资增量 {formVal.salary} 元；
                  {formVal.period[0] === 'tradingDay'
                    ? `每交易日定投 ${formVal.fixedAmount} 元。`
                    : `每${formVal.period[0] === 'weekly' ? '周' : '月'} ${formVal.period[1]}${formVal.period[0] === 'weekly' ? '' : ' 号'}定投 ${formVal.fixedAmount} 元。`}
                </p>
                <p style={{ marginBottom: 8 }}>
                  止盈：上证 &gt; {formVal.shCompositeIndex} 点，仓位 &gt; {formVal.fundPosition}%，持有收益率 &gt; {formVal.profitRate}%
                  {formVal.sellAtTop ? '，且累计盈利新高' : ''}
                  {formVal.sellMacdPoint !== null && formVal.sellMacdPoint >= 0
                    ? `；参考指数 ${formVal.referIndex} MACD 红柱接近 ${formVal.sellMacdPoint}%` : ''}
                  ；卖出 {formVal.sellNum}{formVal.sellUnit === 'amount' ? ' 元' : '% 份额'}。
                </p>
                <p style={{ marginBottom: 0 }}>
                  补仓：{formVal.buyMacdPoint !== null && formVal.buyMacdPoint >= 0
                    ? `参考指数 ${formVal.referIndex} MACD 绿柱接近 ${formVal.buyMacdPoint}%，用剩余流动资金 ${formVal.buyAmountPercent}% 补仓`
                    : '（未启用 MACD 补仓条件）'}
                </p>
              </div>
            }
          /> : null
      }

    </Card>
  }
}

export const SearchForm = Form.create<FundSearchProp>({ name: 'fund-search' })(InnerSearchForm);
export const PortfolioSearchForm = Form.create<FundSearchProp>({ name: 'portfolio-fund-search' })(InnerSearchForm);
