import { NextRequest, NextResponse } from "next/server";
import {
  calculateHcroi,
  calculateLaborCostRevenueRatio,
  calculateLaborIncomeShare,
  formatMetricValue,
  metricDescriptions,
  metricValueForApi
} from "@/lib/payraise-metrics";

type CompanyFinancial = {
  year: number;
  revenue: number;
  operatingProfit: number;
  laborCost: number;
  valueAdded: number | null;
  employeeCount: number;
  averageSalary: number;
};

const companyFinancials: CompanyFinancial[] = [
  { year: 2025, revenue: 5860000000, operatingProfit: 342000000, laborCost: 3180000000, valueAdded: 4700000000, employeeCount: 52, averageSalary: 61200000 },
  { year: 2026, revenue: 10000000000, operatingProfit: 6000000000, laborCost: 1500000000, valueAdded: 5000000000, employeeCount: 55, averageSalary: 62000000 }
];

const publicIndices = [
  { year: 2026, industryRegularPay: 67300000 }
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
  const current = companyFinancials.find((item) => item.year === requestedYear);

  if (!current) {
    return NextResponse.json(
      {
        error: "데이터 없음",
        message: `${requestedYear}년 회사 재무지표가 없습니다. 샘플값으로 대체하지 않습니다.`
      },
      { status: 404 }
    );
  }

  const publicIndex = publicIndices.find((item) => item.year === requestedYear);
  const currentOt = otSummary.filter((item) => item.yearMonth.startsWith(String(requestedYear)));
  const totalOtEmployees = currentOt.reduce((sum, item) => sum + item.employeeCount, 0);
  const totalOtHours = currentOt.reduce((sum, item) => sum + item.totalOtHours, 0);
  const laborCostRevenueRatio = calculateLaborCostRevenueRatio(current);
  const laborIncomeShare = calculateLaborIncomeShare(current);
  const hcroi = calculateHcroi(current);

  return NextResponse.json({
    kpis: {
      revenue: current.revenue,
      operatingProfit: current.operatingProfit,
      operatingProfitRate: roundTo((current.operatingProfit / current.revenue) * 100, 1),
      laborCost: current.laborCost,
      laborCostRevenueRatio: metricValueForApi(laborCostRevenueRatio),
      laborCostPerEmployee: current.employeeCount > 0 ? Math.round(current.laborCost / current.employeeCount) : null,
      valueAdded: current.valueAdded,
      laborIncomeShare: metricValueForApi(laborIncomeShare),
      hcroi: metricValueForApi(hcroi),
      marketPayRatio: publicIndex ? roundTo((current.averageSalary / publicIndex.industryRegularPay) * 100, 1) : null,
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
