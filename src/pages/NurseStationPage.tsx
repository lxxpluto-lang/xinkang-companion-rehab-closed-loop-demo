import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Bike, CheckCircle2, ClipboardCheck, Gauge, HeartPulse, Radio, Search, Signal, Timer, UserCheck, Wifi } from "lucide-react";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Role } from "../types";
import { minimalSafetyEvents } from "../clinicalSharedData";

const stationTasks = [
  { id: "NS-01", patientId: "P-DEMO-001", patientNo: "CRH-P-2026-000001", station: "功率车 01", patient: "陈女士", exercise: "功率车", phase: "主训练", elapsed: "12:18", remaining: "09:42", hr: 108, target: "未获取", power: 64, cadence: 61, resistance: 5, progress: 68, connection: "双设备已连接", quality: "数据完整", status: "在训" },
  { id: "NS-02", patientId: "P-DEMO-002", patientNo: "CRH-P-2026-000002", station: "功率车 02", patient: "李先生", exercise: "功率车", phase: "热身", elapsed: "03:42", remaining: "26:18", hr: 92, target: "未获取", power: 28, cadence: 54, resistance: 3, progress: 18, connection: "双设备已连接", quality: "数据完整", status: "在训" },
  { id: "NS-03", patientId: "P-DEMO-003", patientNo: "CRH-P-2026-000003", station: "椭圆机 01", patient: "王先生", exercise: "椭圆机", phase: "等待核验", elapsed: "—", remaining: "30:00", hr: 78, target: "104–120", power: 0, cadence: 0, resistance: 4, progress: 0, connection: "背包已连接", quality: "设备待连接", status: "待开始" },
  { id: "NS-04", patientId: "P-DEMO-004", patientNo: "CRH-P-2026-000004", station: "抗阻区 02", patient: "赵女士", exercise: "哑铃", phase: "已完成", elapsed: "24:00", remaining: "00:00", hr: 86, target: "≤110", power: 0, cadence: 0, resistance: 0, progress: 100, connection: "已归还设备", quality: "数据完整", status: "已完成" }
];

const executableExercises = ["腹式呼吸", "正念呼吸", "功率车", "椭圆机", "哑铃", "弹力带", "柔韧性训练", "八段锦", "太极拳"];

export function NurseStationPage({ role }: { role: Exclude<Role, "PATIENT"> }) {
  const [selectedId, setSelectedId] = useState("NS-01");
  const [arrived, setArrived] = useState<string[]>(["NS-01", "NS-02", "NS-04"]);
  const [note, setNote] = useState("");
  const [exerciseRecords, setExerciseRecords] = useState<Record<string, string[]>>({ "NS-01": ["功率车"], "NS-02": ["功率车"], "NS-03": ["椭圆机"], "NS-04": ["哑铃"] });
  const [actualCompletedCount, setActualCompletedCount] = useState<Record<string, number>>({ "NS-01": 11, "NS-02": 7, "NS-03": 0, "NS-04": 4 });
  const [projectSource, setProjectSource] = useState<Record<string, "rehab_on_site" | "patient_material" | "his_reference">>({ "NS-01": "patient_material", "NS-02": "rehab_on_site", "NS-03": "his_reference", "NS-04": "patient_material" });
  const [savedSelection, setSavedSelection] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [workflowStep, setWorkflowStep] = useState<"select" | "pre" | "device" | "training" | "post" | "reported">("select");
  const [preVitals, setPreVitals] = useState({ bp: "126/78", hr: "73", spo2: "98", rr: "17", symptoms: "无明显不适" });
  const [postVitals, setPostVitals] = useState({ bp: "132/80", hr: "84", spo2: "98", rr: "19", symptoms: "" });
  const [rpe, setRpe] = useState("");
  const selected = useMemo(() => stationTasks.find((item) => item.id === selectedId) ?? stationTasks[0], [selectedId]);
  const canExecute = role !== "DOCTOR";
  const linkedSafetyEvent = minimalSafetyEvents.find((event) => event.patientName === selected.patient);
  const displayPatient = (task: typeof stationTasks[number]) => role !== "DOCTOR" || task.id === "NS-01" ? task.patient : `患者 ${task.patient.slice(0, 1)}**`;
  const toggleArrival = (id: string) => setArrived((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const toggleExercise = (exercise: string) => setExerciseRecords((records) => {
    const current = records[selected.id] ?? [];
    return { ...records, [selected.id]: current.includes(exercise) ? current.filter((item) => item !== exercise) : [...current, exercise] };
  });

  return (
    <section data-testid="page-VIEW-NURSE-STATION">
      <PageHeader eyebrow={role === "DOCTOR" ? "医生 · 只读观察" : role === "ADMIN" ? "管理员 · 全中心" : "康复师 · 当前康复中心"} title="训练大屏" description={role === "DOCTOR" ? "医生只读查看训练进展与异常，现场操作由康复师完成。" : "训练项目优先读取已签署处方，其次读取当日预约；仅在缺失时由现场补充。"} action={<StatusBadge tone="green"><Radio className="h-3.5 w-3.5" />实时数据连接正常</StatusBadge>} />
      <div className="mb-5 grid grid-cols-5 gap-4">
        <StatCard label="今日到诊患者" value="12" note="以现场签到为准" icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="待选择训练项目" value="3" note="对照纸质处方勾选" tone="orange" icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="在训患者" value="2" note="2 台功率车正在运行" tone="green" icon={<Activity className="h-5 w-5" />} />
        <StatCard label="今日实际完成" value="7" note="仅统计已发生训练" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="异常 / 设备提醒" value="1" note="椭圆机等待连接" tone="orange" icon={<AlertTriangle className="h-5 w-5" />} />
      </div>

      <section className="card mb-5 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[260px] flex-1"><p className="text-[10px] font-bold text-blue-600">患者实际到诊</p><p className="mt-1 text-sm font-bold text-slate-900">搜索或扫码选择患者后创建本次执行记录</p></div>
        <label className="relative min-w-[320px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="输入患者姓名或院方编号" className="text-field pl-9" /></label>
        <button type="button" disabled={!canExecute} className="btn-secondary disabled:cursor-not-allowed">扫码识别</button>
        <StatusBadge tone="blue">处方 / 预约 / 现场补充</StatusBadge>
      </section>

      <div className="grid grid-cols-[1.12fr_0.88fr] gap-5">
        <section className="card overflow-hidden">
          <div className="px-5 pt-5"><SectionHeader title="今日到诊与训练记录" description="汇总处方、预约与现场执行状态。" /></div>
          <div className="grid grid-cols-[1fr_0.78fr_0.76fr_0.72fr_0.62fr_0.58fr_0.82fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>设备 / 患者</span><span>患者号</span><span>训练项目</span><span>当前阶段</span><span>心率</span><span>进度</span><span>到诊 / 状态</span></div>
          {stationTasks.map((task) => (
            <button type="button" onClick={() => setSelectedId(task.id)} key={task.id} className={`grid w-full grid-cols-[1fr_0.78fr_0.76fr_0.72fr_0.62fr_0.58fr_0.82fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs ${selectedId === task.id ? "bg-blue-50 ring-1 ring-inset ring-blue-100" : "bg-white hover:bg-slate-50"}`}>
              <div><p className="font-bold text-slate-900">{task.station}</p><p className="mt-1 text-[10px] text-slate-400">{displayPatient(task)}</p></div>
              <span className="font-mono text-[10px] text-slate-500">{role === "DOCTOR" && task.id !== "NS-01" ? "CRH-P-****-******" : task.patientNo}</span>
              <span className="font-semibold text-slate-700">{task.exercise}</span>
              <div><p className="font-semibold text-slate-700">{task.phase}</p><p className="mt-1 text-[10px] text-slate-400">{task.elapsed}</p></div>
              <b className="text-blue-700">{task.hr} bpm</b>
              <span className="font-bold text-slate-700">{task.progress}%</span>
              <div><StatusBadge tone={task.status === "在训" ? "green" : task.status === "已完成" ? "blue" : "orange"}>{task.status}</StatusBadge>{canExecute ? <span onClick={(event) => { event.stopPropagation(); toggleArrival(task.id); }} className="mt-1 block cursor-pointer text-[10px] font-bold text-blue-700">{arrived.includes(task.id) ? "已到诊" : "确认到诊"}</span> : <span className="mt-1 block text-[9px] text-slate-400">只读</span>}</div>
            </button>
          ))}
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserCheck className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-bold text-blue-600">当前患者与训练来源</p><h3 className="mt-1 text-sm font-bold text-slate-900">{displayPatient(selected)} · {exerciseRecords[selected.id]?.[0] ?? selected.exercise}</h3><p className="mt-1 text-[10px] text-slate-500">{projectSource[selected.id] === "his_reference" ? "来源：已签署处方/院内系统" : projectSource[selected.id] === "patient_material" ? "来源：当日预约或患者材料" : "来源：康复师现场补充"} · 历史实际完成 {actualCompletedCount[selected.id] ?? 0} 次</p></div><button type="button" disabled={!canExecute} onClick={() => { setSavedSelection(selected.id); setWorkflowStep("pre"); window.setTimeout(() => setSavedSelection(null), 1600); }} className="btn-primary disabled:cursor-not-allowed disabled:bg-slate-300">进入训练前评估</button></div>
            {savedSelection === selected.id && <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">已建立本次执行记录，下一步采集训练前生命体征。</p>}
          </section>
          {canExecute && workflowStep !== "select" && <ExecutionWorkflow step={workflowStep} setStep={(next) => { if (next === "reported" && workflowStep !== "reported") setActualCompletedCount((items) => ({ ...items, [selected.id]: (items[selected.id] ?? 0) + 1 })); setWorkflowStep(next); }} preVitals={preVitals} setPreVitals={setPreVitals} postVitals={postVitals} setPostVitals={setPostVitals} rpe={rpe} setRpe={setRpe} />}
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
            <div className={`mx-4 mb-4 rounded-lg border px-3 py-2.5 text-xs ${selected.quality === "数据完整" ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><b>{selected.connection}</b> · {selected.quality} · 目标心率未获取，仅记录实际心率</div>
          </section>
          {linkedSafetyEvent && <section className="card border-l-4 border-l-amber-500 p-4">
            <SectionHeader title="异常上报闭环" description="训练大屏只保留现场事实、处置记录和线下医疗联系提示。" action={<StatusBadge tone="orange">需关注</StatusBadge>} />
            <div className="space-y-2 text-xs leading-5 text-slate-600">
              <p><b className="text-slate-900">事件：</b>{linkedSafetyEvent.occurredAt} · {linkedSafetyEvent.type}</p>
              <p><b className="text-slate-900">指标：</b>{linkedSafetyEvent.metricSnapshot}</p>
              <p><b className="text-slate-900">现场处置：</b>{linkedSafetyEvent.fieldAction}</p>
              <p><b className="text-slate-900">后续处理：</b>症状持续或加重时立即停止训练，并线下联系医疗人员。</p>
            </div>
          </section>}
          {canExecute ? <section className="card p-4">
            <SectionHeader title="现场处置记录" description="康复师仅记录现场事实，不形成处方或医学结论。" />
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="text-field min-h-20 resize-none" placeholder="例如：已协助患者坐位休息，复测血压并提示线下联系医疗人员……" />
            <div className="mt-3 flex justify-end"><button type="button" disabled={!note.trim()} onClick={() => setNote("")} className="btn-primary">保存现场记录</button></div>
          </section> : <section className="card border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700">当前为医生只读观察视图。到诊确认、设备连接和现场记录由康复执行岗完成。</section>}
        </div>
      </div>
    </section>
  );
}

function ExecutionWorkflow({ step, setStep, preVitals, setPreVitals, postVitals, setPostVitals, rpe, setRpe }: {
  step: "select" | "pre" | "device" | "training" | "post" | "reported";
  setStep: (step: "select" | "pre" | "device" | "training" | "post" | "reported") => void;
  preVitals: { bp: string; hr: string; spo2: string; rr: string; symptoms: string };
  setPreVitals: (value: { bp: string; hr: string; spo2: string; rr: string; symptoms: string }) => void;
  postVitals: { bp: string; hr: string; spo2: string; rr: string; symptoms: string };
  setPostVitals: (value: { bp: string; hr: string; spo2: string; rr: string; symptoms: string }) => void;
  rpe: string;
  setRpe: (value: string) => void;
}) {
  const order = ["pre", "device", "training", "post", "reported"] as const;
  const labels = ["训练前评估", "设备连接", "训练执行", "训练后评估", "单次报告"];
  const activeIndex = order.indexOf(step as typeof order[number]);
  return <section className="card p-4">
    <div className="grid grid-cols-5 gap-2">{labels.map((label, index) => <div key={label} className={`rounded-lg px-2 py-2 text-center text-[10px] font-bold ${index <= activeIndex ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{index + 1}. {label}</div>)}</div>
    {step === "pre" && <div className="mt-4"><SectionHeader title="训练前评估" description="血压为间歇测量；RPE不设默认值，由患者主动选择。" /><VitalEditor value={preVitals} onChange={setPreVitals} /><div className="mt-3 flex items-end justify-between"><label><span className="field-label">训练前主观用力感 RPE（6–20）</span><select value={rpe} onChange={(event) => setRpe(event.target.value)} className="text-field w-52"><option value="">请选择，不设默认值</option>{Array.from({ length: 15 }, (_, index) => index + 6).map((value) => <option key={value}>{value}</option>)}</select></label><button type="button" disabled={!rpe || !preVitals.bp || !preVitals.hr} onClick={() => setStep("device")} className="btn-primary disabled:bg-slate-300">保存并检查设备</button></div></div>}
    {step === "device" && <div className="mt-4"><SectionHeader title="设备连接检查" description="背包与训练设备均连接后才能开始训练。" /><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"><b>✓ 生理数据背包已连接</b><p className="mt-1">心率、血氧与心电信号正常</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"><b>✓ 功率车已连接</b><p className="mt-1">功率、踏频、速度与距离可采集</p></div></div><div className="mt-3 flex justify-end"><button type="button" onClick={() => setStep("training")} className="btn-primary">进入视频训练</button></div></div>}
    {step === "training" && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center justify-between"><div><b className="text-sm text-blue-950">训练数据采集中</b><p className="mt-1 text-xs text-blue-700">完成后进入生命体征复测；暂停、终止和异常将写入单次报告。</p></div><button type="button" onClick={() => setStep("post")} className="btn-primary">模拟训练完成</button></div></div>}
    {step === "post" && <div className="mt-4"><SectionHeader title="训练后评估" description="复测生命体征并记录患者主诉和最终RPE。" /><VitalEditor value={postVitals} onChange={setPostVitals} /><div className="mt-3 flex items-end justify-between"><label><span className="field-label">训练后RPE（6–20）</span><select value={rpe} onChange={(event) => setRpe(event.target.value)} className="text-field w-52"><option value="">请选择，不设默认值</option>{Array.from({ length: 15 }, (_, index) => index + 6).map((value) => <option key={value}>{value}</option>)}</select></label><button type="button" disabled={!rpe || !postVitals.bp || !postVitals.hr} onClick={() => setStep("reported")} className="btn-primary disabled:bg-slate-300">完成并生成单次报告</button></div></div>}
    {step === "reported" && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center justify-between"><div><b className="text-sm text-emerald-900">单次报告已自动生成</b><p className="mt-1 text-xs text-emerald-700">已记录训练前后生命体征、设备指标、RPE、异常和处置；本次计入实际累计次数，不代表处方完成进度。</p></div><StatusBadge tone="green">待康复师确认</StatusBadge></div></div>}
  </section>;
}

function VitalEditor({ value, onChange }: { value: { bp: string; hr: string; spo2: string; rr: string; symptoms: string }; onChange: (value: { bp: string; hr: string; spo2: string; rr: string; symptoms: string }) => void }) {
  const field = (key: keyof typeof value, label: string, placeholder = "") => <label key={key}><span className="field-label">{label}</span><input value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} placeholder={placeholder} className="text-field" /></label>;
  return <div className="mt-3 grid grid-cols-5 gap-3">{field("bp", "血压 mmHg", "如126/78")}{field("hr", "心率 bpm")}{field("spo2", "血氧 %")}{field("rr", "呼吸率 次/分")}{field("symptoms", "主诉/症状", "无明显不适")}</div>;
}

function NurseMetric({ icon: Icon, label, value, unit, highlight = false }: { icon: typeof Activity; label: string; value: string; unit: string; highlight?: boolean }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</p><p className={`mt-2 text-lg font-bold ${highlight ? "text-blue-700" : "text-slate-900"}`}>{value}<span className="ml-1 text-[9px] text-slate-400">{unit}</span></p></div>;
}
