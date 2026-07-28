import { Check } from "lucide-react";

const steps = ["处方确认", "训练前核验", "设备接入", "训练监测", "异常处置", "AI 报告", "医生审核"];

export function Workflow({ current = 0 }: { current?: number }) {
  return (
    <div className="card mb-6 px-5 py-4" data-testid="region-REG-GLOBAL-WORKFLOW">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div className="flex min-w-0 flex-1 items-center" key={step}>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index < current
                    ? "bg-emerald-600 text-white"
                    : index === current
                      ? "bg-medical-700 text-white ring-4 ring-medical-100"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {index < current ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={`truncate text-xs font-semibold ${
                  index === current ? "text-medical-800" : index < current ? "text-emerald-700" : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className={`mx-3 h-px flex-1 ${index < current ? "bg-emerald-300" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
