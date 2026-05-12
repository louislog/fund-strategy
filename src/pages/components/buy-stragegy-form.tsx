/**
 * 补仓策略表单
 */
import React, { Component } from 'react';
import { FundFormObj } from './search-form';
import Form, { FormComponentProps } from '@ant-design/compatible/es/form';
import Select  from 'antd/es/select';
import InputNumber  from 'antd/es/input-number';
import Divider  from 'antd/es/divider';
import Switch from 'antd/es/switch';
import { searchIndex, SearchIndexResp } from '@/utils/fund-stragegy/fetch-fund-data';
import throttle from 'lodash/throttle'
const { Option } = Select

const layoutDefault = {
  style: { width: 500 as const },
  labelCol: {
    xs: { span: 24 },
    sm: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 16 },
  },
};

const layoutCompact = {
  style: { width: '100%' as const },
  labelCol: {
    xs: { span: 24 },
    sm: { span: 24 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 24 },
  },
};

interface BuyStrategyFormProp extends FormComponentProps<FundFormObj> {
  compactSidebar?: boolean
}

export class BuyStragegyForm extends Component<BuyStrategyFormProp> {
  state = {
    searchIndexData: [] as SearchIndexResp[]
  }


  handleSearchIndex = throttle(async (value) => {

    if (value) {
      const result = await searchIndex(value)
      this.setState({ searchIndexData: result });
    } else {
      this.setState({ searchIndexData: [] });
    }
  }, 1000)

  render() {
    const { searchIndexData } = this.state

    const formItemLayout = this.props.compactSidebar ? layoutCompact : layoutDefault;

    const { getFieldDecorator } = this.props.form;

    return <section>
      <Divider orientation="left">补仓策略 </Divider>
      <Form.Item {...formItemLayout} label="参考指数">
        {getFieldDecorator<FundFormObj>('referIndex')(
          <Select
            showSearch
            placeholder="输入指数名称或编号"
            defaultActiveFirstOption={false}
            showArrow={false}
            filterOption={false}
            onSearch={this.handleSearchIndex}
            // onChange={this.handleChange}
            notFoundContent={null}
          >
            {searchIndexData.map((d, index) => <Option key={d.id}>{d.name}[{d.code}]</Option>)}
          </Select>
        )}
      </Form.Item>

      <Form.Item {...formItemLayout} label="买入 MACD 临界点">
        {getFieldDecorator<FundFormObj>('buyMacdPoint', {
          // initialValue: 100
        })(
          <InputNumber style={{ width: '100%' }} formatter={value => `${value}%`}
            parser={value => (value || '').replace('%', '')} min={0} max={100} placeholder="macd 补仓点" />
        )
        }
      </Form.Item>

      <Form.Item {...formItemLayout} label='补仓金额'>
        <div  >
          <span>  剩余流动资金的 </span>
          {getFieldDecorator<FundFormObj>('buyAmountPercent', {
            initialValue: 20,
          })(
            <InputNumber size="small"  min={0}  
            formatter={value => Number(value) > 100 ? `${value}元` : `${value}%`}
            parser={value => (value || '').replace(/%|元/, '')}
            placeholder="补仓买入百分比" />
          )} </div>

      </Form.Item>

      <Divider orientation="left" style={{ marginTop: 8 }}>回撤补仓（可选）</Divider>
      <Form.Item {...formItemLayout} label="启用">
        {getFieldDecorator<FundFormObj>('ddAddEnabled', {
          valuePropName: 'checked',
          initialValue: false,
        })(
          <Switch checkedChildren="开" unCheckedChildren="关" />
        )}
      </Form.Item>
      <Form.Item {...formItemLayout} label="从净值高点回撤 ≥ (%)">
        {getFieldDecorator<FundFormObj>('ddAddThresholdPercent', {
          initialValue: 10,
        })(
          <InputNumber style={{ width: '100%' }} min={1} max={90} placeholder="例如 10 表示 10%" />
        )}
      </Form.Item>
      <Form.Item {...formItemLayout} label="补仓资金">
        {getFieldDecorator<FundFormObj>('ddAddCashRule', {
          initialValue: 'percentLeft',
        })(
          <Select style={{ width: '100%' }}>
            <Option value="percentLeft">按剩余现金比例</Option>
            <Option value="fixed">固定金额</Option>
          </Select>
        )}
      </Form.Item>
      <Form.Item {...formItemLayout} label="比例/金额">
        <div>
          <span>比例 % 或 固定元： </span>
          {getFieldDecorator<FundFormObj>('ddAddBuyPercent', {
            initialValue: 10,
          })(
            <InputNumber size="small" min={0} max={100} style={{ width: 100 }} placeholder="比例" />
          )}
          <span style={{ margin: '0 8px' }} />
          {getFieldDecorator<FundFormObj>('ddAddBuyAmount', {
            initialValue: 1000,
          })(
            <InputNumber size="small" min={0} style={{ width: 120 }} placeholder="固定金额" />
          )}
        </div>
      </Form.Item>

      <Divider orientation="left" style={{ marginTop: 8 }}>目标仓位补仓（可选）</Divider>
      <Form.Item {...formItemLayout} label="启用">
        {getFieldDecorator<FundFormObj>('tpAddEnabled', {
          valuePropName: 'checked',
          initialValue: false,
        })(
          <Switch checkedChildren="开" unCheckedChildren="关" />
        )}
      </Form.Item>
      <Form.Item {...formItemLayout} label="目标持仓占比 (%)">
        {getFieldDecorator<FundFormObj>('tpAddTargetPercent', {
          initialValue: 60,
        })(
          <InputNumber style={{ width: '100%' }} min={1} max={100} placeholder="低于此占比则补仓" />
        )}
      </Form.Item>
      <Form.Item {...formItemLayout} label="补仓资金">
        {getFieldDecorator<FundFormObj>('tpAddCashRule', {
          initialValue: 'percentLeft',
        })(
          <Select style={{ width: '100%' }}>
            <Option value="percentLeft">按剩余现金比例</Option>
            <Option value="fixed">固定金额</Option>
          </Select>
        )}
      </Form.Item>
      <Form.Item {...formItemLayout} label="比例 / 金额">
        <div>
          <span>比例 % 或 固定元： </span>
          {getFieldDecorator<FundFormObj>('tpAddBuyPercent', {
            initialValue: 15,
          })(
            <InputNumber size="small" min={0} max={100} style={{ width: 100 }} placeholder="比例" />
          )}
          <span style={{ margin: '0 8px' }} />
          {getFieldDecorator<FundFormObj>('tpAddBuyAmount', {
            initialValue: 2000,
          })(
            <InputNumber size="small" min={0} style={{ width: 120 }} placeholder="固定金额" />
          )}
        </div>
      </Form.Item>
    </section>
  }
}



