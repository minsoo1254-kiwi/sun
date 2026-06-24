import type { HrCheckpointResult } from "@/types/case";

const RISK_CLASS: Record<HrCheckpointResult["riskLevel"], string> = {
  낮음: "border-[#dcfce7] bg-[#f0fdf4] text-[#15803d]",
  보통: "border-[#ffe6b8] bg-[#fff8e1] text-[#8a5b00]",
  높음: "border-[#ffd6d6] bg-[#fff1f2] text-[#f04452]"
};

export default function RiskBadge({ level }: { level: HrCheckpointResult["riskLevel"] }) {
  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-bold ${RISK_CLASS[level]}`}
    >
      위험도 {level}
    </span>
  );
}
