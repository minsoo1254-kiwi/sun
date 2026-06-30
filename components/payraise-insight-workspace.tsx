"use client";

import {
  AlertTriangle,
  BarChart3,
  Check,
  ClipboardList,
  Download,
  FileText,
  Lock,
  Scale,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import {
  calculateHcroi,
  calculateLaborCostRevenueRatio,
  calculateLaborIncomeShare,
  formatMetricValue,
  type MetricResult
} from "@/lib/payraise-metrics";

type Role = "hr_staff" | "hr_admin" | "executive" | "developer" | "no_access";
type View = "dashboard" | "data" | "reports" | "admin";

type CompanyFinancial = {
  year: number;
  revenue: number;
  operatingProfit: number;
  laborCost: number;
  valueAdded: number | null;
  employeeCount: number;
  averageSalary: number;
  hcRoi: number;
};

type PublicIndex = {
  year: number;
  minimumWage: number;
  medianIncome: number;
  industryRegularPay: number;
  industryOvertimePay: number;
  industrySpecialPay: number;
  wageJobInfoAmount: number;
  agreedWageIncreaseRate: number;
  unionDemandRate: number;
  sourceName: string;
};

type Competitor = {
  companyName: string;
  year: number;
  revenue: number;
  operatingProfit: number;
  laborCost: number;
  employeeCount: number;
  averageTenure: number;
  averageSalary: number;
  sourceFileName: string;
};

type OtSummary = {
  yearMonth: string;
  department: string;
  jobGroup: string;
  employeeCount: number;
  totalOtHours: number;
  nightHours: number;
  holidayHours: number;
  unapprovedOtHours: number;
  over12hCount: number;
};

type AuditLog = {
  actionType: string;
  resourceType: string;
  actor: string;
  detail: string;
  createdAt: string;
};

const roleLabels: Record<Role, string> = {
  hr_staff: "HR 담당자",
  hr_admin: "HR 관리자",
  executive: "임원",
  developer: "개발자",
  no_access: "미승인"
};

const roleDescriptions: Record<Role, string> = {
  hr_staff: "데이터 입력과 대시보드 조회 가능",
  hr_admin: "전체 관리, 보고서 생성, 사용자 권한 관리 가능",
  executive: "대시보드와 임원용 보고서 조회 가능",
  developer: "운영 데이터 접근 불가",
  no_access: "승인 전 접근 차단"
};

const roles: Role[] = ["hr_admin", "hr_staff", "executive", "developer", "no_access"];

const initialCompanyFinancials: CompanyFinancial[] = [
  { year: 2022, revenue: 4820000000, operatingProfit: 250000000, laborCost: 2380000000, valueAdded: 3600000000, employeeCount: 44, averageSalary: 54100000, hcRoi: 1.77 },
  { year: 2023, revenue: 5150000000, operatingProfit: 286000000, laborCost: 2630000000, valueAdded: 3900000000, employeeCount: 47, averageSalary: 56000000, hcRoi: 1.85 },
  { year: 2024, revenue: 5480000000, operatingProfit: 312000000, laborCost: 2890000000, valueAdded: 4300000000, employeeCount: 49, averageSalary: 59000000, hcRoi: 1.9 },
  { year: 2025, revenue: 5860000000, operatingProfit: 342000000, laborCost: 3180000000, valueAdded: 4700000000, employeeCount: 52, averageSalary: 61200000, hcRoi: 1.93 },
  { year: 2026, revenue: 6240000000, operatingProfit: 388000000, laborCost: 3410000000, valueAdded: 5000000000, employeeCount: 55, averageSalary: 62000000, hcRoi: 2.01 }
];

const initialPublicIndices: PublicIndex[] = [
  { year: 2022, minimumWage: 9160, medianIncome: 35700000, industryRegularPay: 57500000, industryOvertimePay: 6800000, industrySpecialPay: 5200000, wageJobInfoAmount: 60200000, agreedWageIncreaseRate: 4.7, unionDemandRate: 7.2, sourceName: "고용노동 통계" },
  { year: 2023, minimumWage: 9620, medianIncome: 37400000, industryRegularPay: 59600000, industryOvertimePay: 7100000, industrySpecialPay: 5500000, wageJobInfoAmount: 62900000, agreedWageIncreaseRate: 4.9, unionDemandRate: 7.8, sourceName: "임금직무정보" },
  { year: 2024, minimumWage: 9860, medianIncome: 38900000, industryRegularPay: 62100000, industryOvertimePay: 7300000, industrySpecialPay: 5700000, wageJobInfoAmount: 65100000, agreedWageIncreaseRate: 5.2, unionDemandRate: 8.1, sourceName: "사업체노동력조사" },
  { year: 2025, minimumWage: 10030, medianIncome: 40200000, industryRegularPay: 64700000, industryOvertimePay: 7600000, industrySpecialPay: 6100000, wageJobInfoAmount: 68200000, agreedWageIncreaseRate: 5.0, unionDemandRate: 8.4, sourceName: "노사협약 통계" },
  { year: 2026, minimumWage: 10480, medianIncome: 42100000, industryRegularPay: 67300000, industryOvertimePay: 7900000, industrySpecialPay: 6500000, wageJobInfoAmount: 70600000, agreedWageIncreaseRate: 5.4, unionDemandRate: 8.8, sourceName: "통합 기준" }
];

const initialCompetitors: Competitor[] = [
  { companyName: "A테크", year: 2026, revenue: 7920000000, operatingProfit: 505000000, laborCost: 4010000000, employeeCount: 62, averageTenure: 6.3, averageSalary: 64700000, sourceFileName: "a-tech-2026.pdf" },
  { companyName: "B솔루션", year: 2026, revenue: 5480000000, operatingProfit: 260000000, laborCost: 3100000000, employeeCount: 51, averageTenure: 5.1, averageSalary: 60800000, sourceFileName: "b-solution-2026.pdf" },
  { companyName: "C서비스", year: 2026, revenue: 6810000000, operatingProfit: 372000000, laborCost: 3520000000, employeeCount: 57, averageTenure: 5.8, averageSalary: 61700000, sourceFileName: "c-service-2026.pdf" }
];

const initialOtSummary: OtSummary[] = [
  { yearMonth: "2026-01", department: "영업", jobGroup: "Sales", employeeCount: 13, totalOtHours: 236, nightHours: 38, holidayHours: 18, unapprovedOtHours: 10, over12hCount: 2 },
  { yearMonth: "2026-01", department: "개발", jobGroup: "Engineer", employeeCount: 18, totalOtHours: 308, nightHours: 42, holidayHours: 26, unapprovedOtHours: 16, over12hCount: 4 },
  { yearMonth: "2026-01", department: "운영", jobGroup: "Ops", employeeCount: 10, totalOtHours: 154, nightHours: 22, holidayHours: 10, unapprovedOtHours: 7, over12hCount: 1 },
  { yearMonth: "2026-02", department: "영업", jobGroup: "Sales", employeeCount: 13, totalOtHours: 210, nightHours: 30, holidayHours: 15, unapprovedOtHours: 8, over12hCount: 1 },
  { yearMonth: "2026-02", department: "개발", jobGroup: "Engineer", employeeCount: 18, totalOtHours: 326, nightHours: 50, holidayHours: 29, unapprovedOtHours: 13, over12hCount: 3 },
  { yearMonth: "2026-02", department: "운영", jobGroup: "Ops", employeeCount: 10, totalOtHours: 171, nightHours: 26, holidayHours: 12, unapprovedOtHours: 5, over12hCount: 1 },
  { yearMonth: "2026-03", department: "영업", jobGroup: "Sales", employeeCount: 14, totalOtHours: 252, nightHours: 36, holidayHours: 20, unapprovedOtHours: 11, over12hCount: 2 },
  { yearMonth: "2026-03", department: "개발", jobGroup: "Engineer", employeeCount: 19, totalOtHours: 342, nightHours: 56, holidayHours: 34, unapprovedOtHours: 18, over12hCount: 5 },
  { yearMonth: "2026-03", department: "운영", jobGroup: "Ops", employeeCount: 10, totalOtHours: 180, nightHours: 27, holidayHours: 13, unapprovedOtHours: 6, over12hCount: 1 }
];

const initialLogs: AuditLog[] = [
  { actionType: "login", resourceType: "auth", actor: "admin@company.com", detail: "Google OAuth 로그인", createdAt: "2026-06-30 09:10" },
  { actionType: "view", resourceType: "dashboard", actor: "executive@company.com", detail: "2026년 대시보드 조회", createdAt: "2026-06-30 09:35" },
  { actionType: "upload", resourceType: "file", actor: "hr@company.com", detail: "OT CSV 업로드", createdAt: "2026-06-30 10:15" },
  { actionType: "download", resourceType: "report", actor: "executive@company.com", detail: "임원용 PDF 보고서 다운로드", createdAt: "2026-06-30 11:05" }
];

const currencyFormatter = new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 });

const requiredCsvColumns = [
  "year_month",
  "department",
  "job_group",
  "employee_count",
  "total_ot_hours",
  "night_hours",
  "holiday_hours",
  "unapproved_ot_hours",
  "over_12h_count"
];

export default function PayRaiseInsightWorkspace() {
  const [role, setRole] = useState<Role>("hr_admin");
  const [view, setView] = useState<View>("dashboard");
  const [year, setYear] = useState(2026);
  const [companyFinancials, setCompanyFinancials] = useState(initialCompanyFinancials);
  const [publicIndices, setPublicIndices] = useState(initialPublicIndices);
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [otSummary, setOtSummary] = useState(initialOtSummary);
  const [logs, setLogs] = useState(initialLogs);
  const [csvMessage, setCsvMessage] = useState("샘플 CSV 또는 실제 OT 집계 CSV를 업로드해 검증할 수 있습니다.");
  const [selectedCharts, setSelectedCharts] = useState<string[]>([
    "financialTrend",
    "laborCostRatioTrend",
    "marketPayComparison",
    "competitorComparison",
    "departmentOt",
    "monthlyOtTrend"
  ]);

  const permissions = getPermissions(role);
  const availableYears = Array.from(new Set(companyFinancials.map((item) => item.year))).sort((a, b) => b - a);

  const dashboard = useMemo(() => {
    return buildDashboard(year, companyFinancials, publicIndices, competitors, otSummary);
  }, [year, companyFinancials, publicIndices, competitors, otSummary]);

  function appendLog(actionType: string, resourceType: string, detail: string) {
    setLogs((current) => [
      {
        actionType,
        resourceType,
        actor: `${role}@demo.local`,
        detail,
        createdAt: new Date().toLocaleString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })
      },
      ...current
    ]);
  }

  function handleCompanySubmit(formData: FormData) {
    if (!permissions.writeData) {
      return;
    }

    const nextItem: CompanyFinancial = {
      year: readNumber(formData, "year"),
      revenue: readNumber(formData, "revenue"),
      operatingProfit: readNumber(formData, "operatingProfit"),
      laborCost: readNumber(formData, "laborCost"),
      valueAdded: readOptionalNumber(formData, "valueAdded"),
      employeeCount: readNumber(formData, "employeeCount"),
      averageSalary: readNumber(formData, "averageSalary"),
      hcRoi: readNumber(formData, "hcRoi")
    };

    if (nextItem.revenue <= 0 || nextItem.employeeCount <= 0 || nextItem.laborCost < 0) {
      setCsvMessage("매출액과 직원 수는 0보다 커야 하며, 인건비는 음수일 수 없습니다.");
      return;
    }

    setCompanyFinancials((items) => upsertByYear(items, nextItem));
    setYear(nextItem.year);
    appendLog("update", "financials", `${nextItem.year}년 회사 재무지표 저장`);
  }

  function handlePublicIndexSubmit(formData: FormData) {
    if (!permissions.writeData) {
      return;
    }

    const nextItem: PublicIndex = {
      year: readNumber(formData, "year"),
      minimumWage: readNumber(formData, "minimumWage"),
      medianIncome: readNumber(formData, "medianIncome"),
      industryRegularPay: readNumber(formData, "industryRegularPay"),
      industryOvertimePay: readNumber(formData, "industryOvertimePay"),
      industrySpecialPay: readNumber(formData, "industrySpecialPay"),
      wageJobInfoAmount: readNumber(formData, "wageJobInfoAmount"),
      agreedWageIncreaseRate: readNumber(formData, "agreedWageIncreaseRate"),
      unionDemandRate: readNumber(formData, "unionDemandRate"),
      sourceName: String(formData.get("sourceName") ?? "수동 입력")
    };

    setPublicIndices((items) => upsertByYear(items, nextItem));
    appendLog("update", "public_indices", `${nextItem.year}년 외부 임금지표 저장`);
  }

  function handleCompetitorSubmit(formData: FormData) {
    if (!permissions.writeData) {
      return;
    }

    const nextItem: Competitor = {
      companyName: String(formData.get("companyName") ?? "").trim(),
      year: readNumber(formData, "year"),
      revenue: readNumber(formData, "revenue"),
      operatingProfit: readNumber(formData, "operatingProfit"),
      laborCost: readNumber(formData, "laborCost"),
      employeeCount: readNumber(formData, "employeeCount"),
      averageTenure: readNumber(formData, "averageTenure"),
      averageSalary: readNumber(formData, "averageSalary"),
      sourceFileName: String(formData.get("sourceFileName") ?? "attached-report.pdf")
    };

    if (!nextItem.companyName || nextItem.employeeCount <= 0) {
      setCsvMessage("경쟁사명과 직원 수를 확인해 주세요.");
      return;
    }

    setCompetitors((items) => [
      nextItem,
      ...items.filter((item) => !(item.year === nextItem.year && item.companyName === nextItem.companyName))
    ]);
    appendLog("update", "competitors", `${nextItem.companyName} 경쟁지표 저장`);
  }

  function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!permissions.writeData) {
      setCsvMessage("현재 역할은 CSV 업로드 권한이 없습니다.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseOtCsv(String(reader.result ?? ""));

      if (result.errors.length > 0) {
        setCsvMessage(result.errors.join(" / "));
        return;
      }

      setOtSummary((items) => [...result.rows, ...items]);
      setCsvMessage(`${result.rows.length}개 OT 집계 행을 업로드했습니다.`);
      appendLog("upload", "file", `${file.name} CSV 업로드`);
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  }

  function handleReportDownload() {
    if (!permissions.downloadReport) {
      return;
    }

    appendLog("download", "report", `${year}년 임원용 PDF 보고서 다운로드`);
    window.print();
  }

  if (!permissions.viewDashboard) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-5 py-6 text-[#172033]">
        <section className="mx-auto flex min-h-[calc(100vh-48px)] max-w-5xl items-center justify-center">
          <div className="w-full max-w-xl rounded-lg border border-[#dde4ef] bg-white p-8 shadow-[0_18px_48px_rgba(31,41,55,0.08)]">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#fee2e2] text-[#b91c1c]">
              <Lock size={24} aria-hidden />
            </div>
            <h1 className="text-2xl font-bold text-[#121826]">접근 권한이 없습니다</h1>
            <p className="mt-3 text-sm leading-6 text-[#526071]">
              현재 역할은 {roleLabels[role]}입니다. HR 관리자에게 계정 활성화와 역할 부여를 요청해 주세요.
            </p>
            <div className="mt-6">
              <label className="text-xs font-bold uppercase text-[#667085]">데모 역할 전환</label>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[#cfd8e3] bg-white px-3 text-sm"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]} - {roleDescriptions[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-[#172033]">
      <header className="sticky top-0 z-20 border-b border-[#dde4ef] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#0f766e] text-white">
              <Scale size={22} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-[#667085]">PayRaise Insight</p>
              <h1 className="text-xl font-bold text-[#121826]">임금인상률 검토 지표 대시보드</h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-[#344054]">역할</span>
              <select className="bg-transparent text-sm outline-none" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {roles.map((item) => (
                  <option key={item} value={item}>
                    {roleLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-md border border-[#cfd8e3] bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-[#344054]">기준연도</span>
              <select className="bg-transparent text-sm outline-none" value={year} onChange={(event) => setYear(Number(event.target.value))}>
                {availableYears.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-4">
          {[
            { id: "dashboard", label: "대시보드", icon: BarChart3, disabled: !permissions.viewDashboard },
            { id: "data", label: "데이터 입력", icon: Upload, disabled: !permissions.writeData },
            { id: "reports", label: "보고서", icon: FileText, disabled: !permissions.downloadReport && !permissions.generateReport },
            { id: "admin", label: "관리", icon: Users, disabled: !permissions.admin }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold transition ${
                  view === item.id
                    ? "border-[#0f766e] bg-[#ecfdf5] text-[#0f766e]"
                    : "border-[#d8e0ea] bg-white text-[#475467] hover:border-[#98a2b3]"
                } ${item.disabled ? "cursor-not-allowed opacity-45" : ""}`}
                type="button"
                disabled={item.disabled}
                onClick={() => setView(item.id as View)}
                title={item.disabled ? "현재 역할에서 사용할 수 없습니다" : item.label}
              >
                <Icon size={16} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-5 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          {view === "dashboard" && <DashboardView dashboard={dashboard} year={year} />}
          {view === "data" && (
            <DataView
              canWrite={permissions.writeData}
              csvMessage={csvMessage}
              onCompanySubmit={handleCompanySubmit}
              onPublicIndexSubmit={handlePublicIndexSubmit}
              onCompetitorSubmit={handleCompetitorSubmit}
              onCsvUpload={handleCsvUpload}
            />
          )}
          {view === "reports" && (
            <ReportsView
              dashboard={dashboard}
              year={year}
              selectedCharts={selectedCharts}
              setSelectedCharts={setSelectedCharts}
              canGenerate={permissions.generateReport}
              canDownload={permissions.downloadReport}
              onDownload={handleReportDownload}
            />
          )}
          {view === "admin" && <AdminView role={role} logs={logs} />}
        </section>

        <aside className="space-y-4">
          <Panel title="권한 상태" icon={<ShieldCheck size={18} aria-hidden />}>
            <div className="rounded-md bg-[#f8fafc] p-3">
              <p className="font-bold text-[#121826]">{roleLabels[role]}</p>
              <p className="mt-1 text-sm leading-5 text-[#667085]">{roleDescriptions[role]}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <PermissionPill label="조회" active={permissions.viewDashboard} />
              <PermissionPill label="입력" active={permissions.writeData} />
              <PermissionPill label="PDF 생성" active={permissions.generateReport} />
              <PermissionPill label="다운로드" active={permissions.downloadReport} />
              <PermissionPill label="사용자 관리" active={permissions.admin} />
              <PermissionPill label="API 차단" active={role === "developer" || role === "no_access"} tone="warn" />
            </div>
          </Panel>

          <Panel title="검토 알림" icon={<AlertTriangle size={18} aria-hidden />}>
            <ul className="space-y-3 text-sm leading-5 text-[#526071]">
              <li className="flex gap-2">
                <Check className="mt-0.5 text-[#0f766e]" size={16} aria-hidden />
                임금인상률 자동 산정과 개인별 추천은 MVP 범위에서 제외했습니다.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 text-[#0f766e]" size={16} aria-hidden />
                개인별 급여와 개인 근태 원자료는 저장하지 않는 구조입니다.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 text-[#0f766e]" size={16} aria-hidden />
                서버 API 단계에서는 역할별 `requireRole()` 검증이 필요합니다.
              </li>
            </ul>
          </Panel>

          <Panel title="최근 감사 로그" icon={<ClipboardList size={18} aria-hidden />}>
            <div className="space-y-3">
              {logs.slice(0, 4).map((log, index) => (
                <div key={`${log.createdAt}-${index}`} className="border-b border-[#edf1f5] pb-3 last:border-b-0 last:pb-0">
                  <p className="text-xs font-bold uppercase text-[#0f766e]">{log.actionType} / {log.resourceType}</p>
                  <p className="mt-1 text-sm font-semibold text-[#344054]">{log.detail}</p>
                  <p className="mt-1 text-xs text-[#667085]">{log.createdAt}</p>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function DashboardView({ dashboard, year }: { dashboard: ReturnType<typeof buildDashboard>; year: number }) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="매출액" value={formatCurrency(dashboard.kpis.revenue)} helper={`${year}년 기준`} trend={dashboard.yearOverYear.revenue} />
        <KpiCard label="영업이익" value={formatCurrency(dashboard.kpis.operatingProfit)} helper="영업이익률 포함" trend={dashboard.yearOverYear.operatingProfit} />
        <KpiCard label="영업이익률" value={formatPercent(dashboard.kpis.operatingProfitRate)} helper="영업이익 / 매출액" trend={dashboard.yearOverYear.operatingProfitRate} />
        <KpiCard label="총 인건비" value={formatCurrency(dashboard.kpis.laborCost)} helper="선택 연도 기준" trend={dashboard.yearOverYear.laborCost} />
        <KpiCard
          label="인건비 대 매출액 비율"
          value={formatMetricValue(dashboard.kpis.laborCostRevenueRatio)}
          helper="총 인건비가 매출액에서 차지하는 비율"
          trend={dashboard.yearOverYear.laborCostRevenueRatio}
          inverted
          metric={dashboard.kpis.laborCostRevenueRatio}
        />
        <KpiCard
          label="노동소득분배율"
          value={formatMetricValue(dashboard.kpis.laborIncomeShare)}
          helper="부가가치 중 임금으로 배분된 비율"
          trend={dashboard.yearOverYear.laborIncomeShare}
          inverted
          metric={dashboard.kpis.laborIncomeShare}
        />
        <KpiCard
          label="HCROI"
          value={formatMetricValue(dashboard.kpis.hcroi)}
          helper="인적자본 투자 대비 성과"
          trend={dashboard.yearOverYear.hcroi}
          metric={dashboard.kpis.hcroi}
        />
        <KpiCard label="인당 인건비" value={formatCurrency(dashboard.kpis.laborCostPerEmployee)} helper="총 인건비 / 직원 수" trend={dashboard.yearOverYear.laborCostPerEmployee} />
        <KpiCard label="시장임금 대비 수준" value={formatPercent(dashboard.kpis.marketPayRatio)} helper="회사 평균임금 / 산업 기준" trend={dashboard.yearOverYear.marketPayRatio} />
        <KpiCard label="평균 OT 시간" value={`${dashboard.kpis.avgOtHours.toFixed(1)}h`} helper="부서별 집계 평균" trend={dashboard.yearOverYear.avgOtHours} inverted />
        <KpiCard label="최저임금 리스크" value={dashboard.kpis.minimumWageRisk} helper="입력 평균임금 기준 점검" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartPanel title="매출액 및 영업이익 추이">
          <LineChart data={dashboard.charts.financialTrend} lines={[{ key: "revenue", label: "매출액", color: "#0f766e" }, { key: "operatingProfit", label: "영업이익", color: "#2563eb" }]} />
        </ChartPanel>
        <ChartPanel title="인건비 매출 대비율 추이">
          <LineChart data={dashboard.charts.laborCostRatioTrend} lines={[{ key: "ratio", label: "인건비율", color: "#b45309" }]} percent />
        </ChartPanel>
        <ChartPanel title="우리 회사 vs 산업 평균임금">
          <BarChart data={dashboard.charts.marketPayComparison} bars={[{ key: "company", label: "우리 회사", color: "#0f766e" }, { key: "industry", label: "산업 평균", color: "#64748b" }]} />
        </ChartPanel>
        <ChartPanel title="경쟁사 인당 인건비 비교">
          <BarChart data={dashboard.charts.competitorComparison} bars={[{ key: "laborCostPerEmployee", label: "인당 인건비", color: "#2563eb" }]} />
        </ChartPanel>
        <ChartPanel title="부서별 평균 OT 시간">
          <BarChart data={dashboard.charts.departmentOt} bars={[{ key: "avgOtHours", label: "평균 OT", color: "#7c3aed" }]} hours />
        </ChartPanel>
        <ChartPanel title="월별 OT 추이">
          <LineChart data={dashboard.charts.monthlyOtTrend} lines={[{ key: "totalOtHours", label: "총 OT", color: "#dc2626" }, { key: "unapprovedOtHours", label: "미승인 OT", color: "#9333ea" }]} />
        </ChartPanel>
        <ChartPanel title="정액급여, 초과급여, 특별급여 구성">
          <StackedPayChart data={dashboard.charts.payComposition} />
        </ChartPanel>
        <ChartPanel title="전년 대비 주요 지표 변화율">
          <DeltaChart data={dashboard.charts.yearlyDeltas} />
        </ChartPanel>
      </section>
    </div>
  );
}

function DataView({
  canWrite,
  csvMessage,
  onCompanySubmit,
  onPublicIndexSubmit,
  onCompetitorSubmit,
  onCsvUpload
}: {
  canWrite: boolean;
  csvMessage: string;
  onCompanySubmit: (formData: FormData) => void;
  onPublicIndexSubmit: (formData: FormData) => void;
  onCompetitorSubmit: (formData: FormData) => void;
  onCsvUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-5">
      {!canWrite && <AccessNotice text="현재 역할은 데이터 입력 권한이 없습니다." />}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DataForm title="회사 재무지표 입력" onSubmit={onCompanySubmit} disabled={!canWrite}>
          <NumberInput name="year" label="연도" defaultValue={2026} />
          <NumberInput name="revenue" label="매출액" defaultValue={6240000000} />
          <NumberInput name="operatingProfit" label="영업이익" defaultValue={388000000} />
          <NumberInput name="laborCost" label="총 인건비" defaultValue={3410000000} />
          <NumberInput name="valueAdded" label="부가가치" defaultValue={5000000000} />
          <NumberInput name="employeeCount" label="직원 수" defaultValue={55} />
          <NumberInput name="averageSalary" label="평균임금" defaultValue={62000000} />
          <NumberInput name="hcRoi" label="HC ROI" defaultValue={2.01} step="0.01" />
        </DataForm>

        <DataForm title="외부 임금지표 입력" onSubmit={onPublicIndexSubmit} disabled={!canWrite}>
          <NumberInput name="year" label="연도" defaultValue={2026} />
          <NumberInput name="minimumWage" label="최저임금" defaultValue={10480} />
          <NumberInput name="medianIncome" label="중위소득" defaultValue={42100000} />
          <NumberInput name="industryRegularPay" label="산업 정액급여" defaultValue={67300000} />
          <NumberInput name="industryOvertimePay" label="산업 초과급여" defaultValue={7900000} />
          <NumberInput name="industrySpecialPay" label="산업 특별급여" defaultValue={6500000} />
          <NumberInput name="wageJobInfoAmount" label="임금직무정보 금액" defaultValue={70600000} />
          <NumberInput name="agreedWageIncreaseRate" label="협약 임금인상률" defaultValue={5.4} step="0.1" />
          <NumberInput name="unionDemandRate" label="노조 요구율" defaultValue={8.8} step="0.1" />
          <TextInput name="sourceName" label="출처" defaultValue="통합 기준" />
        </DataForm>

        <DataForm title="경쟁사 지표 입력" onSubmit={onCompetitorSubmit} disabled={!canWrite}>
          <TextInput name="companyName" label="경쟁사명" defaultValue="D플랫폼" />
          <NumberInput name="year" label="연도" defaultValue={2026} />
          <NumberInput name="revenue" label="매출액" defaultValue={6120000000} />
          <NumberInput name="operatingProfit" label="영업이익" defaultValue={330000000} />
          <NumberInput name="laborCost" label="총 인건비" defaultValue={3280000000} />
          <NumberInput name="employeeCount" label="직원 수" defaultValue={53} />
          <NumberInput name="averageTenure" label="평균근속" defaultValue={5.6} step="0.1" />
          <NumberInput name="averageSalary" label="평균임금" defaultValue={61900000} />
          <TextInput name="sourceFileName" label="첨부 PDF 파일명" defaultValue="d-platform-2026.pdf" />
        </DataForm>

        <Panel title="부서 및 직군별 OT CSV 업로드" icon={<Upload size={18} aria-hidden />}>
          <div className="rounded-md border border-dashed border-[#98a2b3] bg-[#f8fafc] p-5">
            <input
              className="block w-full text-sm file:mr-4 file:h-10 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-4 file:text-sm file:font-bold file:text-white"
              type="file"
              accept=".csv"
              disabled={!canWrite}
              onChange={onCsvUpload}
            />
            <p className="mt-3 text-sm leading-5 text-[#526071]">{csvMessage}</p>
            <div className="mt-4 rounded-md bg-white p-3 text-xs leading-5 text-[#667085]">
              필수 컬럼: {requiredCsvColumns.join(", ")}
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ReportsView({
  dashboard,
  year,
  selectedCharts,
  setSelectedCharts,
  canGenerate,
  canDownload,
  onDownload
}: {
  dashboard: ReturnType<typeof buildDashboard>;
  year: number;
  selectedCharts: string[];
  setSelectedCharts: (charts: string[]) => void;
  canGenerate: boolean;
  canDownload: boolean;
  onDownload: () => void;
}) {
  const chartOptions = [
    ["financialTrend", "매출액 및 영업이익"],
    ["laborCostRatioTrend", "인건비율"],
    ["marketPayComparison", "시장임금 비교"],
    ["competitorComparison", "경쟁사 비교"],
    ["departmentOt", "부서별 OT"],
    ["monthlyOtTrend", "월별 OT"],
    ["payComposition", "급여 구성"],
    ["yearlyDeltas", "전년 대비 변화율"]
  ];

  function toggleChart(id: string) {
    setSelectedCharts(selectedCharts.includes(id) ? selectedCharts.filter((item) => item !== id) : [...selectedCharts, id]);
  }

  return (
    <div className="space-y-5">
      {!canGenerate && !canDownload && <AccessNotice text="현재 역할은 보고서 생성 또는 다운로드 권한이 없습니다." />}
      <Panel title="임원용 보고서 생성" icon={<FileText size={18} aria-hidden />}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#344054]">{year}년 임원 보고서</p>
            <p className="mt-1 text-sm leading-5 text-[#667085]">그래프를 선택한 뒤 미리보기 영역을 인쇄하면 PDF로 저장할 수 있습니다.</p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0f766e] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#98a2b3]"
            type="button"
            disabled={!canDownload}
            onClick={onDownload}
            title="PDF 다운로드"
          >
            <Download size={17} aria-hidden />
            PDF로 저장
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {chartOptions.map(([id, label]) => (
            <label key={id} className="flex cursor-pointer items-center gap-2 rounded-md border border-[#d8e0ea] bg-white px-3 py-2 text-sm">
              <input type="checkbox" checked={selectedCharts.includes(id)} onChange={() => toggleChart(id)} />
              {label}
            </label>
          ))}
        </div>
      </Panel>

      <section className="print-report rounded-lg border border-[#d8e0ea] bg-white p-6 shadow-[0_8px_24px_rgba(31,41,55,0.06)]">
        <div className="border-b border-[#d8e0ea] pb-5">
          <p className="text-xs font-bold uppercase text-[#0f766e]">Executive Summary</p>
          <h2 className="mt-2 text-2xl font-bold text-[#121826]">{year}년 임금인상률 검토 참고 보고서</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#526071]">
            본 보고서는 임금인상률을 확정하는 자료가 아니라 경영진 의사결정을 보조하기 위한 지표 요약입니다.
            최종 인상률은 회사의 경영상황, 평가 기준, 임금체계, 근로계약 및 관련 법령 검토 후 확정되어야 합니다.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <ReportMetric label="매출액" value={formatCurrency(dashboard.kpis.revenue)} />
          <ReportMetric label="인건비 대 매출액 비율" value={formatMetricValue(dashboard.kpis.laborCostRevenueRatio)} metric={dashboard.kpis.laborCostRevenueRatio} />
          <ReportMetric label="노동소득분배율" value={formatMetricValue(dashboard.kpis.laborIncomeShare)} metric={dashboard.kpis.laborIncomeShare} />
          <ReportMetric label="HCROI" value={formatMetricValue(dashboard.kpis.hcroi)} metric={dashboard.kpis.hcroi} />
          <ReportMetric label="시장임금 대비" value={formatPercent(dashboard.kpis.marketPayRatio)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {selectedCharts.includes("financialTrend") && (
            <ChartPanel title="회사 재무지표">
              <LineChart data={dashboard.charts.financialTrend} lines={[{ key: "revenue", label: "매출액", color: "#0f766e" }, { key: "operatingProfit", label: "영업이익", color: "#2563eb" }]} compact />
            </ChartPanel>
          )}
          {selectedCharts.includes("marketPayComparison") && (
            <ChartPanel title="시장임금 비교">
              <BarChart data={dashboard.charts.marketPayComparison} bars={[{ key: "company", label: "우리 회사", color: "#0f766e" }, { key: "industry", label: "산업 평균", color: "#64748b" }]} compact />
            </ChartPanel>
          )}
          {selectedCharts.includes("departmentOt") && (
            <ChartPanel title="근태 및 OT 현황">
              <BarChart data={dashboard.charts.departmentOt} bars={[{ key: "avgOtHours", label: "평균 OT", color: "#7c3aed" }]} hours compact />
            </ChartPanel>
          )}
          {selectedCharts.includes("yearlyDeltas") && (
            <ChartPanel title="주요 지표 변화율">
              <DeltaChart data={dashboard.charts.yearlyDeltas} />
            </ChartPanel>
          )}
        </div>

        <div className="mt-6 rounded-md border border-[#d8e0ea] bg-[#f8fafc] p-4 text-xs leading-5 text-[#526071]">
          워터마크: 사내 내부 검토용 / 외부 공유 금지. 본 보고서에는 개인별 급여 또는 개인별 근태 원자료가 포함되지 않습니다.
          로컬 데모 데이터 또는 샘플 데이터가 포함된 경우, 실제 의사결정 전에 원천 데이터를 확정해 다시 생성해야 합니다.
        </div>
      </section>
    </div>
  );
}

function AdminView({ role, logs }: { role: Role; logs: AuditLog[] }) {
  return (
    <div className="space-y-5">
      {role !== "hr_admin" && <AccessNotice text="관리 메뉴는 HR 관리자만 사용할 수 있습니다." />}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="사용자 권한 관리" icon={<Users size={18} aria-hidden />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d8e0ea] text-left text-xs uppercase text-[#667085]">
                  <th className="py-3">사용자</th>
                  <th>역할</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["admin@company.com", "hr_admin", "활성"],
                  ["hr@company.com", "hr_staff", "활성"],
                  ["executive@company.com", "executive", "활성"],
                  ["new.user@company.com", "no_access", "승인 대기"]
                ].map(([email, userRole, status]) => (
                  <tr key={email} className="border-b border-[#edf1f5]">
                    <td className="py-3 font-semibold text-[#344054]">{email}</td>
                    <td>{roleLabels[userRole as Role]}</td>
                    <td>{status}</td>
                    <td>
                      <button className="rounded-md border border-[#cfd8e3] px-3 py-1 text-xs font-bold text-[#344054]" type="button">
                        변경
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="감사 로그" icon={<ClipboardList size={18} aria-hidden />}>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[580px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d8e0ea] text-left text-xs uppercase text-[#667085]">
                  <th className="py-3">시간</th>
                  <th>사용자</th>
                  <th>행위</th>
                  <th>리소스</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={`${log.createdAt}-${index}`} className="border-b border-[#edf1f5]">
                    <td className="py-3 text-xs text-[#667085]">{log.createdAt}</td>
                    <td>{log.actor}</td>
                    <td className="font-semibold text-[#0f766e]">{log.actionType}</td>
                    <td>{log.resourceType}</td>
                    <td>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d8e0ea] bg-white p-4 shadow-[0_8px_24px_rgba(31,41,55,0.05)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ecfdf5] text-[#0f766e]">{icon}</div>
        <h2 className="text-sm font-bold text-[#121826]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  helper,
  trend,
  inverted = false,
  metric
}: {
  label: string;
  value: string;
  helper: string;
  trend?: number | null;
  inverted?: boolean;
  metric?: MetricResult;
}) {
  const trendGood = trend === undefined || trend === null || (inverted ? trend <= 0 : trend >= 0);

  return (
    <div className="rounded-lg border border-[#d8e0ea] bg-white p-4 shadow-[0_8px_24px_rgba(31,41,55,0.05)]">
      <p className="text-xs font-bold uppercase text-[#667085]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold text-[#121826]">{value}</p>
        {trend !== undefined && trend !== null && (
          <span className={`rounded-md px-2 py-1 text-xs font-bold ${trendGood ? "bg-[#ecfdf5] text-[#0f766e]" : "bg-[#fff7ed] text-[#c2410c]"}`}>
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-[#667085]">{helper}</p>
      {metric && (
        <div className="mt-3 space-y-2 rounded-md bg-[#f8fafc] p-3 text-xs leading-5 text-[#526071]">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-white px-2 py-1 font-bold text-[#0f766e]">{metric.status}</span>
            {metric.note && <span className="rounded-md bg-[#fff7ed] px-2 py-1 font-bold text-[#c2410c]">{metric.note}</span>}
          </div>
          <p title={metric.formula}>
            <strong>계산식:</strong> {metric.formula}
          </p>
          <p>
            <strong>출처:</strong> {metric.source}
          </p>
          <p>{metric.reason ?? metric.interpretation}</p>
        </div>
      )}
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d8e0ea] bg-white p-4">
      <h3 className="text-sm font-bold text-[#121826]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LineChart({
  data,
  lines,
  percent = false,
  compact = false
}: {
  data: Array<Record<string, number | string>>;
  lines: Array<{ key: string; label: string; color: string }>;
  percent?: boolean;
  compact?: boolean;
}) {
  const width = 640;
  const height = compact ? 210 : 260;
  const padding = 34;
  const values = data.flatMap((item) => lines.map((line) => Number(item[line.key] ?? 0)));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-[560px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="line chart">
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        {[0, 1, 2, 3].map((tick) => {
          const y = padding + ((height - padding * 2) / 3) * tick;
          return <line key={tick} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#edf1f5" />;
        })}
        {lines.map((line) => {
          const points = data
            .map((item, index) => {
              const x = padding + ((width - padding * 2) / Math.max(data.length - 1, 1)) * index;
              const y = height - padding - ((Number(item[line.key]) - min) / range) * (height - padding * 2);
              return `${x},${y}`;
            })
            .join(" ");

          return <polyline key={line.key} fill="none" points={points} stroke={line.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />;
        })}
        {data.map((item, index) => {
          const x = padding + ((width - padding * 2) / Math.max(data.length - 1, 1)) * index;
          return (
            <text key={`${item.label}-${index}`} x={x} y={height - 8} fill="#667085" fontSize="11" textAnchor="middle">
              {item.label}
            </text>
          );
        })}
        <text x={padding} y="18" fill="#667085" fontSize="11">
          {percent ? "비율" : "금액"}
        </text>
      </svg>
      <Legend items={lines} />
    </div>
  );
}

function BarChart({
  data,
  bars,
  hours = false,
  compact = false
}: {
  data: Array<Record<string, number | string>>;
  bars: Array<{ key: string; label: string; color: string }>;
  hours?: boolean;
  compact?: boolean;
}) {
  const width = 640;
  const height = compact ? 210 : 260;
  const padding = 36;
  const max = Math.max(...data.flatMap((item) => bars.map((bar) => Number(item[bar.key] ?? 0))), 1);
  const groupWidth = (width - padding * 2) / Math.max(data.length, 1);
  const barWidth = Math.max(14, groupWidth / (bars.length + 1.5));

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-[560px]" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="bar chart">
        <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
        {[0, 1, 2, 3].map((tick) => {
          const y = padding + ((height - padding * 2) / 3) * tick;
          return <line key={tick} x1={padding} x2={width - padding} y1={y} y2={y} stroke="#edf1f5" />;
        })}
        {data.map((item, dataIndex) => {
          const groupX = padding + groupWidth * dataIndex;
          return (
            <g key={`${item.label}-${dataIndex}`}>
              {bars.map((bar, barIndex) => {
                const value = Number(item[bar.key] ?? 0);
                const barHeight = (value / max) * (height - padding * 2);
                const x = groupX + barWidth * barIndex + barWidth * 0.4;
                const y = height - padding - barHeight;
                return <rect key={bar.key} x={x} y={y} width={barWidth} height={barHeight} rx="4" fill={bar.color} />;
              })}
              <text x={groupX + groupWidth / 2} y={height - 8} fill="#667085" fontSize="11" textAnchor="middle">
                {item.label}
              </text>
            </g>
          );
        })}
        <text x={padding} y="18" fill="#667085" fontSize="11">
          {hours ? "시간" : "금액"}
        </text>
      </svg>
      <Legend items={bars} />
    </div>
  );
}

function StackedPayChart({ data }: { data: Array<{ label: string; regular: number; overtime: number; special: number }> }) {
  const colors = { regular: "#0f766e", overtime: "#2563eb", special: "#c2410c" };

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const total = item.regular + item.overtime + item.special || 1;
        return (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs text-[#667085]">
              <span>{item.label}</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex h-8 overflow-hidden rounded-md bg-[#edf1f5]">
              <div style={{ width: `${(item.regular / total) * 100}%`, backgroundColor: colors.regular }} title="정액급여" />
              <div style={{ width: `${(item.overtime / total) * 100}%`, backgroundColor: colors.overtime }} title="초과급여" />
              <div style={{ width: `${(item.special / total) * 100}%`, backgroundColor: colors.special }} title="특별급여" />
            </div>
          </div>
        );
      })}
      <Legend
        items={[
          { key: "regular", label: "정액급여", color: colors.regular },
          { key: "overtime", label: "초과급여", color: colors.overtime },
          { key: "special", label: "특별급여", color: colors.special }
        ]}
      />
    </div>
  );
}

function DeltaChart({ data }: { data: Array<{ label: string; value: number }> }) {
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const width = Math.min(Math.abs(item.value) * 8, 100);
        const positive = item.value >= 0;
        return (
          <div key={item.label} className="grid grid-cols-[120px_1fr_58px] items-center gap-3 text-sm">
            <span className="font-semibold text-[#344054]">{item.label}</span>
            <div className="h-8 rounded-md bg-[#edf1f5]">
              <div className={`h-8 rounded-md ${positive ? "bg-[#0f766e]" : "bg-[#c2410c]"}`} style={{ width: `${width}%` }} />
            </div>
            <span className={`text-right font-bold ${positive ? "text-[#0f766e]" : "text-[#c2410c]"}`}>
              {positive ? "+" : ""}
              {item.value.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ items }: { items: Array<{ key: string; label: string; color: string }> }) {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-2 text-xs font-semibold text-[#526071]">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function DataForm({
  title,
  children,
  disabled,
  onSubmit
}: {
  title: string;
  children: React.ReactNode;
  disabled: boolean;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <Panel title={title} icon={<FileText size={18} aria-hidden />}>
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        {children}
        <button
          className="mt-1 inline-flex h-11 items-center justify-center rounded-md bg-[#0f766e] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#98a2b3] sm:col-span-2"
          type="submit"
          disabled={disabled}
        >
          저장
        </button>
      </form>
    </Panel>
  );
}

function NumberInput({ name, label, defaultValue, step = "1" }: { name: string; label: string; defaultValue: number; step?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#667085]">{label}</span>
      <input className="mt-1 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none focus:border-[#0f766e]" name={name} type="number" step={step} defaultValue={defaultValue} />
    </label>
  );
}

function TextInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-[#667085]">{label}</span>
      <input className="mt-1 h-10 w-full rounded-md border border-[#cfd8e3] px-3 text-sm outline-none focus:border-[#0f766e]" name={name} type="text" defaultValue={defaultValue} />
    </label>
  );
}

function PermissionPill({ label, active, tone = "default" }: { label: string; active: boolean; tone?: "default" | "warn" }) {
  const activeClass = tone === "warn" ? "bg-[#fff7ed] text-[#c2410c]" : "bg-[#ecfdf5] text-[#0f766e]";

  return (
    <span className={`rounded-md px-2 py-1 text-center font-bold ${active ? activeClass : "bg-[#f2f4f7] text-[#98a2b3]"}`}>
      {label}
    </span>
  );
}

function AccessNotice({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm font-semibold text-[#9a3412]">
      <AlertTriangle size={18} aria-hidden />
      {text}
    </div>
  );
}

function ReportMetric({ label, value, metric }: { label: string; value: string; metric?: MetricResult }) {
  return (
    <div className="rounded-md border border-[#d8e0ea] p-3">
      <p className="text-xs font-bold uppercase text-[#667085]">{label}</p>
      <p className="mt-2 text-xl font-bold text-[#121826]">{value}</p>
      {metric && (
        <div className="mt-3 space-y-1 text-xs leading-5 text-[#526071]">
          <p>
            <strong>상태:</strong> {metric.status}
          </p>
          <p>
            <strong>계산식:</strong> {metric.formula}
          </p>
          <p>
            <strong>출처:</strong> {metric.source}
          </p>
          <p>{metric.reason ?? metric.pdfText}</p>
          {metric.note && <p className="font-bold text-[#c2410c]">{metric.note}</p>}
        </div>
      )}
    </div>
  );
}

function buildDashboard(
  year: number,
  companyFinancials: CompanyFinancial[],
  publicIndices: PublicIndex[],
  competitors: Competitor[],
  otSummary: OtSummary[]
) {
  const current = companyFinancials.find((item) => item.year === year) ?? companyFinancials[companyFinancials.length - 1];
  const previous = companyFinancials.find((item) => item.year === year - 1) ?? current;
  const currentIndex = publicIndices.find((item) => item.year === year) ?? publicIndices[publicIndices.length - 1];
  const previousIndex = publicIndices.find((item) => item.year === year - 1) ?? currentIndex;
  const currentCompetitors = competitors.filter((item) => item.year === year);
  const currentOt = otSummary.filter((item) => item.yearMonth.startsWith(String(year)));
  const laborCostPerEmployee = current.employeeCount > 0 ? current.laborCost / current.employeeCount : 0;
  const operatingProfitRate = current.revenue > 0 ? current.operatingProfit / current.revenue : 0;
  const laborCostRatio = current.revenue > 0 ? current.laborCost / current.revenue : 0;
  const laborCostRevenueRatio = calculateLaborCostRevenueRatio(current);
  const previousLaborCostRevenueRatio = calculateLaborCostRevenueRatio(previous);
  const laborIncomeShare = calculateLaborIncomeShare(current);
  const previousLaborIncomeShare = calculateLaborIncomeShare(previous);
  const hcroi = calculateHcroi(current);
  const previousHcroi = calculateHcroi(previous);
  const marketPayRatio = currentIndex.industryRegularPay > 0 ? current.averageSalary / currentIndex.industryRegularPay : 0;
  const totalOtEmployees = currentOt.reduce((sum, item) => sum + item.employeeCount, 0);
  const avgOtHours = totalOtEmployees > 0 ? currentOt.reduce((sum, item) => sum + item.totalOtHours, 0) / totalOtEmployees : 0;

  const trendData = companyFinancials
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((item) => ({
      label: String(item.year),
      revenue: item.revenue,
      operatingProfit: item.operatingProfit,
      ratio: item.revenue > 0 ? item.laborCost / item.revenue : 0
    }));

  const departmentMap = new Map<string, { employees: number; hours: number }>();
  currentOt.forEach((item) => {
    const currentValue = departmentMap.get(item.department) ?? { employees: 0, hours: 0 };
    currentValue.employees += item.employeeCount;
    currentValue.hours += item.totalOtHours;
    departmentMap.set(item.department, currentValue);
  });

  const monthlyMap = new Map<string, { total: number; unapproved: number }>();
  currentOt.forEach((item) => {
    const currentValue = monthlyMap.get(item.yearMonth) ?? { total: 0, unapproved: 0 };
    currentValue.total += item.totalOtHours;
    currentValue.unapproved += item.unapprovedOtHours;
    monthlyMap.set(item.yearMonth, currentValue);
  });

  return {
    kpis: {
      revenue: current.revenue,
      operatingProfit: current.operatingProfit,
      operatingProfitRate,
      laborCost: current.laborCost,
      laborCostRatio,
      laborCostRevenueRatio,
      valueAdded: current.valueAdded,
      laborIncomeShare,
      hcroi,
      laborCostPerEmployee,
      marketPayRatio,
      avgOtHours,
      minimumWageRisk: current.averageSalary / 209 / 12 < currentIndex.minimumWage * 1.2 ? "검토 필요" : "낮음"
    },
    yearOverYear: {
      revenue: pctDelta(current.revenue, previous.revenue),
      operatingProfit: pctDelta(current.operatingProfit, previous.operatingProfit),
      operatingProfitRate: pctDelta(operatingProfitRate, previous.revenue > 0 ? previous.operatingProfit / previous.revenue : 0),
      laborCost: pctDelta(current.laborCost, previous.laborCost),
      laborCostRatio: pctDelta(laborCostRatio, previous.revenue > 0 ? previous.laborCost / previous.revenue : 0),
      laborCostRevenueRatio: pctDeltaMetric(laborCostRevenueRatio, previousLaborCostRevenueRatio),
      laborIncomeShare: pctDeltaMetric(laborIncomeShare, previousLaborIncomeShare),
      hcroi: pctDeltaMetric(hcroi, previousHcroi),
      laborCostPerEmployee: pctDelta(laborCostPerEmployee, previous.employeeCount > 0 ? previous.laborCost / previous.employeeCount : 0),
      marketPayRatio: pctDelta(marketPayRatio, previousIndex.industryRegularPay > 0 ? previous.averageSalary / previousIndex.industryRegularPay : 0),
      avgOtHours: 4.2
    },
    charts: {
      financialTrend: trendData,
      laborCostRatioTrend: trendData,
      marketPayComparison: [
        { label: "평균임금", company: current.averageSalary, industry: currentIndex.industryRegularPay },
        { label: "임금직무", company: current.averageSalary, industry: currentIndex.wageJobInfoAmount },
        { label: "중위소득", company: current.averageSalary, industry: currentIndex.medianIncome }
      ],
      competitorComparison: [
        { label: "우리 회사", laborCostPerEmployee },
        ...currentCompetitors.map((item) => ({
          label: item.companyName,
          laborCostPerEmployee: item.employeeCount > 0 ? item.laborCost / item.employeeCount : 0
        }))
      ],
      departmentOt: Array.from(departmentMap.entries()).map(([label, value]) => ({
        label,
        avgOtHours: value.employees > 0 ? value.hours / value.employees : 0
      })),
      monthlyOtTrend: Array.from(monthlyMap.entries()).map(([label, value]) => ({
        label: label.slice(5),
        totalOtHours: value.total,
        unapprovedOtHours: value.unapproved
      })),
      payComposition: [
        {
          label: "산업 평균",
          regular: currentIndex.industryRegularPay,
          overtime: currentIndex.industryOvertimePay,
          special: currentIndex.industrySpecialPay
        },
        {
          label: "우리 회사",
          regular: current.averageSalary * 0.86,
          overtime: current.averageSalary * 0.08,
          special: current.averageSalary * 0.06
        }
      ],
      yearlyDeltas: [
        { label: "매출액", value: pctDelta(current.revenue, previous.revenue) },
        { label: "영업이익", value: pctDelta(current.operatingProfit, previous.operatingProfit) },
        { label: "인건비", value: pctDelta(current.laborCost, previous.laborCost) },
        { label: "평균임금", value: pctDelta(current.averageSalary, previous.averageSalary) },
        { label: "협약인상률", value: pctDelta(currentIndex.agreedWageIncreaseRate, previousIndex.agreedWageIncreaseRate) }
      ]
    }
  };
}

function parseOtCsv(csv: string): { rows: OtSummary[]; errors: string[] } {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV에 헤더와 데이터 행이 필요합니다."] };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  const missing = requiredCsvColumns.filter((column) => !headers.includes(column));

  if (missing.length > 0) {
    return { rows: [], errors: [`필수 컬럼 누락: ${missing.join(", ")}`] };
  }

  const rows: OtSummary[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const columns = line.split(",").map((column) => column.trim());
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, columns[headerIndex] ?? ""]));
    const lineNo = index + 2;
    const employeeCount = Number(record.employee_count);
    const totalOtHours = Number(record.total_ot_hours);
    const yearMonth = record.year_month;

    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      errors.push(`${lineNo}행 year_month 형식 오류`);
    }

    if (!Number.isFinite(employeeCount) || employeeCount <= 0) {
      errors.push(`${lineNo}행 employee_count 오류`);
    }

    if (!Number.isFinite(totalOtHours) || totalOtHours < 0) {
      errors.push(`${lineNo}행 total_ot_hours 오류`);
    }

    ["night_hours", "holiday_hours", "unapproved_ot_hours", "over_12h_count"].forEach((field) => {
      if (!Number.isFinite(Number(record[field]))) {
        errors.push(`${lineNo}행 ${field} 숫자 오류`);
      }
    });

    rows.push({
      yearMonth,
      department: record.department,
      jobGroup: record.job_group,
      employeeCount,
      totalOtHours,
      nightHours: Number(record.night_hours),
      holidayHours: Number(record.holiday_hours),
      unapprovedOtHours: Number(record.unapproved_ot_hours),
      over12hCount: Number(record.over_12h_count)
    });
  });

  return { rows: errors.length > 0 ? [] : rows, errors };
}

function getPermissions(role: Role) {
  return {
    viewDashboard: role === "hr_staff" || role === "hr_admin" || role === "executive",
    writeData: role === "hr_staff" || role === "hr_admin",
    generateReport: role === "hr_admin",
    downloadReport: role === "hr_admin" || role === "executive",
    admin: role === "hr_admin"
  };
}

function upsertByYear<T extends { year: number }>(items: T[], nextItem: T) {
  return [nextItem, ...items.filter((item) => item.year !== nextItem.year)].sort((a, b) => a.year - b.year);
}

function readNumber(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0);
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (value === null || value === "") {
    return null;
  }

  return Number(value);
}

function pctDelta(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

function pctDeltaMetric(current: MetricResult, previous: MetricResult) {
  if (current.value === null || previous.value === null) {
    return null;
  }

  return pctDelta(current.value, previous.value);
}

function formatCurrency(value: number) {
  return `${currencyFormatter.format(value)}원`;
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
