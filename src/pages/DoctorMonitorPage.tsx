import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bike,
  CheckCircle2,
  Eye,
  HeartPulse,
  Radio,
  Tablet,
  WifiOff
} from "lucide-react";
import type { DoctorPageKey } from "../types";
import { PageHeader, SectionHeader, StatusBadge } from "../components/UI";

const stations = [
  {
    station: "01 号功率车",
    patient: "P-DEMO-001",
    stage: "主训练 · 12:18",
    hr: "104",
    target: "92–118",
    power: "52 W",
    cadence: "61 rpm",
    quality: "simulated",
    status: "训练中"
  },
  {
    station: "02 号功率车",
    patient: "P-DEMO-002",
    stage: "热身 · 03:42",
    hr: "88",
    target: "90–112",
    power: "24 W",
    cadence: "54 rpm",
    quality: "simulated",
    status: "训练中"
  },
  {
    station: "视觉训练区",
    patient: "P-DEMO-003",
    stage: "八段锦 · 04:46",
    hr: "—",
    target: "不适用",
    power: "8 次",
    cadence: "置信度 71%",
    quality: "需人工确认",
    status: "低置信度"
  }
];

export function DoctorMonitorPage({ onNavigate }: { onNavigate: (page: DoctorPageKey) => void }) {
  return (
    <section data-testid="page-VIEW-DOCTOR-MONITOR">
      <PageHeader
        eyebrow="医生只读视角"
        title="院内训练概览"
        description="医生集中查看在训患者和数据质量；训练启动、暂停、停止由患者训练端的现场治疗师执行。"
        action={<StatusBadge tone="green"><Radio className="h-3.5 w-3.5" />3 个训练任务进行中</StatusBadge>}
      />

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          ["在训任务", "3", Activity, "text-medical-700 bg-medical-50"],
          ["设备在线", "2 / 2", Bike, "text-emerald-700 bg-emerald-50"],
          ["视觉来源", "1", Tablet, "text-blue-700 bg-blue-50"],
          ["需要关注", "1", AlertTriangle, "text-amber-700 bg-amber-50"]
        ].map(([label, value, Icon, tone]) => {
          const MetricIcon = Icon as typeof Activity;
          return (
            <article className="card p-5" key={label as string}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><MetricIcon className="h-5 w-5" /></span>
              <p className="mt-4 text-sm text-slate-500">{label as string}</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{value as string}</p>
            </article>
          );
        })}
      </div>

      <section className="card overflow-hidden" data-testid="region-REG-DOCTOR-MONITOR-LIST">
        <div className="p-5">
          <SectionHeader
            title="当前训练任务"
            description="仅显示医生复核所需摘要，不在 Web 端提供患者训练控制。"
          />
        </div>
        <div className="border-t border-slate-200">
          <div className="grid grid-cols-[1.25fr_1fr_0.75fr_0.8fr_0.9fr_0.85fr_110px] bg-slate-50 px-5 py-3 text-xs font-bold text-slate-500">
            <span>训练位置 / 患者</span><span>阶段</span><span>心率</span><span>目标区间</span><span>训练量</span><span>数据质量</span><span>医生操作</span>
          </div>
          {stations.map((station) => (
            <div className="grid grid-cols-[1.25fr_1fr_0.75fr_0.8fr_0.9fr_0.85fr_110px] items-center border-t border-slate-100 px-5 py-4 text-sm" key={station.station}>
              <div>
                <p className="font-bold text-slate-900">{station.station}</p>
                <p className="mt-1 text-xs text-slate-500">{station.patient}</p>
              </div>
              <div><StatusBadge tone={station.status === "低置信度" ? "orange" : "green"}>{station.status}</StatusBadge><p className="mt-1.5 text-xs text-slate-500">{station.stage}</p></div>
              <p className="text-xl font-bold text-slate-900">{station.hr}<span className="ml-1 text-xs font-medium text-slate-400">{station.hr !== "—" ? "bpm" : ""}</span></p>
              <p className="font-semibold text-slate-700">{station.target}</p>
              <div><p className="font-semibold text-slate-800">{station.power}</p><p className="mt-1 text-xs text-slate-500">{station.cadence}</p></div>
              <StatusBadge tone={station.quality === "需人工确认" ? "orange" : "blue"}>{station.quality}</StatusBadge>
              <button className="inline-flex items-center gap-1.5 font-bold text-medical-700 hover:text-medical-900" type="button" onClick={() => onNavigate(station.status === "低置信度" ? "patient" : "abnormal")}>
                <Eye className="h-4 w-4" />查看详情
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <section className="card p-5">
          <SectionHeader title="医生端与训练端的职责边界" />
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-medical-50 p-4">
              <p className="flex items-center gap-2 font-bold text-medical-800"><HeartPulse className="h-4 w-4" />医生 Web</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">查看数据、调整下一次处方、复核异常与报告；不直接操作患者当前设备。</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="flex items-center gap-2 font-bold text-emerald-800"><Tablet className="h-4 w-4" />患者训练端</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">现场治疗师完成设备与训练操作；患者查看目标、反馈感受和呼叫医护。</p>
            </div>
          </div>
        </section>
        <section className="card border-l-4 border-l-amber-400 p-5">
          <SectionHeader title="数据质量提醒" action={<StatusBadge tone="orange">1 项</StatusBadge>} />
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
            <WifiOff className="mt-0.5 h-5 w-5 text-amber-700" />
            <div className="flex-1">
              <p className="font-bold text-slate-900">视觉训练置信度较低</p>
              <p className="mt-1 text-sm text-slate-600">P-DEMO-003 当前片段 71%，等待现场治疗师人工确认。</p>
            </div>
            <button className="flex items-center gap-1 text-sm font-bold text-medical-700" type="button" onClick={() => onNavigate("patient")}>查看患者<ArrowRight className="h-4 w-4" /></button>
          </div>
        </section>
      </div>
    </section>
  );
}
