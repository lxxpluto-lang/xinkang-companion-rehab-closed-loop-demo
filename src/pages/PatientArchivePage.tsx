import { useState } from "react";
import { Activity, ArrowRight, FileText, Search, UserRound } from "lucide-react";
import { demoPatients } from "../mockData";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";

export function PatientArchivePage() {
  const [selectedId, setSelectedId] = useState(demoPatients[0].patient_demo_id);
  const selected = demoPatients.find((patient) => patient.patient_demo_id === selectedId) ?? demoPatients[0];
  return (
    <section data-testid="page-VIEW-PATIENT-ARCHIVES">
      <PageHeader eyebrow="患者档案" title="患者与康复档案" description="仅维护基础信息、危险分组、基线评估、处方版本和报告历史；处方复核在处方管理中完成。" />
      <div className="grid grid-cols-[0.72fr_1.28fr] gap-5">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs" placeholder="搜索患者" /></label></div>
          {demoPatients.map((patient) => <button type="button" onClick={() => setSelectedId(patient.patient_demo_id)} key={patient.patient_demo_id} className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left ${selectedId === patient.patient_demo_id ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200"><UserRound className="h-4 w-4" /></span><span className="flex-1"><b className="block text-slate-900">{patient.patient_demo_id}</b><small className="mt-1 block text-slate-400">{patient.age}岁 · {patient.gender}</small></span><StatusBadge tone={patient.risk_level === "高危" ? "red" : patient.risk_level === "中危" ? "orange" : "green"}>{patient.risk_level}</StatusBadge></button>)}
        </section>
        <div className="space-y-5">
          <section className="card p-5"><SectionHeader title={`${selected.patient_demo_id} · 基础档案`} action={<StatusBadge tone={selected.risk_level === "高危" ? "red" : selected.risk_level === "中危" ? "orange" : "green"}>{selected.risk_level}</StatusBadge>} /><div className="grid grid-cols-4 gap-3">{[["年龄/性别", `${selected.age}岁 / ${selected.gender}`], ["诊断摘要", selected.diagnosis_summary], ["CPET", selected.assessment.cpet], ["6MWT", selected.assessment.six_mwt]].map(([label, value]) => <div className="rounded-xl bg-slate-50 p-3" key={label}><p className="text-[10px] text-slate-400">{label}</p><p className="mt-2 font-bold leading-5 text-slate-800">{value}</p></div>)}</div></section>
          <div className="grid grid-cols-2 gap-5">
            <section className="card p-5"><SectionHeader title="处方历史" /><div className="space-y-3">{[["V4.0", "2026-07-25", "当前执行"], ["V3.1", "2026-07-11", "已归档"], ["V2.0", "2026-06-26", "已归档"]].map(([version, date, status]) => <div className="flex items-center rounded-lg border border-slate-100 p-3" key={version}><FileText className="h-4 w-4 text-blue-600" /><span className="ml-2 flex-1 font-bold text-slate-700">{version}<small className="ml-2 font-normal text-slate-400">{date}</small></span><StatusBadge tone={status === "当前执行" ? "green" : "gray"}>{status}</StatusBadge></div>)}</div></section>
            <section className="card p-5"><SectionHeader title="报告历史" /><div className="space-y-3">{[["阶段性报告", "07-01至07-25", "已审核"], ["单次报告", "07-25 功率车", "已完成"], ["单次报告", "07-23 功率车", "已完成"]].map(([type, date, status]) => <div className="flex items-center rounded-lg border border-slate-100 p-3" key={type + date}><Activity className="h-4 w-4 text-emerald-600" /><span className="ml-2 flex-1 font-bold text-slate-700">{type}<small className="ml-2 font-normal text-slate-400">{date}</small></span><StatusBadge tone="green">{status}</StatusBadge></div>)}</div></section>
          </div>
          <section className="card border-l-4 border-l-blue-500 p-4"><div className="flex items-center"><div className="flex-1"><p className="font-bold text-slate-800">最近一次训练摘要（医生只读）</p><p className="mt-1 text-xs text-slate-500">07-28 功率车 · 完成32分钟 · 靶区达标84% · 无提前终止</p></div><button type="button" className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">查看单次报告<ArrowRight className="h-4 w-4" /></button></div></section>
        </div>
      </div>
    </section>
  );
}
