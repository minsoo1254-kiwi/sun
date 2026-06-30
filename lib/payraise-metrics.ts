export type DataStatus = "입력 데이터 기준" | "계산값" | "샘플 데이터" | "데이터 없음" | "계산 불가";

export type MetricKind = "percentage" | "ratio";

export type MetricResult = {
  value: number | null;
  status: DataStatus;
  formula: string;
  source: string;
  interpretation: string;
  pdfText: string;
  kind: MetricKind;
  reason?: string;
  note?: string;
};

export type PayraiseFinancialInput = {
  revenue?: number | null;
  operatingProfit?: number | null;
  laborCost?: number | null;
  valueAdded?: number | null;
};

const NO_DATA = "데이터 없음";
const NOT_CALCULABLE = "계산 불가";

export const metricDescriptions = {
  laborCostRevenueRatio: {
    formula: "(총 인건비 / 매출액) × 100",
    source: "회사 재무지표: labor_cost, revenue",
    interpretation:
      "인건비가 매출액에서 차지하는 비율입니다. 비율이 높을수록 매출 대비 인건비 부담이 크다는 뜻이므로, 경쟁사나 산업 평균과 비교해 지출 수준을 평가해야 합니다.",
    pdfText:
      "인건비 대 매출액 비율은 총 인건비가 매출액에서 차지하는 비중입니다. 해당 비율이 높을수록 매출 대비 인건비 부담이 크다는 의미이며, 경쟁사 또는 산업 평균과 비교해 우리 회사의 인건비 지출 수준을 평가할 수 있습니다."
  },
  laborIncomeShare: {
    formula: "(총 인건비 / 부가가치) × 100",
    source: "회사 재무지표: labor_cost, value_added",
    interpretation:
      "기업이 창출한 부가가치 중 근로자에게 임금으로 배분된 비율입니다. 산업 평균 대비 수준을 보면 임금인상 여력과 생산성 개선 필요성을 함께 판단할 수 있습니다.",
    pdfText:
      "노동소득분배율은 기업이 창출한 부가가치 중 근로자에게 임금으로 배분한 비율입니다. 산업 평균과 비교해 성과 공유 수준을 확인하고, 비율이 과도하게 높을 경우 생산성 개선과 수익성 관리가 병행되어야 합니다."
  },
  hcroi: {
    formula: "(총 인건비 + 영업이익) / 총 인건비",
    source: "회사 재무지표: labor_cost, operating_profit",
    interpretation:
      "인적자본에 대한 투자 대비 성과를 평가하는 지표입니다. 값이 높을수록 인건비 투입 대비 성과가 크다는 의미이며, 임금인상과 생산성 개선의 균형을 검토하는 데 사용할 수 있습니다.",
    pdfText:
      "HCROI는 인적자본투자수익률로, 총 인건비와 영업이익을 기준으로 인적자본 투자 대비 성과를 확인하는 지표입니다. 인건비를 단순 비용이 아닌 투자 관점에서 바라보게 하며, 임금인상과 생산성 개선 간 균형을 검토하는 데 활용할 수 있습니다."
  }
} as const;

export function calculateLaborCostRevenueRatio(input: PayraiseFinancialInput): MetricResult {
  const base = metricDescriptions.laborCostRevenueRatio;

  if (input.laborCost === null || input.laborCost === undefined) {
    return unavailableMetric(base, "percentage", NO_DATA, "총 인건비 데이터가 없습니다.");
  }

  if (input.revenue === null || input.revenue === undefined || input.revenue === 0) {
    return unavailableMetric(base, "percentage", NOT_CALCULABLE, "매출액이 0이거나 없습니다.");
  }

  return {
    ...base,
    kind: "percentage",
    status: "계산값",
    value: roundTo((input.laborCost / input.revenue) * 100, 1)
  };
}

export function calculateLaborIncomeShare(input: PayraiseFinancialInput): MetricResult {
  const base = metricDescriptions.laborIncomeShare;

  if (input.laborCost === null || input.laborCost === undefined) {
    return unavailableMetric(base, "percentage", NO_DATA, "총 인건비 데이터가 없습니다.");
  }

  if (input.valueAdded === null || input.valueAdded === undefined || input.valueAdded === 0) {
    return unavailableMetric(base, "percentage", NOT_CALCULABLE, "부가가치가 0이거나 없습니다.");
  }

  return {
    ...base,
    kind: "percentage",
    status: "계산값",
    value: roundTo((input.laborCost / input.valueAdded) * 100, 1)
  };
}

export function calculateHcroi(input: PayraiseFinancialInput): MetricResult {
  const base = metricDescriptions.hcroi;

  if (input.laborCost === null || input.laborCost === undefined || input.laborCost === 0) {
    return unavailableMetric(base, "ratio", NOT_CALCULABLE, "총 인건비가 0이거나 없습니다.");
  }

  if (input.operatingProfit === null || input.operatingProfit === undefined) {
    return unavailableMetric(base, "ratio", NO_DATA, "영업이익 데이터가 없습니다.");
  }

  return {
    ...base,
    kind: "ratio",
    status: "계산값",
    value: roundTo((input.laborCost + input.operatingProfit) / input.laborCost, 2),
    note: input.operatingProfit < 0 ? "영업손실이 반영된 값입니다." : undefined
  };
}

export function formatMetricValue(metric: MetricResult) {
  if (metric.value === null) {
    return metric.status;
  }

  if (metric.kind === "percentage") {
    return `${metric.value.toFixed(1)}%`;
  }

  return metric.value.toFixed(2);
}

export function metricValueForApi(metric: MetricResult) {
  return metric.value;
}

export function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function unavailableMetric(
  base: (typeof metricDescriptions)[keyof typeof metricDescriptions],
  kind: MetricKind,
  status: DataStatus,
  reason: string
): MetricResult {
  return {
    ...base,
    kind,
    status,
    value: null,
    reason
  };
}
