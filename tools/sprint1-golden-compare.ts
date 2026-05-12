/**
 * Sprint 1 黄金一致性：legacy（旧页面 onEachDay 的止盈 if + MACD 补仓 if）
 * vs modern（runDailyStrategies + executeActions）。
 *
 * 运行（需先于业务代码挂载 window shim）：
 *
 * ```
 * node -r ./tools/node-fund-polyfill.cjs ./node_modules/.bin/ts-node -r tsconfig-paths/register tools/sprint1-golden-compare.ts
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

import { FundJson } from './get-fund-data-json';
import { InvestmentStrategy, InvestDateSnapshot } from '../src/utils/fund-stragegy';
import { FundFormObj } from '../src/pages/components/search-form';
import { calcMACD, txnByMacd, IndexData } from '../src/utils/fund-stragegy/fetch-fund-data';
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

function roundToFix(num: number, digits = 2) {
  const powNum = Math.pow(10, digits);
  return Number((Math.round(Number(num) * powNum) / powNum).toFixed(digits));
}

/** 与线上逻辑一致：`calcMACD` 后对全量上证指数序列按时间 txnByMacd，再按需切片到基金交易日 */
function attachMacdSignals(fullShanghai: Record<string, IndexData>, fundJson: FundJson, formData: FundFormObj) {
  const full = JSON.parse(JSON.stringify(fullShanghai)) as Record<string, IndexData>;
  calcMACD(full);
  const sortedList = Object.keys(full)
    .sort()
    .map((d) => full[d]);
  txnByMacd(sortedList, formData.sellMacdPoint / 100, formData.buyMacdPoint / 100);

  const fundDates = Object.keys(fundJson.all).sort();
  const szData: Record<string, IndexData> = {};
  const referIndexData: Record<string, IndexData> = {};
  for (const d of fundDates) {
    if (!full[d]) continue;
    szData[d] = full[d];
    referIndexData[d] = full[d];
  }
  return { szData, referIndexData };
}

function buildStrategy(
  mode: 'legacy' | 'modern',
  fundJson: FundJson,
  formData: FundFormObj,
  szData: Record<string, IndexData>,
  referIndexData: Record<string, IndexData>
): InvestmentStrategy {
  return new InvestmentStrategy({
    totalAmount: formData.totalAmount + formData.purchasedFundAmount,
    salary: formData.salary,
    shangZhengData: szData,
    indexData: referIndexData,
    stop: { rate: 0.05, minAmount: 50000 },
    tInvest: { rate: 0.05, amount: 1000 },
    fundJson,
    onEachDay(this: InvestmentStrategy, curDate: number) {
      const dateStr = dateFormat(curDate);
      const latestInvestment = this.latestInvestment;
      const curSzIndex = this.getFundByDate(dateStr, {
        origin: szData,
      });
      const curReferIndex = (referIndexData[dateStr] || {}) as IndexData;

      if (mode === 'legacy') {
        const level = roundToFix(latestInvestment.fundAmount / latestInvestment.totalAmount, 2);
        if (
          level > formData.fundPosition / 100 &&
          curSzIndex.val > formData.shCompositeIndex &&
          (!formData.sellAtTop ||
            latestInvestment.maxAccumulatedProfit.date === latestInvestment.date) &&
          (!formData.sellMacdPoint || curReferIndex.txnType === 'sell') &&
          latestInvestment.profitRate > (formData.profitRate / 100 || -100)
        ) {
          const sellAmount =
            formData.sellUnit === 'amount'
              ? formData.sellNum
              : (formData.sellNum / 100) * latestInvestment.fundAmount;
          const normalized = formData.sellUnit === 'amount' ? Number(sellAmount) : Number(sellAmount.toFixed(2));
          this.sell(normalized, dateStr);
        }

        if (formData.buyMacdPoint && curReferIndex.txnType === 'buy') {
          const buyAmount =
            formData.buyAmountPercent <= 100
              ? Math.round((latestInvestment.leftAmount * formData.buyAmountPercent) / 100)
              : formData.buyAmountPercent;
          this.buy(buyAmount, dateStr);
        }
        return;
      }

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
}

function maxAbsDiff(a: number, b: number) {
  return Math.abs(a - b);
}

function compareSnapshots(legacy: InvestDateSnapshot[], modern: InvestDateSnapshot[]) {
  if (legacy.length !== modern.length) {
    return {
      ok: false,
      message: `length mismatch legacy=${legacy.length} modern=${modern.length}`,
      maxMoneyDiff: Number.POSITIVE_INFINITY,
      worstDate: '',
    };
  }

  const fields: (keyof InvestDateSnapshot | 'totalAmount' | 'leftAmount')[] = [
    'totalAmount',
    'leftAmount',
    'fundAmount',
    'portion',
    'cost',
    'profitRate',
    'accumulatedProfit',
    'dateBuyAmount',
    'dateSellAmount',
    'totalProfitRate',
  ];

  let worstMoney = 0;
  let worstDate = '';

  const moneyTol = 0.03;
  const rateTol = 0.0002;

  for (let i = 0; i < legacy.length; i++) {
    const L = legacy[i] as any;
    const M = modern[i] as any;
    if (L.date !== M.date) {
      return {
        ok: false,
        message: `date mismatch idx=${i} legacy=${L.date} modern=${M.date}`,
        maxMoneyDiff: Number.POSITIVE_INFINITY,
        worstDate: L.date,
      };
    }

    for (const f of fields) {
      const lv = Number(L[f]);
      const mv = Number(M[f]);
      if (Number.isNaN(lv) || Number.isNaN(mv)) continue;
      const d = Math.abs(lv - mv);
      const tol = ['profitRate', 'totalProfitRate', 'fundGrowthRate'].includes(String(f)) ? rateTol : moneyTol;
      if (d > tol) {
        return {
          ok: false,
          message: `field ${String(f)} at ${L.date}: legacy=${lv} modern=${mv} diff=${d} (tol=${tol})`,
          maxMoneyDiff: d,
          worstDate: L.date,
        };
      }
      if (['totalAmount', 'leftAmount', 'fundAmount'].includes(String(f))) {
        if (d > worstMoney) {
          worstMoney = d;
          worstDate = L.date;
        }
      }
    }
  }

  return { ok: true, message: 'all snapshots within tolerance', maxMoneyDiff: worstMoney, worstDate };
}

async function main() {
  const fundJsonPath = path.resolve(__dirname, '../src/utils/fund-stragegy/static/景顺长城新兴成长混合260108.json');
  const shanghaiPath = path.resolve(__dirname, '../src/utils/fund-stragegy/static/shanghai.json');

  const fundJson: FundJson = JSON.parse(fs.readFileSync(fundJsonPath, 'utf8'));
  const fullShanghai = JSON.parse(fs.readFileSync(shanghaiPath, 'utf8')) as Record<string, IndexData>;

  const dates = Object.keys(fundJson.all).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];

  const formData = {
    fundId: '260108',
    dateRange: [start, end],
    period: ['monthly', 1],
    totalAmount: 10000,
    salary: 10000,
    fixedAmount: 1000,
    purchasedFundAmount: 0,
    /** 压低门槛，易于触发止盈 / MACD 信号（一致性验证用） */
    shCompositeIndex: 0,
    fundPosition: 0,
    sellAtTop: false,
    sellNum: 5,
    sellUnit: 'fundPercent',
    profitRate: 0,
    referIndex: '1.000001',
    /** 0 表示不强制参考指数 MACD 卖点（与表单未填行为一致） */
    sellMacdPoint: 0,
    buyMacdPoint: 50,
    buyAmountPercent: 20,
  } as any as FundFormObj;

  const { szData, referIndexData } = attachMacdSignals(fullShanghai, fundJson, formData);

  const legacyInv = buildStrategy('legacy', fundJson, formData, szData, referIndexData);
  legacyInv
    .buy(formData.purchasedFundAmount, formData.dateRange[0])
    .fixedInvest({
      fixedInvestment: {
        period: formData.period[0],
        amount: formData.fixedAmount,
        dateOrWeek: formData.period[1],
      },
      range: [dateFormat(formData.dateRange[0]), dateFormat(formData.dateRange[1])],
    });

  const modernInv = buildStrategy('modern', fundJson, formData, szData, referIndexData);
  modernInv
    .buy(formData.purchasedFundAmount, formData.dateRange[0])
    .fixedInvest({
      fixedInvestment: {
        period: formData.period[0],
        amount: formData.fixedAmount,
        dateOrWeek: formData.period[1],
      },
      range: [dateFormat(formData.dateRange[0]), dateFormat(formData.dateRange[1])],
    });

  const cmp = compareSnapshots(legacyInv.data, modernInv.data);

  let legacyTxDays = 0;
  let modernTxDays = 0;
  for (const s of legacyInv.data) {
    if (s.dateBuyAmount > 0 || s.dateSellAmount > 0) legacyTxDays++;
  }
  for (const s of modernInv.data) {
    if (s.dateBuyAmount > 0 || s.dateSellAmount > 0) modernTxDays++;
  }

  // eslint-disable-next-line no-console
  console.log('[sprint1-golden-compare] range', start, '->', end);
  // eslint-disable-next-line no-console
  console.log('[sprint1-golden-compare] points', legacyInv.data.length);
  // eslint-disable-next-line no-console
  console.log('[sprint1-golden-compare] tx days (legacy/modern)', legacyTxDays, modernTxDays);
  // eslint-disable-next-line no-console
  console.log('[sprint1-golden-compare] modern.transactions', modernInv.transactions.length);
  // eslint-disable-next-line no-console
  console.log('[sprint1-golden-compare] result', cmp);

  if (!cmp.ok) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});
