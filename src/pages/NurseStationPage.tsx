import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Bike, CheckCircle2, ClipboardCheck, Gauge, HeartPulse, Radio, Signal, Timer, UserCheck, Wifi } from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Role } from "../types";
import { minimalSafetyEvents } from "../clinicalSharedData";

const stationTasks = [
  { id: "NS-01", patientId: "P-DEMO-001", station: "功率车 01", patient: "陈女士", exercise: "功率车", phase: "主训练", elapsed: "12:18", remaining: "09:42", hr: 108, target: "100–116", power: 64, cadence: 61, resistance: 5, progress: 68, connection: "双设备已连接", quality: "数据完整", status: "在训" },
  { id: "NS-02", patientId: "P-DEMO-002", station: "功率车 02", patient: "李先生", exercise: "功率车", phase: "热身", elapsed: "03:42", remaining: "26:18", hr: 92, target: "96–112", power: 28, cadence: 54, resistance: 3, progress: 18, connection: "双设备已连接", quality: "数据完整", status: "在训" },
  { id: "NS-03", patientId: "P-DEMO-003", station: "椭圆机 01", patient: "王先生", exercise: "椭圆机", phase: "等待核验", elapsed: "—", remaining: "30:00", hr: 78, target: "104–120", power: 0, cadence: 0, resistance: 4, progress: 0, connection: "背包已连接", quality: "设备待连接", status: "待开始" },
  { id: "NS-04", patientId: "P-DEMO-004", station: "抗阻区 02", patient: "赵女士", exercise: "哑铃", phase: "已完成", elapsed: "24:00", remaining: "00:00", hr: 86, target: "≤110", power: 0, cadence: 0, resistance: 0, progress: 100, connection: "已归还设备", quality: "数据完整", status: "已完成" }
];

export function NurseStationPage({ role }: { role: Exclude<Role, "PATIENT"> }) {
  const [selectedId, setSelectedId] = useState("NS-01");
  const [arrived, setArrived] = useState<string[]>(["NS-01", "NS-02", "NS-04"]);
  const [note, setNote] = useState("");
  const selected = useMemo(() => stationTasks.find((item) => item.id === selectedId) ?? stationTasks[0], [selectedId]);
  const canExecute = role === "ADMIN" || role === "REHAB_EXECUTION";
  const linkedSafetyEvent = minimalSafetyEvents.find((event) => event.patientName === selected.patient);
  const displayPatient = (task: typeof stationTasks[number]) => role !== "DOCTOR" || task.id === "NS-01" ? task.patient : `患者 ${task.patient.slice(0, 1)}**`;
  const toggleArrival = (id: string) => setArrived((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return (
    <section data-testid="page-VIEW-NURSE-STATION">
      <PageHeader eyebrow={canExecute ? "康复执行岗 · 当前康复中心" : "医生观察视图 · 非本人任务匿名"} title="训练工作台" description={canExecute ? "康复执行岗查看到诊、设备与在训状态，完成现场记录和异常上报；设备开始、暂停和停止仍在患者训练Pad端完成。" : "医生可查看本中心训练概览；仅本人负责的患者显示身份与详细指标，其他患者自动脱敏。"} action={<StatusBadge tone="green"><Radio className="h-3.5 w-3.5" />实时数据连接正常</StatusBadge>} />
      <div className="mb-5 grid grid-cols-5 gap-4">
        <StatCard label="今日计划患者" value="15" note="上午 9 人 · 下午 6 人" icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="已到诊患者" value="12" note="3 人尚未到诊" tone="green" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="在训患者" value="2" note="2 台功率车正在运行" tone="green" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="已完成训练" value="7" note="完成率 58%" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="异常 / 设备提醒" value="1" note="椭圆机等待连接" tone="orange" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-[1.12fr_0.88fr] gap-5">
        <section className="card overflow-hidden">
          <div className="px-5 pt-5"><SectionHeader title="今日训练任务" description="点击任务查看对应设备与患者动态数据。" /></div>
          <div className="grid grid-cols-[1fr_0.78fr_0.76fr_0.72fr_0.62fr_0.58fr_0.82fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>设备 / 患者</span><span>患者编码</span><span>训练项目</span><span>当前阶段</span><span>心率</span><span>进度</span><span>到诊 / 状态</span></div>
          {stationTasks.map((task) => (
            <button type="button" onClick={() => setSelectedId(task.id)} key={task.id} className={`grid w-full grid-cols-[1fr_0.78fr_0.76fr_0.72fr_0.62fr_0.58fr_0.82fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs ${selectedId === task.id ? "bg-blue-50 ring-1 ring-inset ring-blue-100" : "bg-white hover:bg-slate-50"}`}>
              <div><p className="font-bold text-slate-900">{task.station}</p><p className="mt-1 text-[10px] text-slate-400">{displayPatient(task)}</p></div>
              <span className="font-mono text-[10px] text-slate-500">{role === "DOCTOR" && task.id !== "NS-01" ? "P-******" : task.patientId}</span>
              <span className="font-semibold text-slate-700">{task.exercise}</span>
              <div><p className="font-semibold text-slate-700">{task.phase}</p><p className="mt-1 text-[10px] text-slate-400">{task.elapsed}</p></div>
              <b className={task.hr > Number(task.target.split("–")[1]) ? "text-amber-700" : "text-blue-700"}>{task.hr} bpm</b>
              <span className="font-bold text-slate-700">{task.progress}%</span>
              <div><StatusBadge tone={task.status === "在训" ? "green" : task.status === "已完成" ? "blue" : "orange"}>{task.status}</StatusBadge>{canExecute ? <span onClick={(event) => { event.stopPropagation(); toggleArrival(task.id); }} className="mt-1 block cursor-pointer text-[10px] font-bold text-blue-700">{arrived.includes(task.id) ? "已到诊" : "确认到诊"}</span> : <span className="mt-1 block text-[9px] text-slate-400">只读</span>}</div>
            </button>
          ))}
        </section>

        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-bold text-blue-600">动态设备视图</p><h2 className="mt-1 text-lg font-bold text-slate-900">{selected.station} · {displayPatient(selected)}</h2></div><StatusBadge tone={selected.status === "在训" ? "green" : "orange"}>{selected.status}</StatusBadge></div>
            <div className="grid grid-cols-[0.92fr_1.08fr]">
              <div className="nurse-bike-stage relative flex min-h-[230px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-slate-50 p-5">
                <span className={`absolute right-4 top-4 flex items-center gap-1.5 text-[10px] font-bold ${selected.status === "在训" ? "text-emerald-600" : "text-slate-400"}`}><Signal className="h-3.5 w-3.5" />{selected.status === "在训" ? "数据刷新中" : "静止"}</span>
                <div className={selected.status === "在训" ? "nurse-bike-moving" : ""}><Bike className="h-28 w-28 text-blue-600" strokeWidth={1.5} /></div>
                <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-700"><span className={`h-2 w-2 rounded-full ${selected.status === "在训" ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />{selected.phase}</div>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${selected.progress}%` }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4">
                <NurseMetric icon={HeartPulse} label="实时心率" value={`${selected.hr}`} unit="bpm" highlight />
                <NurseMetric icon={Timer} label="剩余时间" value={selected.remaining} unit="" />
                <NurseMetric icon={Gauge} label="实时功率" value={`${selected.power}`} unit="W" />
                <NurseMetric icon={Activity} label="踏频" value={`${selected.cadence}`} unit="rpm" />
                <NurseMetric icon={Bike} label="阻力" value={`${selected.resistance}`} unit="级" />
                <NurseMetric icon={Wifi} label="连接" value={selected.connection.includes("双设备") ? "正常" : "待连接"} unit="" />
              </div>
            </div>
            <div className={`mx-4 mb-4 rounded-lg border px-3 py-2.5 text-xs ${selected.quality === "数据完整" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><b>{selected.connection}</b> · {selected.quality} · 靶心率 {selected.target} bpm</div>
          </section>
          {linkedSafetyEvent && <section className="card border-l-4 border-l-amber-500 p-4">
            <SectionHeader title="异常上报闭环" description="训练工作台只保留最小闭环：现场事实、医生复核状态和对下一处方的影响。" action={<StatusBadge tone={linkedSafetyEvent.doctorReviewStatus === "医生已复核" ? "green" : "orange"}>{linkedSafetyEvent.doctorReviewStatus}</StatusBadge>} />
            <div className="space-y-2 text-xs leading-5 text-slate-600">
              <p><b className="text-slate-900">事件：</b>{linkedSafetyEvent.occurredAt} · {linkedSafetyEvent.type}</p>
              <p><b className="text-slate-900">指标：</b>{linkedSafetyEvent.metricSnapshot}</p>
              <p><b className="text-slate-900">现场处置：</b>{linkedSafetyEvent.fieldAction}</p>
              <p><b className="text-slate-900">医生复核：</b>{linkedSafetyEvent.doctorReview}</p>
            </div>
          </section>}
          {canExecute ? <section className="card p-4">
            <SectionHeader title="现场处置记录" description="护士仅记录现场事实，不形成处方或医学结论。" />
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="text-field min-h-20 resize-none" placeholder="例如：已协助患者坐位休息，复测血压并通知康复医生……" />
            <div className="mt-3 flex justify-end"><button type="button" disabled={!note.trim()} onClick={() => setNote("")} className="btn-primary">保存现场记录</button></div>
          </section> : <section className="card border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700">当前为医生只读观察视图。到诊确认、设备连接和现场记录由康复执行岗完成。</section>}
        </div>
      </div>
    </section>
  );
}

function NurseMetric({ icon: Icon, label, value, unit, highlight = false }: { icon: typeof Activity; label: string; value: string; unit: string; highlight?: boolean }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-2 text-lg font-bold ${highlight ? "text-blue-700" : "text-slate-900"}`}>{value}<span className="ml-1 text-[9px] text-slate-400">{unit}</span></p></div>;
}
