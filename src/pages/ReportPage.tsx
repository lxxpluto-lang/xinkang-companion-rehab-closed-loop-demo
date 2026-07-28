import { useState } from "react";
import { Activity, ArrowRight, CalendarRange, CheckCircle2, FileText, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";

const singleReports = [
  { id: "TR-20260728-018", taskId: "RX-TASK-002", patient: "李先生", date: "2026-07-28 09:20", exercise: "功率车", duration: "30分钟", target: "81%", risk: "无异常", status: "已完成" },
  { id: "TR-20260725-012", taskId: "RX-TASK-001", patient: "陈女士", date: "2026-07-25 09:30", exercise: "功率车", duration: "32分钟", target: "84%", risk: "胸闷1次", status: "已审核" },
  { id: "TR-20260723-011", taskId: "RX-TASK-001", patient: "陈女士", date: "2026-07-23 09:20", exercise: "功率车", duration: "30分钟", target: "79%", risk: "无异常", status: "已完成" }
];

const stageReports = [
  { id: "STAGE-202607", taskId: "RX-TASK-001", patient: "陈女士", date: "07-01 至 07-25", exercise: "功率车 V1–V4", duration: "11/12次", target: "84%", risk: "1项已复核", status: "处方待复核" },
  { id: "STAGE-202607-003", taskId: "RX-TASK-003", patient: "王先生", date: "07-05 至 07-28", exercise: "功率车 V1–V3", duration: "9/10次", target: "78%", risk: "无重大异常", status: "处方待签名" },
  { id: "STAGE-202607-005", taskId: "RX-TASK-005", patient: "周先生", date: "06-20 至 07-25", exercise: "综合运动 V1–V4", duration: "12/12次", target: "88%", risk: "无异常", status: "处方已完成" }
];

export function ReportPage({ onCreatePrescription }: { onCreatePrescription: (taskId: string) => void }) {
  const [tab, setTab] = useState<"stage" | "single">("stage");
  const [selectedId, setSelectedId] = useState(stageReports[0].id);
  const reports = tab === "stage" ? stageReports : singleReports;
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0];

  function switchTab(next: "stage" | "single") {
    setTab(next);
    setSelectedId(next === "stage" ? stageReports[0].id : singleReports[0].id);
  }

  return (
    <section data-testid="page-VIEW-REPORT-CENTER">
      <PageHeader eyebrow="报告中心" title="训练报告与处方依据" description="医生先查看单次或阶段性报告，再基于报告进入AI处方生成与复核流程。" />
      <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-1">
        <button type="button" onClick={() => switchTab("stage")} className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-bold ${tab === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}><CalendarRange className="h-4 w-4" />阶段性报告</button>
        <button type="button" onClick={() => switchTab("single")} className={`flex items-center gap-2 rounded-lg px-5 py-2.5 font-bold ${tab === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}><FileText className="h-4 w-4" />单次报告</button>
      </div>
      <div className="grid grid-cols-[1.15fr_0.85fr] gap-5">
        <section className="card overflow-hidden">
          <div className="px-5 pt-5"><SectionHeader title={tab === "stage" ? "阶段性报告列表" : "单次训练报告列表"} description="按报告生成时间倒序排列。" /></div>
          <div className="grid grid-cols-[1fr_1.1fr_1.05fr_0.75fr_0.7fr_0.8fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>患者 / 报告</span><span>日期范围</span><span>运动内容</span><span>完成情况</span><span>靶区</span><span>状态</span></div>
          {reports.map((report) => <button type="button" onClick={() => setSelectedId(report.id)} key={report.id} className={`grid w-full grid-cols-[1fr_1.1fr_1.05fr_0.75fr_0.7fr_0.8fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs ${selected.id === report.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><div><b className="text-slate-900">{report.patient}</b><p className="mt-1 text-[10px] text-slate-400">{report.id}</p></div><span className="text-slate-600">{report.date}</span><span className="font-semibold text-slate-700">{report.exercise}</span><span>{report.duration}</span><b className="text-blue-700">{report.target}</b><StatusBadge tone={report.status.includes("完成") || report.status === "已审核" ? "green" : "orange"}>{report.status}</StatusBadge></button>)}
        </section>
        <section className="card p-5">
          <SectionHeader title={`${selected.patient} · ${tab === "stage" ? "阶段结论" : "本次结论"}`} action={<StatusBadge tone={selected.risk.includes("无") ? "green" : "orange"}>{selected.risk}</StatusBadge>} />
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="flex items-center gap-2 font-bold text-blue-900"><Activity className="h-4 w-4" />医生摘要</p>
            <p className="mt-2 text-xs leading-6 text-slate-600">{tab === "stage" ? "患者本阶段处方完成度良好，靶心率达标时间较上一阶段提高，生命体征总体平稳。建议在保持频次的基础上小幅调整主训练功率，并继续观察主观症状。" : "本次训练按处方完成，心率主要位于目标区间，血压与血氧未见明显异常，可作为下一次处方调整的辅助依据。"}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">{[["报告类型", tab === "stage" ? "阶段性报告" : "单次报告"], ["处方执行", selected.duration], ["靶区达标", selected.target], ["安全事件", selected.risk]].map(([label, value]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold text-slate-800">{value}</p></div>)}</div>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><ShieldAlert className="mr-1.5 inline h-4 w-4" />AI会引用该报告、上一处方和安全事件生成草稿，但医生仍需核对缺失数据和患者主诉。</div>
          <button type="button" onClick={() => onCreatePrescription(selected.taskId)} className="btn-primary mt-5 w-full"><Sparkles className="h-4 w-4" />基于此报告开具处方<ArrowRight className="h-4 w-4" /></button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400"><CheckCircle2 className="h-3.5 w-3.5" />处方必须经医生复核和数字签名后生效</p>
        </section>
      </div>
    </section>
  );
}
