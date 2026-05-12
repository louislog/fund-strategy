/*
 * Smoke backtest runner (Node/ts-node).
 *
 * `src/utils/common.ts` defines JSONP helpers on `window`, so we must shim `window/document`
 * before importing code that indirectly loads `common.ts`.
 */
declare const global: any;
if (!global.window) {
  global.window = {} as any;
}
global.window['getJSONP'] = global.window['getJSONP'] || {};
global.window['getJSONP'].counter = global.window['getJSONP'].counter || 0;

if (!(global.window as any).document) {
  (global.window as any).document = {
    createElement() {
      return {
        referrerPolicy: '',
        src: '',
        onload: null as any,
        parentNode: {
          removeChild() {},
        },
      };
    },
    body: {
      appendChild() {},
    },
  };
}

import * as fs from 'fs';
import * as path from 'path';

import { FundJson } from './get-fund-data-json';
import { InvestmentStrategy } from '../src/utils/fund-stragegy';
import { FundFormObj } from '../src/pages/components/search-form';
import { txnByMacd, IndexData } from '../src/utils/fund-stragegy/fetch-fund-data';
import { runDailyStrategies } from '../src/utils/fund-stragegy/engine/run-daily-strategies';

function dateFormat(dateInput: any, format = 'yyyy-MM-dd'): string {
  const dateObj = new Date(dateInput);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'June',
    'July',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];
  const [year, month, date] = [dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()];

  const dateMap: Record<string, any> = {
    yyyy: year,
    eM: months[month],
    MM: (month + 1 + '').padStart(2, '0'),
    M: month + 1,
    dd: (date + '').padStart(2, '0'),
    d: date,
  };

  const reg = /eM|yyyy|MM|M|dd|d/g;
  return format.replace(reg, (match) => String(dateMap[match]));
}

function pickDateRangeFromFundJson(fundJson: FundJson): { start: string; end: string } {
  const dates = Object.keys(fundJson.all).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
}

function sliceShanghaiByFundDates(
  fullShanghai: Record<string, IndexData>,
  fundJson: FundJson
): Record<string, IndexData> {
  const out: Record<string, IndexData> = {};
  for (const d of Object.keys(fundJson.all)) {
    if (fullShanghai[d]) {
      out[d] = fullShanghai[d];
    }
  }
  return out;
}

function buildDefaultFundForm(dateRange: [string, string]): FundFormObj {
  return {
    fundId: '260108',
    dateRange,

    period: ['monthly', 1],
    totalAmount: 10000,
    salary: 10000,
    fixedAmount: 1000,
    purchasedFundAmount: 0,

    shCompositeIndex: 3000,
    fundPosition: 70,
    sellAtTop: true,

    sellNum: 10,
    sellUnit: 'fundPercent',
    profitRate: 5,

    referIndex: '1.000001',
    buyMacdPoint: 100,
    sellMacdPoint: 100,
    buyAmountPercent: 20,
  } as any as FundFormObj;
}

async function main() {
  const fundJsonPath = path.resolve(__dirname, '../src/utils/fund-stragegy/static/景顺长城新兴成长混合260108.json');
  const shanghaiPath = path.resolve(__dirname, '../src/utils/fund-stragegy/static/shanghai.json');

  const fundJson: FundJson = JSON.parse(fs.readFileSync(fundJsonPath, 'utf8'));
  const fullShanghai = JSON.parse(fs.readFileSync(shanghaiPath, 'utf8')) as Record<string, IndexData>;

  const { start, end } = pickDateRangeFromFundJson(fundJson);
  const formData = buildDefaultFundForm([start, end]);

  const szData = sliceShanghaiByFundDates(fullShanghai, fundJson);
  const referIndexData = szData;

  txnByMacd(Object.values(referIndexData), formData.sellMacdPoint / 100, formData.buyMacdPoint / 100);

  const investment = new InvestmentStrategy({
    totalAmount: formData.totalAmount + formData.purchasedFundAmount,
    salary: formData.salary,
    shangZhengData: szData,
    indexData: referIndexData,
    stop: {
      rate: 0.05,
      minAmount: 50000,
    },
    tInvest: {
      rate: 0.05,
      amount: 1000,
    },
    fundJson,
    onEachDay(this: InvestmentStrategy, curDate: number) {
      const dateStr = dateFormat(curDate);
      const latestInvestment = this.latestInvestment;
      const curSzIndex = this.getFundByDate(dateStr, { origin: szData });
      const curReferIndex = (referIndexData[dateStr] || {}) as any as IndexData;

      runDailyStrategies(this, {
        fundId: formData.fundId,
        date: dateStr,
        latestInvestment,
        curSzIndex,
        curReferIndex,
        formData,
      });
    },
  });

  investment
    .buy(formData.purchasedFundAmount, formData.dateRange[0])
    .fixedInvest({
      fixedInvestment: {
        period: formData.period[0],
        amount: formData.fixedAmount,
        dateOrWeek: formData.period[1],
      },
      range: [dateFormat(formData.dateRange[0]), dateFormat(formData.dateRange[1])],
    });

  const last = investment.data[investment.data.length - 1];
  // eslint-disable-next-line no-console
  console.log('[sprint1-static-backtest] points:', investment.data.length);
  // eslint-disable-next-line no-console
  console.log('[sprint1-static-backtest] last snapshot:', {
    date: last.date,
    totalAmount: last.totalAmount,
    leftAmount: last.leftAmount,
    fundAmount: last.fundAmount,
    totalProfitRate: last.totalProfitRate,
  });
  // eslint-disable-next-line no-console
  console.log('[sprint1-static-backtest] transactions:', investment.transactions.length);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
