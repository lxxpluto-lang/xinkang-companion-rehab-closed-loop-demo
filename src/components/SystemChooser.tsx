import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Tablet,
  UsersRound
} from "lucide-react";

const doctorFeatures = [
  { label: "角色权限登录", icon: ShieldCheck },
  { label: "训练数据工作台", icon: Activity },
  { label: "AI阶段报告", icon: BarChart3 },
  { label: "OCR与随访", icon: FileCheck2 }
];

const patientFeatures = [
  { label: "今日任务", icon: ClipboardCheck },
  { label: "训练准备", icon: ShieldCheck },
  { label: "阶段引导", icon: Activity },
  { label: "训练结果", icon: BarChart3 }
];

export function SystemChooser({ onChoose }: { onChoose: (system: "doctor" | "patient") => void }) {
  return (
    <main
      className="min-h-screen overflow-hidden bg-[#edf3f5] p-5 sm:p-8"
      data-testid="page-VIEW-SYSTEM-CHOOSER"
    >
      <div className="pointer-events-none fixed -left-28 -top-32 h-[420px] w-[420px] rounded-full bg-medical-200/40 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 right-0 h-[480px] w-[480px] rounded-full bg-sky-100/70 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-[1240px] flex-col">
        <header className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-medical-600 text-white shadow-lg shadow-medical-800/15">
              <HeartPulse className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#17324d]">心康伴侣</h1>
              <p className="mt-0.5 text-xs text-slate-500">冠心病Ⅱ期院内康复多模态 AI 辅助平台</p>
            </div>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-xs font-bold text-amber-700 shadow-sm">
            需求调研 Demo · 模拟/脱敏数据
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="mb-8 max-w-3xl">
            <p className="eyebrow mb-3">CLINICAL REHABILITATION COMPANION</p>
            <h2 className="text-[42px] font-bold leading-[1.18] tracking-[-0.03em] text-[#17324d]">
              让每一次心脏康复训练，
              <br />
              更安全、更清晰。
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              聚合院内训练数据、OCR评估和阶段报告；病历与正式处方继续由医院现有系统管理，患者训练仅在院内 Pad/触控大屏执行。
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <button
              type="button"
              onClick={() => onChoose("doctor")}
              data-action="ACT-CHOOSE-DOCTOR"
              className="group relative min-h-[330px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#123d54] via-[#15566a] to-[#1f7e79] p-8 text-left text-white shadow-float transition-transform hover:-translate-y-1"
            >
              <span className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-white/[0.07]" />
              <span className="absolute -right-4 top-12 h-44 w-44 rounded-full border border-white/[0.07]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
                    <Stethoscope className="h-7 w-7 text-teal-100" />
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-teal-50 ring-1 ring-white/15">
                    医护 Web 工作站
                  </span>
                </div>
                <h3 className="mt-8 text-3xl font-bold tracking-tight">训练数据与报告后台</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                  康复师对照纸质处方选择本次训练项目，系统沉淀训练记录并生成单次、阶段和出院报告。
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {doctorFeatures.map(({ label, icon: Icon }) => (
                    <span key={label} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-100">
                      <Icon className="h-3.5 w-3.5 text-teal-200" />
                      {label}
                    </span>
                  ))}
                </div>
                <span className="mt-auto flex items-center gap-2 pt-7 text-sm font-bold">
                  进入医护身份登录
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChoose("patient")}
              data-action="ACT-CHOOSE-PATIENT"
              className="group min-h-[330px] rounded-[24px] border border-[#d5e3e7] bg-white/95 p-8 text-left shadow-card transition-transform hover:-translate-y-1 hover:border-medical-300 hover:shadow-float"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-medical-50 text-medical-600 ring-1 ring-medical-100">
                    <Tablet className="h-7 w-7" />
                  </span>
                  <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
                    iPad / Android 横屏
                  </span>
                </div>
                <h3 className="mt-8 text-3xl font-bold tracking-tight text-[#17324d]">院内训练 Pad</h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                  不建设独立患者小程序；本入口仅模拟院内 Pad/电视触控屏上的跟练、实时指标和安全提示。
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  {patientFeatures.map(({ label, icon: Icon }) => (
                    <span key={label} className="flex items-center gap-2 rounded-xl bg-[#f3f7f8] px-3 py-2.5 text-xs font-semibold text-slate-600">
                      <Icon className="h-4 w-4 text-medical-600" />
                      {label}
                    </span>
                  ))}
                </div>
                <span className="mt-auto flex items-center gap-2 pt-7 text-sm font-bold text-medical-700">
                  模拟院内训练大屏
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </button>
          </div>
        </section>

        <footer className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-medical-600" />
          系统不重复录入 HIS 病历或正式处方；AI 仅辅助汇总报告，所有高风险结论均由医生确认。
        </footer>
      </div>
    </main>
  );
}
