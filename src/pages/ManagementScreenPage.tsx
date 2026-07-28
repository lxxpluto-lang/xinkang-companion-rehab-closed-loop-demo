import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bike,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MonitorCheck,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { StatusBadge } from "../components/UI";

const weeklySessions = [
  { day: "周一", value: 68 },
  { day: "周二", value: 82 },
  { day: "周三", value: 74 },
  { day: "周四", value: 91 },
  { day: "周五", value: 86 },
  { day: "周六", value: 54 },
  { day: "周日", value: 42 }
];

const livePatients = [
  { station: "功率车 01", patient: "陈女士", phase: "主训练", hr: 108, target: "100–116", progress: 68, status: "平稳" },
  { station: "功率车 02", patient: "李先生", phase: "热身", hr: 92, target: "96–112", progress: 18, status: "平稳" },
  { station: "椭圆机 01", patient: "王先生", phase: "主训练", hr: 121, target: "104–120", progress: 53, status: "关注" },
  { station: "抗阻区 02", patient: "赵女士", phase: "组间休息", hr: 88, target: "≤ 110", progress: 76, status: "平稳" }
];

function BigMetric({
  label,
  value,
  unit,
  note,
  icon: Icon,
  tone = "blue"
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  icon: typeof Activity;
  tone?: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600"
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <span className={`rounded-xl p-2 ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-4 text-4xl font-bold tracking-tight text-slate-900">{value}<span className="ml-1 text-sm font-medium text-slate-400">{unit}</span></p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </article>
  );
}

export function ManagementScreenPage() {
  return (
    <section className="management-screen -m-5 min-h-[calc(100vh-82px)] bg-[#f3f6fb] p-5 text-slate-800" data-testid="page-VIEW-MANAGEMENT-SCREEN">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-blue-600"><MonitorCheck className="h-4 w-4" />心脏康复中心 · 实时管理大屏</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">今日运营与临床质量总览</h1>
          <p className="mt-2 text-sm text-slate-400">医生重点关注：训练安全、处方执行、异常处置、患者改善与设备状态</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">2026-07-29</p>
          <p className="mt-1 text-xs text-emerald-600"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />数据更新于 10:42:18</p>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-4">
        <BigMetric label="今日计划患者" value="24" unit="人" note="已到诊 19 人 · 到诊率 79%" icon={UsersRound} />
        <BigMetric label="训练完成率" value="87" unit="%" note="20 / 23 次已完成" icon={CheckCircle2} tone="green" />
        <BigMetric label="靶心率达标率" value="82" unit="%" note="较上周提高 4.6%" icon={HeartPulse} tone="blue" />
        <BigMetric label="异常待复核" value="2" unit="项" note="高优先级 1 项" icon={AlertTriangle} tone="red" />
        <BigMetric label="设备在线率" value="96" unit="%" note="24 / 25 台在线" icon={Bike} tone="amber" />
      </div>

      <div className="mt-4 grid grid-cols-[1.05fr_0.75fr_0.7fr] gap-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div><p className="font-bold">近 7 日训练量</p><p className="mt-1 text-xs text-slate-400">完成训练 326 人次</p></div>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><ArrowUpRight className="h-4 w-4" />12.8%</span>
          </div>
          <div className="mt-6 flex h-40 items-end gap-3">
            {weeklySessions.map((item) => (
              <div key={item.day} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400" style={{ height: `${item.value}%` }}>
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-700">{item.value}</span>
                  </div>
                </div>
                <span className="text-center text-[10px] text-slate-400">{item.day}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold">患者风险分布</p>
          <p className="mt-1 text-xs text-slate-400">在管患者 186 人</p>
          <div className="mt-5 flex items-center gap-6">
            <div className="flex h-32 w-32 items-center justify-center rounded-full" style={{ background: "conic-gradient(#e95b5b 0 18%, #e7a63a 18% 57%, #4f84e8 57% 100%)" }}>
              <div className="management-donut-center flex h-[82px] w-[82px] flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-bold">186</span><span className="text-[10px] text-slate-400">在管患者</span></div>
            </div>
            <div className="flex-1 space-y-3 text-xs">
              {[["高危", "34", "bg-red-500"], ["中危", "73", "bg-amber-500"], ["低危", "79", "bg-blue-500"]].map(([label, value, color]) => <div key={label} className="flex items-center"><span className={`mr-2 h-2.5 w-2.5 rounded-full ${color}`} /><span className="flex-1 text-slate-600">{label}</span><b>{value} 人</b></div>)}
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold">处方与审核质量</p>
          <p className="mt-1 text-xs text-slate-400">今日临床闭环状态</p>
          <div className="mt-5 space-y-4">
            {[
              ["处方已签名", "16 / 19", 84, "bg-blue-500"],
              ["报告已审核", "14 / 18", 78, "bg-emerald-500"],
              ["异常按时处置", "5 / 6", 83, "bg-amber-400"],
              ["数据完整", "21 / 23", 91, "bg-violet-400"]
            ].map(([label, value, percent, color]) => (
              <div key={label as string}>
                <div className="mb-1.5 flex justify-between text-xs"><span className="text-slate-600">{label}</span><b>{value}</b></div>
                <div className="h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-4 grid grid-cols-[1.55fr_0.65fr] gap-4">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="font-bold">当前在训患者</p><p className="mt-1 text-xs text-slate-400">仅展示医生关注数据，现场控制由治疗师执行</p></div><StatusBadge tone="green">4 人在训</StatusBadge></div>
          <div className="grid grid-cols-[1.15fr_0.85fr_0.8fr_0.65fr_0.8fr_1.2fr_0.6fr] px-5 py-2.5 text-[10px] font-bold text-slate-500"><span>设备 / 患者</span><span>阶段</span><span>实时心率</span><span>靶区</span><span>进度</span><span>处方执行</span><span>状态</span></div>
          {livePatients.map((item) => (
            <div key={item.station} className="grid grid-cols-[1.15fr_0.85fr_0.8fr_0.65fr_0.8fr_1.2fr_0.6fr] items-center border-t border-slate-100 px-5 py-3 text-xs">
              <div><p className="font-bold text-slate-900">{item.station}</p><p className="mt-0.5 text-slate-400">{item.patient}</p></div>
              <span className="text-slate-600">{item.phase}</span>
              <b className={item.status === "关注" ? "text-amber-600" : "text-blue-600"}>{item.hr} bpm</b>
              <span className="text-slate-400">{item.target}</span>
              <span className="font-bold">{item.progress}%</span>
              <div className="mr-4 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${item.progress}%` }} /></div>
              <span className={item.status === "关注" ? "font-bold text-amber-600" : "text-emerald-600"}>{item.status}</span>
            </div>
          ))}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between"><div><p className="font-bold">今日临床关注</p><p className="mt-1 text-xs text-slate-400">需要医生处理的事项</p></div><Clock3 className="h-5 w-5 text-slate-400" /></div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3"><div className="flex items-center gap-2 text-xs font-bold text-red-700"><AlertTriangle className="h-4 w-4" />高优先级异常</div><p className="mt-2 text-xs leading-5 text-slate-600">王先生主训练期心率超过靶区 1 bpm，持续 46 秒。</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-xs font-bold text-amber-700"><ShieldCheck className="h-4 w-4" />处方待签名</div><p className="mt-2 text-xs leading-5 text-slate-600">3 份处方已确认参数，尚未完成数字签名。</p></div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><div className="flex items-center gap-2 text-xs font-bold text-blue-700"><Activity className="h-4 w-4" />阶段评估提醒</div><p className="mt-2 text-xs leading-5 text-slate-600">5 位患者已完成本阶段训练，需要评估并开立下一版本。</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs"><span className="text-slate-400">平均异常响应</span><b className="flex items-center gap-1 text-emerald-600"><ArrowDownRight className="h-4 w-4" />2分18秒</b></div>
        </article>
      </div>
    </section>
  );
}
