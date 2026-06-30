import { NextRequest, NextResponse } from "next/server";
import {
  calculateHcroi,
  calculateLaborCostRevenueRatio,
  calculateLaborIncomeShare,
  formatMetricValue,
  metricDescriptions,
  metricValueForApi
} from "@/lib/payraise-metrics";

type PayraiseDashboardRecord = {
  year: number;
  revenue: number;
  operatingProfit: number;
  totalLaborCost: number;
  addedValue: number | null;
  employeeCount: number;
  averageWage: number;
  hcRoi: number;
  minimumWage: number;
  medianIncome: number;
  industryFixedPay: number;
  industryOvertimePay: number;
  industryBonusPay: number;
  wageInfoAmount: number;
  agreementIncreaseRate: number;
  unionDemandRate: number;
};

const dashboardRecords: PayraiseDashboardRecord[] = [
  {
    year: 2025,
    revenue: 5860000000,
    operatingProfit: 342000000,
    totalLaborCost: 3180000000,
    addedValue: 4700000000,
    employeeCount: 52,
    averageWage: 61200000,
    hcRoi: 1.93,
    minimumWage: 10030,
    medianIncome: 40200000,
    industryFixedPay: 64700000,
    industryOvertimePay: 7600000,
    industryBonusPay: 6100000,
    wageInfoAmount: 68200000,
    agreementIncreaseRate: 5.0,
    unionDemandRate: 8.4
  },
  {
    year: 2026,
    revenue: 10000000000,
    operatingProfit: 600000000,
    totalLaborCost: 1500000000,
    addedValue: 5000000000,
    employeeCount: 55,
    averageWage: 62000000,
    hcRoi: 2.01,
    minimumWage: 10480,
    medianIncome: 42100000,
    industryFixedPay: 67300000,
    industryOvertimePay: 7900000,
    industryBonusPay: 6500000,
    wageInfoAmount: 70600000,
    agreementIncreaseRate: 5.4,
    unionDemandRate: 8.8
  }
];

const otSummary = [
  { yearMonth: "2026-01", employeeCount: 13, totalOtHours: 236 },
  { yearMonth: "2026-01", employeeCount: 18, totalOtHours: 308 },
  { yearMonth: "2026-01", employeeCount: 10, totalOtHours: 154 },
  { yearMonth: "2026-02", employeeCount: 13, totalOtHours: 210 },
  { yearMonth: "2026-02", employeeCount: 18, totalOtHours: 326 },
  { yearMonth: "2026-02", employeeCount: 10, totalOtHours: 171 },
  { yearMonth: "2026-03", employeeCount: 14, totalOtHours: 252 },
  { yearMonth: "2026-03", employeeCount: 19, totalOtHours: 342 },
  { yearMonth: "2026-03", employeeCount: 10, totalOtHours: 180 }
];

export function GET(request: NextRequest) {
  const requestedYear = Number(request.nextUrl.searchParams.get("year") ?? 2026);
  const current = dashboardRecords.find((item) => item.year === requestedYear);

  if (!current) {
    return NextResponse.json(
      {
        error: "데이터 없음",
        message: `${requestedYear}년 회사 재무지표가 없습니다. 샘플값으로 대체하지 않습니다.`
      },
      { status: 404 }
    );
  }

  const currentOt = otSummary.filter((item) => item.yearMonth.startsWith(String(requestedYear)));
  const totalOtEmployees = currentOt.reduce((sum, item) => sum + item.employeeCount, 0);
  const totalOtHours = currentOt.reduce((sum, item) => sum + item.totalOtHours, 0);
  const calculationInput = {
    revenue: current.revenue,
    laborCost: current.totalLaborCost,
    valueAdded: current.addedValue,
    operatingProfit: current.operatingProfit
  };
  const laborCostRevenueRatio = calculateLaborCostRevenueRatio(calculationInput);
  const laborIncomeShare = calculateLaborIncomeShare(calculationInput);
  const hcroi = calculateHcroi(calculationInput);

  return NextResponse.json({
    inputData: current,
    kpis: {
      revenue: current.revenue,
      operatingProfit: current.operatingProfit,
      operatingProfitRate: roundTo((current.operatingProfit / current.revenue) * 100, 1),
      laborCost: current.totalLaborCost,
      laborCostRevenueRatio: metricValueForApi(laborCostRevenueRatio),
      laborCostPerEmployee: current.employeeCount > 0 ? Math.round(current.totalLaborCost / current.employeeCount) : null,
      valueAdded: current.addedValue,
      laborIncomeShare: metricValueForApi(laborIncomeShare),
      hcroi: metricValueForApi(hcroi),
      marketPayRatio: current.industryFixedPay > 0 ? roundTo((current.averageWage / current.industryFixedPay) * 100, 1) : null,
      avgOtHours: totalOtEmployees > 0 ? roundTo(totalOtHours / totalOtEmployees, 1) : null
    },
    displayValues: {
      laborCostRevenueRatio: formatMetricValue(laborCostRevenueRatio),
      laborIncomeShare: formatMetricValue(laborIncomeShare),
      hcroi: formatMetricValue(hcroi)
    },
    dataStatus: {
      laborCostRevenueRatio: laborCostRevenueRatio.status,
      laborIncomeShare: laborIncomeShare.status,
      hcroi: hcroi.status
    },
    unavailableReasons: {
      laborCostRevenueRatio: laborCostRevenueRatio.reason ?? null,
      laborIncomeShare: laborIncomeShare.reason ?? null,
      hcroi: hcroi.reason ?? null
    },
    formulaDescriptions: {
      laborCostRevenueRatio: metricDescriptions.laborCostRevenueRatio.formula,
      laborIncomeShare: metricDescriptions.laborIncomeShare.formula,
      hcroi: metricDescriptions.hcroi.formula
    },
    interpretation: {
      laborCostRevenueRatio: laborCostRevenueRatio.pdfText,
      laborIncomeShare: laborIncomeShare.pdfText,
      hcroi: hcroi.pdfText
    }
  });
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
