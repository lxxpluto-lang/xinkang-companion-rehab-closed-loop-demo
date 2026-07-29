import { useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, BadgeCheck, CalendarClock, CheckCircle2, FileText, MonitorUp, PenTool, PhoneCall, Printer, Signature, Sparkles, UserCheck } from "lucide-react";
import { doctorAppointments, prescriptionStatusLabels, type DoctorAppointment, type PrescriptionStatus, type PrescriptionTask } from "../prescriptionData";
import { PrescriptionWorklist } from "../components/PrescriptionWorklist";
import { PageHeader, SectionHeader, StatCard, StatusBadge } from "../components/UI";
import type { Role } from "../types";
import { clinicalSnapshotChen, getPrescriptionVersionDetail, getSingleTrainingReportDetail, minimalSafetyEvents } from "../clinicalSharedData";
import { stageReportData } from "../patient/stageReportData";

export function DashboardPage({
  role,
  tasks,
  onOpen,
  onGenerate,
  onConfirm,
  onSign
}: {
  role: Exclude<Role, "PATIENT">;
  tasks: PrescriptionTask[];
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
  onConfirm: (taskId: string) => void;
  onSign: (taskId: string) => void;
}) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const count = (status: PrescriptionStatus) => tasks.filter((task) => task.status === status).length;
  const selectedAppointment = doctorAppointments.find((item) => item.id === selectedAppointmentId);
  if (role === "REHAB_EXECUTION") {
    return (
      <section data-testid="page-VIEW-DASHBOARD">
        <PageHeader eyebrow="康复执行岗 · 当前康复中心" title="周康复师，上午好" description="聚合今天需要执行的训练、训练后确认与异常上报任务；临床复核和处方签署由医生负责。" action={<StatusBadge tone="green"><MonitorUp className="h-3.5 w-3.5" />设备数据连接正常</StatusBadge>} />
        <div className="mb-5 grid grid-cols-5 gap-4">
          <StatCard label="今日训练计划" value="15" note="上午 9 人 · 下午 6 人" icon={<Activity className="h-5 w-5" />} />
          <StatCard label="待接诊" value="3" note="2 人已签到" tone="orange" icon={<UserCheck className="h-5 w-5" />} />
          <StatCard label="在训患者" value="2" note="功率车 01、02" tone="green" icon={<MonitorUp className="h-5 w-5" />} />
          <StatCard label="训练后确认" value="3" note="复测与离场确认" icon={<PhoneCall className="h-5 w-5" />} />
          <StatCard label="异常待上报" value="1" note="训练中胸闷主诉" tone="red" icon={<AlertTriangle className="h-5 w-5" />} />
        </div>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-5">
          <section className="card p-5"><SectionHeader title="下一步执行任务" description="按到期时间和风险等级排序。" /><div className="space-y-3">{[
            ["10:20", "陈女士", "功率车训练前准备", "待连接设备", "orange"],
            ["10:30", "李秀兰", "训练后生命体征确认", "待记录", "blue"],
            ["11:00", "周海明", "训练中断后异常上报", "重点关注", "red"]
          ].map(([time, patient, task, status, tone]) => <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3" key={String(time) + patient}><span className="w-12 font-mono text-[10px] text-slate-400">{time}</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CalendarClock className="h-4 w-4" /></span><div className="flex-1"><b className="text-slate-800">{patient}</b><p className="mt-1 text-[10px] text-slate-400">{task}</p></div><StatusBadge tone={tone as "orange" | "blue" | "red"}>{status}</StatusBadge></div>)}</div></section>
          <section className="card p-5"><SectionHeader title="执行权限边界" /><div className="space-y-3">{["可修改基础资料、生命体征和训练记录", "可完成训练后确认并上报异常", "诊断、危险分组和处方字段只读", "不能复核或签署临床处方"].map((item, index) => <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3" key={item}>{index < 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<span className="text-xs font-medium text-slate-700">{item}</span></div>)}</div></section>
        </div>
      </section>
    );
  }
  if (selectedAppointment) {
    const task = tasks.find((item) => item.id === selectedAppointment.linkedTaskId) ?? tasks[0];
    return <AppointmentDetail appointment={selectedAppointment} task={task} onBack={() => setSelectedAppointmentId(null)} onOpen={onOpen} onGenerate={onGenerate} onConfirm={onConfirm} onSign={onSign} />;
  }
  const reviewCounts = {
    single: doctorAppointments.reduce((total, item) => total + item.singleReportIds.length, 0),
    stage: doctorAppointments.reduce((total, item) => total + item.stageReportIds.length, 0),
    abnormal: doctorAppointments.filter((item) => item.reportReviewStatus === "异常优先").length
  };
  const urgentItems = doctorAppointments.slice(0, 3);
  const latestSafetyEvent = minimalSafetyEvents[0];
  return (
    <section data-testid="page-VIEW-DASHBOARD">
      <PageHeader eyebrow={role === "ADMIN" ? "管理员临床全权视图" : "医生预约工作台"} title={role === "ADMIN" ? "林管理员，上午好" : "王医生，上午好"} description={role === "ADMIN" ? "可查看和处理全部临床任务；签署时记录管理员本人身份并进行二次确认。" : "先处理今天约到诊的患者，基于单次或阶段报告完成处方复核、签名和打印。"} action={<StatusBadge tone="orange">待复核报告 {reviewCounts.single + reviewCounts.stage} 份</StatusBadge>} />
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="今日预约患者" value={String(doctorAppointments.length)} note="按预约时间排序" icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard label="待复核报告" value={String(reviewCounts.single + reviewCounts.stage)} note={`单次 ${reviewCounts.single} · 阶段 ${reviewCounts.stage}`} tone="orange" icon={<FileText className="h-5 w-5" />} />
        <StatCard label="异常优先报告" value={String(reviewCounts.abnormal)} note="需先看安全事件和主诉" tone={reviewCounts.abnormal ? "red" : "green"} icon={<AlertTriangle className="h-5 w-5" />} />
      </div>
      <section className="card mb-5 border-l-4 border-l-amber-500 p-4">
        <SectionHeader title="最小异常闭环" description="不单独恢复异常中心，但医生工作台保留需要影响报告与下一版处方的安全事件。" action={<StatusBadge tone={latestSafetyEvent.doctorReviewStatus === "医生已复核" ? "green" : "orange"}>{latestSafetyEvent.doctorReviewStatus}</StatusBadge>} />
        <div className="grid grid-cols-[0.9fr_1fr_1.1fr_1.1fr] gap-3 text-xs">
          <InfoTile label="事件" value={`${latestSafetyEvent.patientName} · ${latestSafetyEvent.type}`} />
          <InfoTile label="指标快照" value={latestSafetyEvent.metricSnapshot} />
          <InfoTile label="现场处置" value={latestSafetyEvent.fieldAction} />
          <InfoTile label="处方影响" value={latestSafetyEvent.prescriptionImpact} />
        </div>
      </section>
      <div className="mb-5 grid grid-cols-[1.25fr_0.75fr] gap-5">
        <section className="card overflow-hidden">
          <div className="px-5 pt-5"><SectionHeader title="今日谁约了我" description="从预约患者进入报告和处方闭环。" /></div>
          <div className="grid grid-cols-[0.55fr_0.9fr_0.9fr_0.6fr_1.35fr_0.75fr_0.7fr] border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-slate-400"><span>时间</span><span>患者</span><span>阶段</span><span>风险</span><span>预约目的</span><span>报告状态</span><span>操作</span></div>
          {doctorAppointments.map((appointment) => (
            <button type="button" key={appointment.id} onClick={() => setSelectedAppointmentId(appointment.id)} className="grid w-full grid-cols-[0.55fr_0.9fr_0.9fr_0.6fr_1.35fr_0.75fr_0.7fr] items-center border-b border-slate-100 px-5 py-3 text-left text-xs hover:bg-blue-50">
              <b className="font-mono text-slate-800">{appointment.time}</b><span className="font-bold text-slate-900">{appointment.patientName}<small className="mt-1 block font-normal text-slate-400">{appointment.patientId}</small></span><span>{appointment.stage}</span><StatusBadge tone={appointment.risk === "高危" ? "red" : appointment.risk === "中危" ? "orange" : "green"}>{appointment.risk}</StatusBadge><span className="text-slate-600">{appointment.purpose}</span><StatusBadge tone={appointment.reportReviewStatus === "异常优先" ? "red" : appointment.reportReviewStatus === "待复核" ? "orange" : "green"}>{appointment.reportReviewStatus}</StatusBadge><span className="font-bold text-blue-700">进入</span>
            </button>
          ))}
        </section>
        <section className="card p-5">
          <SectionHeader title="待复核报告数" description="优先处理有异常或即将签名的报告。" />
          <div className="grid grid-cols-3 gap-3">
            {[["单次", reviewCounts.single], ["阶段", reviewCounts.stage], ["异常", reviewCounts.abnormal]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{label}报告</p></div>)}
          </div>
          <div className="mt-4 space-y-3">
            {urgentItems.map((item) => <button type="button" key={item.id} onClick={() => setSelectedAppointmentId(item.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50"><span className="font-mono text-[10px] text-slate-400">{item.time}</span><div className="flex-1"><b className="text-xs text-slate-800">{item.patientName}</b><p className="mt-1 text-[10px] text-slate-400">{item.purpose}</p></div><StatusBadge tone={item.reportReviewStatus === "异常优先" ? "red" : "orange"}>{item.reportReviewStatus}</StatusBadge></button>)}
          </div>
        </section>
      </div>
      <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold text-blue-600">处方任务入口</p><p className="mt-1 text-xs text-slate-500">预约详情之外，仍可直接进入全部处方任务。</p></div><div className="flex gap-2 text-[10px] text-slate-500"><span>待生成 {count("pending_generation")}</span><span>待复核 {count("pending_review")}</span><span>待签名 {count("pending_signature")}</span></div></div>
      <PrescriptionWorklist tasks={tasks} onOpen={onOpen} onGenerate={onGenerate} compact />
    </section>
  );
}

function AppointmentDetail({
  appointment,
  task,
  onBack,
  onOpen,
  onGenerate,
  onConfirm,
  onSign
}: {
  appointment: DoctorAppointment;
  task: PrescriptionTask;
  onBack: () => void;
  onOpen: (taskId: string) => void;
  onGenerate: (taskId: string) => void;
  onConfirm: (taskId: string) => void;
  onSign: (taskId: string) => void;
}) {
  const [reportType, setReportType] = useState<"single" | "stage">(appointment.stageReportIds.length ? "stage" : "single");
  const [exercise, setExercise] = useState("功率车连续训练");
  const [frequency, setFrequency] = useState("每周 3 次");
  const [targetHr, setTargetHr] = useState("100–116 bpm");
  const [power, setPower] = useState("50–70 W");
  const [times, setTimes] = useState("5 + 22 + 5 分钟");
  const [rpe, setRpe] = useState("11–13");
  const [diet, setDiet] = useState("低盐低脂，训练前避免过饱，训练后少量多次饮水。");
  const singleReport = getSingleTrainingReportDetail(appointment.singleReportIds[0]);
  const latestBp = singleReport.bpMeasurements[singleReport.bpMeasurements.length - 1]?.value ?? "未采集";
  const previousVersion = getPrescriptionVersionDetail(task.previousVersionId?.match(/V[1-4]/)?.[0] ?? "V4");
  const linkedSafetyEvent = minimalSafetyEvents.find((event) => event.patientId === appointment.patientId);
  const canConfirm = task.status === "pending_review" && !task.missingFields?.length;

  function printFinalReport() {
    document.body.classList.add("printing-prescription");
    window.print();
    window.setTimeout(() => document.body.classList.remove("printing-prescription"), 300);
  }

  return (
    <section data-testid="page-VIEW-APPOINTMENT-DETAIL">
      <PageHeader eyebrow="预约患者处方闭环" title={`${appointment.patientName} · ${appointment.time} 预约`} description="从预约进入报告依据，右侧生成AI运动参数草稿，医生确认后签名并打印最终报告。" action={<button type="button" className="btn-secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" />返回今日预约</button>} />
      <div className="grid grid-cols-[0.7fr_1.05fr_0.85fr] gap-5">
        <section className="card p-5">
          <SectionHeader title="患者与报告入口" description={appointment.purpose} />
          <div className="grid grid-cols-2 gap-3">
            {[["姓名", appointment.patientName], ["编号", appointment.patientId], ["阶段", appointment.stage], ["风险", appointment.risk]].map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
          </div>
          <div className="mt-5 flex rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={() => setReportType("stage")} disabled={!appointment.stageReportIds.length} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold disabled:text-slate-300 ${reportType === "stage" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>阶段性报告</button>
            <button type="button" onClick={() => setReportType("single")} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold ${reportType === "single" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>单次报告</button>
          </div>
          <div className="mt-4 space-y-3">
            {appointment.stageReportIds.map((id) => <button type="button" key={id} onClick={() => setReportType("stage")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /><span className="flex-1 text-xs font-bold text-slate-700">{id}</span><StatusBadge tone="orange">待复核</StatusBadge></button>)}
            {appointment.singleReportIds.map((id) => <button type="button" key={id} onClick={() => setReportType("single")} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-blue-50"><Activity className="h-4 w-4 text-emerald-600" /><span className="flex-1 text-xs font-bold text-slate-700">{id}</span><StatusBadge tone="blue">单次</StatusBadge></button>)}
          </div>
        </section>

        <section className="card p-5">
          {reportType === "stage" ? (
            <>
              <SectionHeader title="阶段性报告摘要" description="医生看临床判断，患者版说明会进入最终报告。" />
              <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-bold text-blue-700">医生摘要</p><p className="mt-2 text-sm font-bold leading-6 text-slate-800">{stageReportData.clinicalConclusion.summary}</p></div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[["完成", "11 / 12次"], ["靶区", "84%"], ["异常", "1项已复核"]].map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
              </div>
              <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">患者版会说明：运动耐量提升、血压/血氧总体稳定、下一阶段建议维持强度，并附饮食和停止运动提醒。</div>
              {linkedSafetyEvent && <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"><b>关联异常：</b>{linkedSafetyEvent.type} · {linkedSafetyEvent.metricSnapshot}<br /><b>现场处置：</b>{linkedSafetyEvent.fieldAction}<br /><b>医生复核：</b>{linkedSafetyEvent.doctorReview}</div>}
            </>
          ) : (
            <>
              <SectionHeader title="单次报告摘要" description={singleReport.dataSourceNote} action={<StatusBadge tone={singleReport.dataMode === "demo" ? "orange" : "blue"}>{singleReport.dataMode === "demo" ? "Demo 数据" : "设备采样"}</StatusBadge>} />
              <div className="grid grid-cols-3 gap-3">
                {[["运动", singleReport.exercise], ["平均心率", `${singleReport.hrStats.average} bpm`], ["靶区时间", `${singleReport.targetZoneMinutes}分钟`], ["血压", latestBp], ["血氧", singleReport.spo2Summary], ["安全", singleReport.safetySummary]].map(([label, value]) => <InfoTile key={label} label={label} value={value} />)}
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 p-3 text-xs leading-5 text-slate-600">心电：{singleReport.ecgSummary}</div>
              {linkedSafetyEvent && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-800"><b>异常闭环：</b>{linkedSafetyEvent.patientComplaint}；{linkedSafetyEvent.fieldAction}；{linkedSafetyEvent.doctorReviewStatus}。</div>}
            </>
          )}
        </section>

        <section id="printable-prescription" className="card p-5">
          <SectionHeader title="AI运动参数建议" description={`依据：${task.sourceLabel}`} action={<StatusBadge tone={task.status === "completed" ? "green" : "orange"}>{prescriptionStatusLabels[task.status]}</StatusBadge>} />
          <div className="space-y-3">
            <EditLine label="运动项目" value={exercise} setValue={setExercise} disabled={task.status === "completed"} />
            <EditLine label="频次" value={frequency} setValue={setFrequency} disabled={task.status === "completed"} />
            <EditLine label="热身 + 训练 + 放松" value={times} setValue={setTimes} disabled={task.status === "completed"} />
            <EditLine label="靶心率" value={targetHr} setValue={setTargetHr} disabled={task.status === "completed"} />
            <EditLine label="功率/阻力" value={power} setValue={setPower} disabled={task.status === "completed"} />
            <EditLine label="RPE" value={rpe} setValue={setRpe} disabled={task.status === "completed"} />
            <label><span className="field-label">饮食与注意事项</span><textarea value={diet} onChange={(event) => setDiet(event.target.value)} disabled={task.status === "completed"} className="text-field min-h-20 resize-none disabled:bg-slate-50" /></label>
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">上一版：{previousVersion.version} · {previousVersion.targetPower.join("–")}W · {previousVersion.targetHr.join("–")} bpm。AI建议仅为草稿，医生确认后才能签名。</div>
          {task.missingFields?.length && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">缺失关键数据：{task.missingFields.join("、")}。可保存草稿，禁止确认和签名。</div>}
          <div className="mt-5 flex flex-wrap gap-2">
            {task.status === "pending_generation" && <button type="button" className="btn-primary" onClick={() => onGenerate(task.id)}><Sparkles className="h-4 w-4" />生成AI草稿</button>}
            {task.status === "pending_review" && <button type="button" className="btn-primary" disabled={!canConfirm} onClick={() => onConfirm(task.id)}><PenTool className="h-4 w-4" />医生确认参数</button>}
            {task.status === "pending_signature" && <button type="button" className="btn-primary" onClick={() => onSign(task.id)}><Signature className="h-4 w-4" />数字签名</button>}
            {task.status === "completed" && <button type="button" className="btn-primary" onClick={printFinalReport}><Printer className="h-4 w-4" />打印最终报告</button>}
            <button type="button" className="btn-secondary" onClick={() => onOpen(task.id)}><BadgeCheck className="h-4 w-4" />进入完整复核页</button>
          </div>
          {task.status === "completed" && <div className="print-only"><h1>心脏康复最终处方报告</h1><p>患者：{appointment.patientName}　处方编号：{task.id}　版本：{task.version}</p><p>报告依据：{task.sourceLabel}　签署人：{task.signedBy ?? task.confirmedBy ?? "待签署"}　签名时间：{task.signedAt}</p><p>处方参数：{exercise}，{frequency}，{times}，靶心率 {targetHr}，功率 {power}，RPE {rpe}</p><p>注意事项：{diet}</p></div>}
        </section>
      </div>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className="mt-2 text-xs font-bold leading-5 text-slate-800">{value}</p></div>;
}

function EditLine({ label, value, setValue, disabled }: { label: string; value: string; setValue: (value: string) => void; disabled: boolean }) {
  return <label><span className="field-label">{label}</span><input value={value} onChange={(event) => setValue(event.target.value)} disabled={disabled} className="text-field disabled:bg-slate-50" /></label>;
}
