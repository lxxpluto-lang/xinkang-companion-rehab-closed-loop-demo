import { useMemo, useState } from "react";
import { AlertCircle, Ban, CalendarDays, CheckCircle2, ClipboardList, ClipboardPenLine, Eye, MonitorUp, Plus, RefreshCcw, Search, UserCheck, X } from "lucide-react";
import { can as canAccessAction, canActAs } from "../accessControl";
import { PageHeader, StatCard, StatusBadge } from "../components/UI";
import type { Appointment, AppointmentStatus, PrescriptionTask } from "../clinicalWorkflowData";
import type { PrescriptionContent } from "../prescriptionWorkspaceData";
import { encounterStatusLabel, type TrainingEncounter } from "../trainingEncounterData";
import type { StaffRole } from "../types";
import type { ManagedPatient } from "./PatientArchivePage";
import { validateAppointmentRecord } from "../clinicalStateApi";

const statusLabel: Record<AppointmentStatus, string> = {
  pending: "待到诊",
  arrived: "已到诊",
  in_training: "训练处理中",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到诊"
};

const statusTone: Record<AppointmentStatus, "blue" | "green" | "orange" | "red" | "gray"> = {
  pending: "blue",
  arrived: "orange",
  in_training: "orange",
  completed: "green",
  cancelled: "gray",
  no_show: "red"
};

type AppointmentView = "schedule" | "records";

type Props = {
  role: StaffRole;
  accountId: string;
  currentAccount: string;
  patients: ManagedPatient[];
  appointments: Appointment[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  prescriptionTasks: PrescriptionTask[];
  prescriptionContents: Record<string, PrescriptionContent>;
  encounters: TrainingEncounter[];
  onCheckIn: (appointmentId: string) => void;
  onOpenTreatment: (patientId: string, treatmentId: string) => void;
  onOpenTraining: (encounterId: string) => void;
};

export function AppointmentManagementPage({ role, accountId, currentAccount, patients, appointments, setAppointments, prescriptionTasks, prescriptionContents, encounters, onCheckIn, onOpenTreatment, onOpenTraining }: Props) {
  const [activeView, setActiveView] = useState<AppointmentView>("schedule");
  const [selectedDate, setSelectedDate] = useState(() => currentShanghaiDate());
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [recordKeyword, setRecordKeyword] = useState("");
  const [recordStatus, setRecordStatus] = useState<"all" | AppointmentStatus>("all");
  const [recordDateFrom, setRecordDateFrom] = useState("");
  const [recordDateTo, setRecordDateTo] = useState("");
  const activePatientIds = useMemo(() => new Set(patients.filter((item) => item.record_status !== "已归档" && item.archive_status !== "archived").map((item) => item.patient_demo_id)), [patients]);
  const signedPrescriptions = useMemo(() => prescriptionTasks.filter((item) => activePatientIds.has(item.patientId) && item.status === "completed" && item.doctorFinal && item.signedAt && (role !== "DOCTOR" || item.assignedDoctorId === accountId)), [prescriptionTasks, activePatientIds, role, accountId]);
  const visibleAppointments = useMemo(() => appointments.filter((item) => role !== "DOCTOR" || item.doctorId === accountId), [appointments, role, accountId]);
  const rows = useMemo(() => visibleAppointments.filter((item) => item.date === selectedDate), [visibleAppointments, selectedDate]);
  const recordRows = useMemo(() => {
    const keyword = recordKeyword.trim().toLowerCase();
    return visibleAppointments
      .filter((item) => !keyword || `${item.id} ${item.patientName} ${item.patientNo ?? ""} ${item.patientId} ${item.prescriptionTaskId ?? ""}`.toLowerCase().includes(keyword))
      .filter((item) => recordStatus === "all" || item.status === recordStatus)
      .filter((item) => !recordDateFrom || item.date >= recordDateFrom)
      .filter((item) => !recordDateTo || item.date <= recordDateTo)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [visibleAppointments, recordKeyword, recordStatus, recordDateFrom, recordDateTo]);
  const prescriptionMap = useMemo(() => new Map(prescriptionTasks.map((item) => [item.id, item])), [prescriptionTasks]);
  const calendarMonth = useMemo(() => buildCalendarMonth(selectedDate), [selectedDate]);
  const counts = (status: AppointmentStatus) => rows.filter((item) => item.status === status).length;
  const canEdit = canAccessAction(role, "CREATE");
  const canExecuteWorkflow = canActAs(role, "REHAB_EXECUTION");

  function createDraft() {
    if (!signedPrescriptions.length) return;
    const now = new Date().toISOString();
    setEditing({
      id: createAppointmentId(appointments, selectedDate),
      date: selectedDate,
      time: currentShanghaiTime(),
      patientId: "",
      patientNo: "",
      patientName: "",
      risk: "",
      status: "pending",
      project: "待选择处方",
      station: "功率车01",
      doctorId: role === "DOCTOR" && ["doctor001", "doctor002"].includes(accountId) ? accountId as Appointment["doctorId"] : "doctor001",
      doctorName: role === "DOCTOR" ? currentAccount : "",
      therapistId: role === "REHAB_EXECUTION" ? accountId : "rehab001",
      therapistName: role === "REHAB_EXECUTION" ? currentAccount : "周康复师",
      note: "",
      source: "local",
      createdBy: currentAccount,
      createdAt: now,
      updatedBy: currentAccount,
      updatedAt: now
    });
  }

  function startReschedule(appointment: Appointment) {
    const prescription = signedPrescriptions.find((item) => item.id === appointment.prescriptionTaskId || item.patientId === appointment.patientId);
    if (!prescription) return;
    const now = new Date().toISOString();
    const nextDate = addDays(appointment.date, 1);
    setEditing({
      ...appointment,
      id: createAppointmentId(appointments, nextDate),
      date: nextDate,
      status: "pending",
      patientNo: prescription.patientNo,
      prescriptionTaskId: prescription.id,
      prescriptionVersion: prescription.version,
      plannedSessions: prescription.plannedSessions,
      checkedInBy: undefined,
      checkedInAt: undefined,
      encounterId: undefined,
      cancelledReason: undefined,
      rescheduledFromId: appointment.id,
      rescheduledToId: undefined,
      createdBy: currentAccount,
      createdAt: now,
      updatedBy: currentAccount,
      updatedAt: now,
      statusConfirmedBy: undefined,
      statusConfirmedAt: undefined
    });
  }

  function selectPrescription(taskId: string) {
    const prescription = signedPrescriptions.find((item) => item.id === taskId);
    if (!editing || !prescription) return;
    setEditing({
      ...editing,
      patientId: prescription.patientId,
      patientNo: prescription.patientNo,
      patientName: prescription.patientName,
      risk: prescription.risk,
      doctorId: prescription.assignedDoctorId,
      doctorName: prescription.assignedDoctorName,
      prescriptionTaskId: prescription.id,
      prescriptionVersion: prescription.version,
      plannedSessions: prescription.plannedSessions,
      project: prescription.doctorFinal?.items.find((item) => item.category === "有氧运动")?.project ?? editing.project
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.patientId || !editing.patientName) { setError("请先通过姓名或患者编号选择预约患者。"); return; }
    const prescription = signedPrescriptions.find((item) => item.id === editing.prescriptionTaskId);
    if (!prescription) { setError("正式训练预约必须绑定一份已签署并生效的运动处方。"); return; }
    try {
      await validateAppointmentRecord(editing.patientId, prescription.id);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "患者或处方状态已变化，请刷新后重试。");
      return;
    }
    const original = appointments.find((item) => item.id === editing.id);
    const scheduleChanged = Boolean(original && (original.date !== editing.date || original.time !== editing.time));
    const expectedPrefix = `APT-${editing.date.replace(/-/g, "")}-`;
    const nextId = scheduleChanged || (!original && !editing.id.startsWith(expectedPrefix)) ? createAppointmentId(appointments, editing.date) : editing.id;
    const collision = appointments.some((item) => item.id !== editing.id && item.date === editing.date && item.time === editing.time && !["cancelled", "no_show"].includes(item.status) && (item.patientId === editing.patientId || item.station === editing.station));
    if (collision) { setError("该患者或工位在所选时间已有预约，请调整时间或工位。"); return; }
    const now = new Date().toISOString();
    const saved: Appointment = {
      ...editing,
      id: nextId,
      status: scheduleChanged ? "pending" : editing.status,
      rescheduledFromId: scheduleChanged ? original?.id : editing.rescheduledFromId,
      updatedBy: currentAccount,
      updatedAt: now,
      createdBy: scheduleChanged ? currentAccount : editing.createdBy ?? currentAccount,
      createdAt: scheduleChanged ? now : editing.createdAt ?? now
    };
    setAppointments((items) => {
      if (scheduleChanged && original) {
        return [...items.map((item) => item.id === original.id ? { ...item, status: "cancelled" as const, cancelledReason: `已改约至${saved.date} ${saved.time}`, rescheduledToId: saved.id, updatedBy: currentAccount, updatedAt: now, statusConfirmedBy: currentAccount, statusConfirmedAt: now } : item), saved];
      }
      const linked = saved.rescheduledFromId ? items.map((item) => item.id === saved.rescheduledFromId ? { ...item, status: item.status === "no_show" ? "no_show" as const : "cancelled" as const, cancelledReason: item.cancelledReason || `已改约至${saved.date} ${saved.time}`, rescheduledToId: saved.id, updatedBy: currentAccount, updatedAt: now } : item) : items;
      return linked.some((item) => item.id === saved.id) ? linked.map((item) => item.id === saved.id ? saved : item) : [...linked, saved];
    });
    setSelectedDate(saved.date);
    setEditing(null);
    setError("");
  }

  function updateTerminalStatus(id: string, status: "cancelled" | "no_show") {
    const now = new Date().toISOString();
    setAppointments((items) => items.map((item) => item.id === id ? { ...item, status, cancelledReason: item.cancelledReason || (status === "no_show" ? "超过预约时间30分钟未到诊" : "现场取消"), updatedBy: currentAccount, updatedAt: now, statusConfirmedBy: currentAccount, statusConfirmedAt: now } : item));
  }

  function workflowAction(appointment: Appointment, encounter?: TrainingEncounter) {
    if (!canExecuteWorkflow || ["cancelled", "no_show"].includes(appointment.status)) return null;
    if (appointment.status === "pending") {
      const hasSignedPrescription = signedPrescriptions.some((item) => item.id === appointment.prescriptionTaskId || item.patientId === appointment.patientId);
      return <button disabled={!hasSignedPrescription} className="text-xs font-bold text-emerald-700 disabled:text-slate-300" onClick={() => onCheckIn(appointment.id)}>{hasSignedPrescription ? "确认到诊并建记录" : "缺少生效处方"}</button>;
    }
    if (!encounter) return null;
    if (["pre_assessment", "post_assessment", "pending_signature", "completed"].includes(encounter.status)) {
      const label = encounter.status === "pre_assessment" ? "填写训练前评估" : encounter.status === "post_assessment" ? "填写训练后评估" : encounter.status === "pending_signature" ? "完成签署" : "查看治疗记录";
      return <button className="inline-flex items-center gap-1 text-xs font-bold text-blue-700" onClick={() => onOpenTreatment(encounter.patientId, encounter.treatmentId)}><ClipboardPenLine className="h-3.5 w-3.5" />{label}</button>;
    }
    return <button className="inline-flex items-center gap-1 text-xs font-bold text-blue-700" onClick={() => onOpenTraining(encounter.encounterId)}><MonitorUp className="h-3.5 w-3.5" />进入训练设备</button>;
  }

  function resetRecordFilters() {
    setRecordKeyword("");
    setRecordStatus("all");
    setRecordDateFrom("");
    setRecordDateTo("");
  }

  const headerAction = activeView === "schedule"
    ? <button className="btn-primary" disabled={!signedPrescriptions.length} onClick={createDraft}><Plus className="h-4 w-4" />新建预约</button>
    : <StatusBadge tone="blue">共 {visibleAppointments.length} 条预约记录</StatusBadge>;

  return <section data-testid="page-VIEW-APPOINTMENTS">
    <PageHeader eyebrow="医护工作站 · 院内训练入口" title="预约管理" description="预约排班负责安排和执行；预约记录负责查询和追溯。两者共用同一预约号和状态数据。" action={headerAction} />
    <nav className="mb-5 inline-flex rounded-xl border border-slate-200 bg-white p-1" aria-label="预约管理栏目">
      <button type="button" onClick={() => setActiveView("schedule")} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold ${activeView === "schedule" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}><CalendarDays className="h-4 w-4" />预约排班</button>
      <button type="button" onClick={() => setActiveView("records")} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-5 text-sm font-bold ${activeView === "records" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}><ClipboardList className="h-4 w-4" />预约记录</button>
    </nav>

    {activeView === "schedule" ? <>
      <div className="grid gap-5 lg:grid-cols-[310px_1fr]">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold"><CalendarDays className="h-4 w-4 text-blue-600" />{calendarMonth.label}</h2>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>{calendarMonth.cells.map(({ day, date }, index) => { const valid = Boolean(date); const total = visibleAppointments.filter((item) => item.date === date && !["cancelled", "no_show"].includes(item.status)).length; return <button disabled={!valid} key={`${date || "empty"}-${index}`} onClick={() => valid && setSelectedDate(date)} className={`relative h-10 rounded-lg ${date === selectedDate ? "bg-blue-600 text-white" : valid ? "hover:bg-blue-50" : "text-slate-300"}`}>{day ?? ""}{total > 0 && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${date === selectedDate ? "bg-white" : "bg-blue-500"}`} />}</button>; })}</div>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><b>唯一主线：</b>预约 → 到诊 → 训前评估 → 设备训练 → 训后评估 → 康复师签署 → 患者纸签归档。</div>
        </section>
        <section className="card overflow-hidden">
          <div className="border-b px-5 py-4"><h2 className="text-sm font-bold">{selectedDate} 训练安排（{rows.length}）</h2></div>
          <div className="divide-y divide-slate-100">{rows.map((item) => { const encounter = encounters.find((entry) => entry.encounterId === item.encounterId || entry.appointmentId === item.id); const canReschedule = signedPrescriptions.some((task) => task.id === item.prescriptionTaskId || task.patientId === item.patientId); return <div key={item.id} onClick={() => setDetail(item)} className="grid cursor-pointer gap-3 px-5 py-4 text-xs transition hover:bg-slate-50 xl:grid-cols-[70px_1.4fr_0.8fr_1fr] xl:items-center">
            <span className="rounded-lg bg-blue-50 py-2 text-center text-sm font-bold text-blue-700">{item.time}</span>
            <div><div className="flex flex-wrap items-center gap-2"><b className="text-sm text-slate-900">{item.patientName}</b><StatusBadge tone={statusTone[item.status]}>{statusLabel[item.status]}</StatusBadge>{encounter && <StatusBadge tone={encounter.status === "completed" ? "green" : "orange"}>{encounterStatusLabel[encounter.status]}</StatusBadge>}</div><p className="mt-1 text-[10px] text-slate-500">{item.risk} · {item.project} · {item.station} · 处方{item.prescriptionVersion ?? "未绑定"} · {item.doctorName}</p><p className="mt-1 text-[10px] text-slate-400">{item.checkedInAt ? `到诊：${item.checkedInBy ?? currentAccount} ${item.checkedInAt}` : item.cancelledReason || item.note}</p></div>
            <div><p className="text-[10px] text-slate-400">预约号 / 训练就诊号</p><p className="mt-1 font-mono text-[10px] font-bold text-slate-600">{item.id}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{encounter?.encounterId ?? "到诊后生成"}</p></div>
            <div className="flex flex-wrap justify-end gap-3" onClick={(event) => event.stopPropagation()}>{canEdit && item.status === "pending" && <button className="text-xs font-bold text-slate-500" onClick={() => setEditing(item)}>编辑</button>}{workflowAction(item, encounter)}{canEdit && item.status === "pending" && canReschedule && <button className="text-xs font-bold text-blue-600" onClick={() => startReschedule(item)}>改约</button>}{canEdit && ["cancelled", "no_show"].includes(item.status) && canReschedule && <button className="text-xs font-bold text-blue-600" onClick={() => startReschedule(item)}>重新预约</button>}{canEdit && ["pending", "arrived"].includes(item.status) && <button className="text-xs font-bold text-red-500" onClick={() => updateTerminalStatus(item.id, "cancelled")}>取消</button>}{canEdit && item.status === "pending" && <button className="text-xs font-bold text-red-600" onClick={() => updateTerminalStatus(item.id, "no_show")}>未到诊</button>}</div>
          </div>; })}{!rows.length && <p className="py-12 text-center text-sm text-slate-400">当天暂无预约安排</p>}</div>
        </section>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="待到诊" value={String(counts("pending"))} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="已到诊" value={String(counts("arrived"))} tone="orange" icon={<UserCheck className="h-4 w-4" />} />
        <StatCard label="训练处理中" value={String(counts("in_training"))} tone="orange" icon={<MonitorUp className="h-4 w-4" />} />
        <StatCard label="已完成" value={String(counts("completed"))} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="已取消" value={String(counts("cancelled"))} tone="gray" icon={<Ban className="h-4 w-4" />} />
        <StatCard label="未到诊" value={String(counts("no_show"))} tone="red" icon={<AlertCircle className="h-4 w-4" />} />
      </div>
    </> : <section className="card overflow-hidden" data-testid="appointment-records-view">
      <div className="border-b px-5 pt-5"><div><p className="text-xs font-bold text-blue-600">历史与当前记录</p><h2 className="mt-1 text-lg font-bold">预约记录档案</h2><p className="mt-1 text-sm text-slate-500">未到诊和已取消记录永久保留；重新预约生成新的预约号。</p></div></div>
      <div className="grid gap-3 border-b bg-slate-50 px-5 py-4 lg:grid-cols-[1.4fr_0.8fr_1fr_1fr_auto_auto] lg:items-end">
        <label><span className="field-label">预约号 / 患者姓名 / 患者编号</span><input className="text-field" value={recordKeyword} onChange={(event) => setRecordKeyword(event.target.value)} placeholder="例如 APT-001 / 陈女士 / P-000001" /></label>
        <label><span className="field-label">预约状态</span><select className="text-field" value={recordStatus} onChange={(event) => setRecordStatus(event.target.value as "all" | AppointmentStatus)}><option value="all">全部状态</option>{(Object.keys(statusLabel) as AppointmentStatus[]).map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select></label>
        <label><span className="field-label">预约日期从</span><input type="date" className="text-field" value={recordDateFrom} onChange={(event) => setRecordDateFrom(event.target.value)} /></label>
        <label><span className="field-label">预约日期至</span><input type="date" className="text-field" value={recordDateTo} onChange={(event) => setRecordDateTo(event.target.value)} /></label>
        <button type="button" className="btn-primary"><Search className="h-4 w-4" />查询</button>
        <button type="button" className="btn-secondary" onClick={resetRecordFilters}><RefreshCcw className="h-4 w-4" />重置</button>
      </div>
      <div className="flex items-center justify-between border-b px-5 py-3 text-sm text-slate-500"><span>查询结果 {recordRows.length} 条</span><span>记录按预约时间倒序排列</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1380px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-500"><th className="p-4">预约号</th><th>预约时间</th><th>患者姓名</th><th>患者编号</th><th>关联处方</th><th>训练项目 / 工位</th><th>责任康复师</th><th>预约状态</th><th>训练就诊号</th></tr></thead><tbody>{recordRows.map((item) => { const prescription = item.prescriptionTaskId ? prescriptionMap.get(item.prescriptionTaskId) : undefined; const encounter = encounters.find((entry) => entry.encounterId === item.encounterId || entry.appointmentId === item.id); return <tr key={item.id} onClick={() => setDetail(item)} className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"><td className="p-4 font-mono font-bold text-blue-700">{item.id}</td><td>{item.date} {item.time}</td><td className="font-bold text-slate-900">{item.patientName}</td><td className="font-mono text-xs text-slate-500">{item.patientNo ?? item.patientId}</td><td>{prescription ? `${prescription.prescriptionNo} · ${item.prescriptionVersion ?? prescription.version}` : item.prescriptionTaskId ? `${item.prescriptionTaskId} · ${item.prescriptionVersion ?? "待核对"}` : "未绑定"}</td><td>{item.project}<br /><span className="text-xs text-slate-400">{item.station}</span></td><td>{item.therapistName ?? item.checkedInBy ?? "待分配"}</td><td><StatusBadge tone={statusTone[item.status]}>{statusLabel[item.status]}</StatusBadge></td><td className="font-mono text-xs text-slate-500">{encounter?.encounterId ?? "未生成"}</td></tr>; })}</tbody></table>{!recordRows.length && <p className="py-12 text-center text-sm text-slate-400">当前筛选条件下暂无预约记录</p>}</div>
    </section>}

    {editing && <AppointmentEditor editing={editing} appointments={appointments} signedPrescriptions={signedPrescriptions} prescriptionContents={prescriptionContents} error={error} setEditing={setEditing} selectPrescription={selectPrescription} onSave={save} />}
    {detail && <AppointmentDetail appointment={detail} appointments={appointments} prescription={detail.prescriptionTaskId ? prescriptionMap.get(detail.prescriptionTaskId) : undefined} encounter={encounters.find((entry) => entry.encounterId === detail.encounterId || entry.appointmentId === detail.id)} onSelect={setDetail} onClose={() => setDetail(null)} />}
  </section>;
}

type AppointmentPatientOption = {
  patientId: string;
  patientNo: string;
  patientName: string;
  prescription: PrescriptionTask;
};

function AppointmentEditor({ editing, appointments, signedPrescriptions, prescriptionContents, error, setEditing, selectPrescription, onSave }: { editing: Appointment; appointments: Appointment[]; signedPrescriptions: PrescriptionTask[]; prescriptionContents: Record<string, PrescriptionContent>; error: string; setEditing: (value: Appointment | null) => void; selectPrescription: (taskId: string) => void; onSave: () => void }) {
  const isExisting = appointments.some((item) => item.id === editing.id);
  const patientLocked = isExisting || Boolean(editing.rescheduledFromId);
  const patientOptions = useMemo(() => {
    const options = new Map<string, AppointmentPatientOption>();
    [...signedPrescriptions]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .forEach((prescription) => {
        if (!options.has(prescription.patientId)) {
          options.set(prescription.patientId, {
            patientId: prescription.patientId,
            patientNo: prescription.patientNo,
            patientName: prescription.patientName,
            prescription
          });
        }
      });
    return Array.from(options.values());
  }, [signedPrescriptions]);
  const patientPrescriptions = useMemo(() => signedPrescriptions
    .filter((item) => item.patientId === editing.patientId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [editing.patientId, signedPrescriptions]);
  const selectedPrescription = signedPrescriptions.find((item) => item.id === editing.prescriptionTaskId);
  const selectedContent = selectedPrescription ? prescriptionContents[selectedPrescription.id] : undefined;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 sm:p-6">
    <article className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">临时预约</p>
          <h2 className="mt-1 text-lg font-bold">{editing.rescheduledFromId ? "重新预约" : isExisting ? "编辑预约" : "新建预约"}</h2>
          {editing.rescheduledFromId && <p className="mt-1 text-xs text-slate-500">原预约号：{editing.rescheduledFromId}，保存后生成新的预约号。</p>}
        </div>
        <button type="button" onClick={() => setEditing(null)} aria-label="关闭预约编辑"><X className="h-5 w-5" /></button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PatientSearchField
          label="姓名"
          placeholder="搜索患者姓名"
          displayValue={editing.patientName}
          disabled={patientLocked}
          options={patientOptions}
          onSelect={(option) => selectPrescription(option.prescription.id)}
        />
        <PatientSearchField
          label="患者编号"
          placeholder="搜索患者编号"
          displayValue={editing.patientNo ?? selectedPrescription?.patientNo ?? editing.patientId}
          disabled={patientLocked}
          options={patientOptions}
          onSelect={(option) => selectPrescription(option.prescription.id)}
        />

        <label><span className="field-label">日期</span><input type="date" className="text-field" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} /></label>
        <label><span className="field-label">时间</span><input type="time" className="text-field" value={editing.time} onChange={(event) => setEditing({ ...editing, time: event.target.value })} /></label>

        <label>
          <span className="field-label">生效处方</span>
          <select className="text-field" disabled={!editing.patientId || !patientPrescriptions.length} value={editing.prescriptionTaskId ?? ""} onChange={(event) => selectPrescription(event.target.value)}>
            <option value="">{!editing.patientId ? "请先选择患者" : patientPrescriptions.length ? "请选择生效处方" : "暂无生效处方"}</option>
            {patientPrescriptions.map((item) => <option value={item.id} key={item.id}>{item.version} · {item.rehabStage} · {item.sourceLabel ?? "医生处方"}</option>)}
          </select>
        </label>
        <label><span className="field-label">处方编码</span><input className="text-field bg-slate-50" disabled value={selectedPrescription?.prescriptionNo ?? "选择患者后自动带入"} /></label>

        <label><span className="field-label">责任医生</span><input className="text-field bg-slate-50" disabled value={editing.doctorName || "选择患者后自动带入"} /></label>
        <label><span className="field-label">责任康复师</span><input className="text-field bg-slate-50" disabled value={editing.therapistName ?? "待分配"} /></label>

        <div className="sm:col-span-2"><PrescriptionTrainingSummary prescription={selectedPrescription} content={selectedContent} /></div>

        <label className="sm:col-span-2"><span className="field-label">备注</span><textarea className="text-field min-h-20 resize-y" value={editing.note} onChange={(event) => setEditing({ ...editing, note: event.target.value })} placeholder="填写临时预约说明" /></label>
      </div>
      {error && <p className="mt-3 text-xs font-bold text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={onSave}>保存预约</button></div>
    </article>
  </div>;
}

const appointmentTrainingCategories = [
  { label: "呼吸训练", aliases: ["呼吸训练"] },
  { label: "有氧训练", aliases: ["有氧运动"] },
  { label: "平衡训练", aliases: ["平衡训练"] },
  { label: "力量训练", aliases: ["抗阻训练", "力量训练"] },
  { label: "柔韧训练", aliases: ["柔韧性训练", "柔韧训练"] }
];

function PrescriptionTrainingSummary({ prescription, content }: { prescription?: PrescriptionTask; content?: PrescriptionContent }) {
  const items = prescription?.doctorFinal?.items ?? [];
  const contentRows = content ? [
    { label: "呼吸训练", project: content.breathingModes.join("、"), details: [content.breathingIntensity, content.breathingFrequency, content.breathingTime] },
    { label: "有氧训练", project: content.aerobicModes.join("、"), details: [content.aerobicIntensity, content.aerobicFrequency, content.aerobicTime] },
    { label: "平衡训练", project: "", details: [] },
    { label: "力量训练", project: content.resistanceModes.join("、"), details: [content.resistanceIntensity, content.resistanceFrequency, content.resistanceTime] },
    { label: "柔韧训练", project: content.flexibilityModes.join("、"), details: [content.flexibilityIntensity, content.flexibilityFrequency, content.flexibilityTime] }
  ] : [];
  return <section className="overflow-hidden rounded-lg border border-slate-200">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-4 py-3">
      <div><p className="text-sm font-bold text-slate-900">处方训练内容</p><p className="mt-0.5 text-xs text-slate-500">从医生已签署处方自动带入，不在预约中重复编辑。</p></div>
      <span className="font-mono text-xs font-bold text-blue-700">{prescription?.prescriptionNo ?? "待选择处方"}</span>
    </div>
    <div className="divide-y divide-slate-100">
      {appointmentTrainingCategories.map((category) => {
        const item = items.find((entry) => category.aliases.includes(String(entry.category)));
        const contentRow = contentRows.find((entry) => entry.label === category.label);
        const project = contentRow?.project || item?.project || "";
        const arranged = Boolean(project.trim() && !/^(暂不安排|—|-)$/.test(project.trim()));
        const details = (contentRow?.details.length ? contentRow.details : item ? [item.intensity, item.frequency, item.duration] : []).filter((value) => value && value !== "—").join(" · ");
        return <div key={category.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[100px_1fr] sm:gap-4">
          <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${arranged ? "bg-emerald-500" : "bg-slate-300"}`} /><b className="text-xs text-slate-700">{category.label}</b></div>
          <div><p className={`text-sm font-semibold ${arranged ? "text-slate-900" : "text-slate-400"}`}>{arranged ? project : "本处方未安排"}</p>{arranged && details && <p className="mt-1 text-xs leading-5 text-slate-500">{details}</p>}</div>
        </div>;
      })}
    </div>
  </section>;
}

function PatientSearchField({ label, placeholder, displayValue, disabled, options, onSelect }: { label: string; placeholder: string; displayValue: string; disabled: boolean; options: AppointmentPatientOption[]; onSelect: (option: AppointmentPatientOption) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();
  const results = options.filter((option) => !keyword || `${option.patientName} ${option.patientNo} ${option.patientId} ${option.prescription.prescriptionNo}`.toLowerCase().includes(keyword));

  return <div className="relative">
    <span className="field-label">{label}</span>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className={`text-field pl-9 ${disabled ? "bg-slate-50" : ""}`}
        disabled={disabled}
        autoComplete="off"
        value={open ? query : displayValue}
        placeholder={placeholder}
        onFocus={() => { setQuery(""); setOpen(true); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      />
    </div>
    {open && !disabled && <div className="absolute left-0 right-0 top-[70px] z-30 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
        <span className="text-xs font-bold text-slate-600">搜索姓名或患者编号</span>
        <button type="button" aria-label={`关闭${label}搜索`} onClick={() => setOpen(false)}><X className="h-4 w-4 text-slate-400" /></button>
      </div>
      <div className="max-h-52 overflow-y-auto p-1.5">
        {results.map((option) => <button type="button" key={option.patientId} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left hover:bg-blue-50" onClick={() => { onSelect(option); setOpen(false); setQuery(""); }}>
          <span><b className="block text-sm text-slate-900">{option.patientName}</b><span className="mt-0.5 block font-mono text-xs text-slate-500">{option.patientNo}</span></span>
          <span className="shrink-0 text-right text-xs text-slate-500"><b className="block text-emerald-700">生效处方 {option.prescription.version}</b>{option.prescription.prescriptionNo}</span>
        </button>)}
        {!results.length && <p className="px-3 py-6 text-center text-xs text-slate-400">未找到具有生效处方的患者</p>}
      </div>
    </div>}
  </div>;
}

function AppointmentDetail({ appointment, appointments, prescription, encounter, onSelect, onClose }: { appointment: Appointment; appointments: Appointment[]; prescription?: PrescriptionTask; encounter?: TrainingEncounter; onSelect: (value: Appointment) => void; onClose: () => void }) {
  const previous = appointment.rescheduledFromId ? appointments.find((item) => item.id === appointment.rescheduledFromId) : undefined;
  const next = appointment.rescheduledToId ? appointments.find((item) => item.id === appointment.rescheduledToId) : undefined;
  const fields = [
    ["预约号", appointment.id],
    ["预约时间", `${appointment.date} ${appointment.time}`],
    ["姓名", appointment.patientName],
    ["患者编号", appointment.patientNo ?? appointment.patientId],
    ["关联处方", prescription ? `${prescription.prescriptionNo} · ${appointment.prescriptionVersion ?? prescription.version}` : appointment.prescriptionTaskId ?? "未绑定"],
    ["训练项目 / 工位", `${appointment.project} · ${appointment.station}`],
    ["责任康复师", appointment.therapistName ?? appointment.checkedInBy ?? "待分配"],
    ["责任医生", appointment.doctorName],
    ["预约来源", appointment.source === "external" ? "外部预约/HIS" : "本系统预约"],
    ["到诊时间", appointment.checkedInAt ?? "未到诊"],
    ["训练就诊号", encounter?.encounterId ?? "未生成"],
    ["状态确认", appointment.statusConfirmedBy ? `${appointment.statusConfirmedBy} · ${formatAuditTime(appointment.statusConfirmedAt)}` : "未记录"],
    ["最后更新", appointment.updatedBy ? `${appointment.updatedBy} · ${formatAuditTime(appointment.updatedAt)}` : "历史数据"]
  ];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6"><article className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white"><div className="flex items-start justify-between border-b p-6"><div><p className="eyebrow">预约记录详情</p><div className="mt-1 flex items-center gap-3"><h2 className="text-xl font-bold">{appointment.patientName}</h2><StatusBadge tone={statusTone[appointment.status]}>{statusLabel[appointment.status]}</StatusBadge></div></div><button type="button" onClick={onClose} aria-label="关闭预约详情"><X className="h-5 w-5" /></button></div><div className="grid gap-px bg-slate-100 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="bg-white p-4"><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1.5 break-words text-sm font-semibold text-slate-800">{value}</p></div>)}</div>{(appointment.cancelledReason || appointment.note) && <div className="border-t p-5"><p className="text-xs font-bold text-slate-400">状态原因 / 备注</p><p className="mt-2 text-sm leading-6 text-slate-700">{appointment.cancelledReason || appointment.note}</p></div>}{(previous || next) && <div className="flex flex-wrap items-center gap-3 border-t bg-blue-50 p-5 text-sm"><b className="text-blue-950">改约关联</b>{previous && <button type="button" className="font-mono font-bold text-blue-700" onClick={() => onSelect(previous)}>原预约 {previous.id}</button>}{next && <button type="button" className="font-mono font-bold text-blue-700" onClick={() => onSelect(next)}>新预约 {next.id}</button>}</div>}</article></div>;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function shanghaiDateTimeParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map((item) => [item.type, item.value]));
}

function currentShanghaiDate() {
  const parts = shanghaiDateTimeParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentShanghaiTime() {
  const parts = shanghaiDateTimeParts();
  return `${parts.hour}:${parts.minute}`;
}

function buildCalendarMonth(selectedDate: string) {
  const [year, month] = selectedDate.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingEmptyCells = (firstWeekday + 6) % 7;
  const cellCount = Math.ceil((leadingEmptyCells + daysInMonth) / 7) * 7;
  return {
    label: `${year}年${month}月`,
    cells: Array.from({ length: cellCount }, (_, index) => {
      const day = index - leadingEmptyCells + 1;
      return day >= 1 && day <= daysInMonth
        ? { day, date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` }
        : { day: null, date: "" };
    })
  };
}

function createAppointmentId(appointments: Appointment[], date: string) {
  const prefix = `APT-${date.replace(/-/g, "")}-`;
  const nextSequence = appointments.reduce((max, appointment) => {
    if (!appointment.id.startsWith(prefix)) return max;
    const sequence = Number(appointment.id.slice(prefix.length));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0) + 1;
  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

function formatAuditTime(value?: string) {
  if (!value) return "时间未记录";
  if (!value.includes("T")) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed).replace(/\//g, "-");
}
