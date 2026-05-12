import React, { Component } from 'react'
import { AmountProp } from './total-amount'
import Slider from "bizcharts-plugin-slider";
import DataSet from "@antv/data-set";
import { dateFormat } from '@/utils/common';


export interface SliderChartProp {
  y: string
  data: any[]
  children?: React.ReactNode
}

export class SliderChart extends Component<SliderChartProp> {

  ds = new DataSet({
    state: {
      start: dateFormat(Date.now() - 365 * 24 * 3600 * 1000),
      end: dateFormat(Date.now())
    }
  });

  sliderTimeChange = (obj: {startText: string,endText: string})=>{
    const { startText, endText } = obj;
    this.ds.setState("start", startText);
    this.ds.setState("end", endText);
  }
  
  render() {
    let { children, ...chartProp } = this.props
    let { data: sourceData, y } = chartProp
    if(!(sourceData && sourceData[0])) {
      return null
    }
    
    const ds = this.ds
    this.sliderTimeChange({
      startText: sourceData[0].date,
      endText:  sourceData[sourceData.length - 1].date
    })

    // 数据格式化
    const dv = ds.createView();
    dv.source(sourceData)
      .transform({
        // 过滤出 slider 的时间范围的数据
        type: "filter",
        callback: obj => {
          const date = obj.date;
          return date <= ds.state.end && date >= ds.state.start;
        }
      })

    const filteredData = dv as any
    const childrenWithProps = React.Children.map(this.props.children,
      (child) => React.cloneElement(child as any, {
        ...chartProp,
        data: filteredData
      } ));

    return <div>
      {childrenWithProps}
      <div>
        <Slider
          padding={[20, 40, 20, 40]}
          width="auto"
          height={26}
          start={ds.state.start}
          end={ds.state.end}
          xAxis="date"
          yAxis={y}
          scales={{
            time: {
              type: "timeCat",
            }
          }}
          data={filteredData}
          onChange={this.sliderTimeChange}
        />
      </div>
    </div>
  }
}