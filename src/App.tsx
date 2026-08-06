import { useEffect, useState } from "react";
import { canAccessPage, firstPageForRole, roleMeta } from "./accessControl";
import { DoctorLayout } from "./components/Layout";
import { StaffLogin } from "./components/StaffLogin";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { AssessmentWorkspacePage } from "./pages/AssessmentWorkspacePage";
import { DashboardPage } from "./pages/DashboardPage";
import { PrescriptionManagementPage } from "./pages/PrescriptionManagementPage";
import { AlertManagementPage } from "./pages/AlertManagementPage";
import { AppointmentManagementPage } from "./pages/AppointmentManagementPage";
import { NurseStationPage } from "./pages/NurseStationPage";
import { FollowUpManagementPage, type FollowUpView } from "./pages/FollowUpManagementPage";
import { initialPatients, PatientArchivePage, type ManagedPatient, type PatientWorkspaceTab } from "./pages/PatientArchivePage";
import { initialTrainingVideos, VideoLibraryPage, type TrainingVideo } from "./pages/VideoLibraryPage";
import {
  addDays,
  contactResultLabels,
  createInitialFollowUpData,
  dispositionLabels,
  markDischargeReportPublished,
  reconcilePatientFollowUps,
  type FollowUpRecord,
  type FollowUpTask
} from "./followUpData";
import {
  initialClinicalNarratives,
  initialPatientClinicalProfiles,
  initialPrescriptionContents,
  type ClinicalNarrativeRecord,
  type PatientClinicalProfile,
  type PrescriptionContent
} from "./prescriptionWorkspaceData";
import type { DoctorPageKey, StaffRole, TrainingState } from "./types";
import { createDemoAssessmentRecords, type AssessmentRecord } from "./assessmentData";
import type { RehabReport } from "./dischargeHandbookData";
import { initialTreatmentRecords, type CardiopulmonaryTreatmentRecord } from "./treatmentData";
import { initialAlertEvents, initialAlertRules, initialAppointments, initialPrescriptionTasks, type AlertEvent, type AlertRule, type Appointment, type PrescriptionTask } from "./clinicalWorkflowData";

type SystemKey = "chooser" | "staffLogin" | "doctor" | "patient";
const adminConsolePages: DoctorPageKey[] = ["orgPermissions", "documentConfig"];
const seededFollowUpData = createInitialFollowUpData(initialPatients);
const seededAssessmentRecords = createDemoAssessmentRecords(initialPatients);

export default function App() {
  const query = new URLSearchParams(window.location.search);
  const standalonePatientId = query.get("patientId") ?? "";
  const standaloneRecordId = query.get("recordId") ?? "";
  const standaloneTaskId = query.get("taskId") ?? "";
  const standaloneRecordKind = query.get("recordKind") ?? "";
  const queryPage = query.get("page") as DoctorPageKey | null;
  const queryTab = query.get("tab") as PatientWorkspaceTab | null;
  const [system, setSystem] = useState<SystemKey>(query.get("system") === "staff" ? "doctor" : "chooser");
  const [role, setRole] = useState<StaffRole>("REHAB_EXECUTION");
  const [accountId, setAccountId] = useState("rehab001");
  const [accountName, setAccountName] = useState("周康复师");
  const [doctorPage, setDoctorPage] = useState<DoctorPageKey>(queryPage ?? "dashboard");
  const [prescriptionInitialStatus, setPrescriptionInitialStatus] = useState<"all" | "unfinished">("all");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(standalonePatientId || null);
  const [patientInitialTab, setPatientInitialTab] = useState<PatientWorkspaceTab>(queryTab ?? "profile");
  const [patientClinicalProfiles, setPatientClinicalProfiles] = useState<PatientClinicalProfile[]>(initialPatientClinicalProfiles);
  const [clinicalNarratives, setClinicalNarratives] = useState<ClinicalNarrativeRecord[]>(initialClinicalNarratives);
  const [patients, setPatients] = useState<ManagedPatient[]>(initialPatients);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>(seededFollowUpData.tasks);
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>(seededFollowUpData.records);
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>(() => readDemoStore("xinkang-assessments", seededAssessmentRecords));
  const [treatmentRecords, setTreatmentRecords] = useState<CardiopulmonaryTreatmentRecord[]>(() => readDemoStore("xinkang-treatments", initialTreatmentRecords));
  const [rehabReports, setRehabReports] = useState<RehabReport[]>(() => readDemoStore("xinkang-rehab-reports", []));
  const [followUpEntryView, setFollowUpEntryView] = useState<FollowUpView>("pending");
  const [selectedFollowUpTaskId, setSelectedFollowUpTaskId] = useState<string | null>(standaloneTaskId || null);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);
  const [prescriptionTasks, setPrescriptionTasks] = useState<PrescriptionTask[]>(() => readDemoStore("xinkang-prescription-tasks", initialPrescriptionTasks));
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>(() => readDemoStore("xinkang-alert-events", initialAlertEvents));
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => readDemoStore("xinkang-alert-rules", initialAlertRules));
  const [appointments, setAppointments] = useState<Appointment[]>(() => readDemoStore("xinkang-appointments", initialAppointments));

  const currentAccount = accountName || roleMeta[role].account;
  const scopedFollowUpTasks = followUpTasks;
  const publishedTrainingVideos = trainingVideos.filter((video) => video.status === "PUBLISHED" && video.url);
  const signedPatientTask = prescriptionTasks.find((task) => task.patientId === "P-DEMO-001" && task.status === "completed" && task.doctorFinal);
  const publishedPatientPrescription = signedPatientTask?.doctorFinal
    ? mergePublishedPrescription(initialPrescriptionContents["RX-TASK-001"], signedPatientTask.doctorFinal)
    : initialPrescriptionContents["RX-TASK-001"];

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === "xinkang-assessments") setAssessmentRecords(readDemoStore("xinkang-assessments", seededAssessmentRecords));
      if (event.key === "xinkang-treatments") setTreatmentRecords(readDemoStore("xinkang-treatments", initialTreatmentRecords));
      if (event.key === "xinkang-rehab-reports") setRehabReports(readDemoStore("xinkang-rehab-reports", []));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => { localStorage.setItem("xinkang-prescription-tasks", JSON.stringify(prescriptionTasks)); }, [prescriptionTasks]);
  useEffect(() => { localStorage.setItem("xinkang-alert-events", JSON.stringify(alertEvents)); }, [alertEvents]);
  useEffect(() => { localStorage.setItem("xinkang-alert-rules", JSON.stringify(alertRules)); }, [alertRules]);
  useEffect(() => { localStorage.setItem("xinkang-appointments", JSON.stringify(appointments)); }, [appointments]);

  function resetViewScroll() {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  function navigateDoctor(page: DoctorPageKey) {
    if (!canAccessPage(role, page)) return;
    if (page === "followups") {
      setFollowUpEntryView("pending");
      setSelectedFollowUpTaskId(null);
    }
    if (page === "patients") { setSelectedPatientId(null); setPatientInitialTab("profile"); }
    setDoctorPage(page);
    resetViewScroll();
  }

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    if (nextRole === "ADMIN") { setAccountId("admin"); setAccountName("林管理员"); }
    if (nextRole === "DOCTOR") { setAccountId("doctor001"); setAccountName("王医生"); }
    if (nextRole === "REHAB_EXECUTION") { setAccountId("rehab001"); setAccountName("周康复师"); }
    if (!canAccessPage(nextRole, doctorPage)) setDoctorPage(firstPageForRole(nextRole));
    setSelectedFollowUpTaskId(null);
  }

  function openPatient(patientId: string) {
    setSelectedPatientId(patientId);
    setPatientInitialTab("profile");
    setDoctorPage("patients");
    resetViewScroll();
  }

  function openAssessment(patientId?: string, recordId?: string) {
    if (patientId) {
      const url = new URL(window.location.href);
      url.searchParams.set("system", "staff");
      url.searchParams.set("page", "assessment");
      url.searchParams.set("patientId", patientId);
      if (recordId) url.searchParams.set("recordId", recordId);
      window.open(url.toString(), "_blank", "noopener,noreferrer");
      return;
    }
    if (patientId) setSelectedPatientId(patientId);
    setPatientInitialTab("assessments");
    setDoctorPage("assessment");
    resetViewScroll();
  }

  function closeAssessment() {
    setPatientInitialTab("assessments");
    setDoctorPage("patients");
    resetViewScroll();
  }

  function openFollowUps(view: FollowUpView = "pending", taskId?: string) {
    setFollowUpEntryView(view);
    setSelectedFollowUpTaskId(taskId ?? null);
    setDoctorPage("followups");
    resetViewScroll();
  }

  function savePatientRecord(patient: ManagedPatient, previousDischargeDate: string, dischargeChangeReason: string) {
    setPatients((items) => items.some((item) => item.patient_demo_id === patient.patient_demo_id)
      ? items.map((item) => item.patient_demo_id === patient.patient_demo_id ? patient : item)
      : [patient, ...items]);
    setFollowUpTasks((tasks) => reconcilePatientFollowUps(tasks, patient, previousDischargeDate, dischargeChangeReason, currentAccount));
  }

  function updatePatientRecord(patient: ManagedPatient) {
    setPatients((items) => items.map((item) => item.patient_demo_id === patient.patient_demo_id ? patient : item));
  }

  function saveFollowUpRecord(record: FollowUpRecord) {
    if (role === "ADMIN") return;
    const targetTask = followUpTasks.find((task) => task.id === record.taskId);
    const patient = patients.find((item) => item.patient_demo_id === record.patientId);
    if (!targetTask || !patient) return;
    const reached = record.contactResult === "reached";
    const highRisk = record.symptoms.includes("持续胸痛") || record.symptoms.includes("晕厥") || record.recentEmergencyOrHospitalization;
    const requiresReview = false;
    setFollowUpRecords((records) => records.some((item) => item.recordId === record.recordId)
      ? records.map((item) => item.recordId === record.recordId ? record : item)
      : [record, ...records]);
    setFollowUpTasks((tasks) => tasks.map((task) => {
      if (task.id !== record.taskId) return task;
      if (reached) return { ...task, status: requiresReview ? "review_required" : "completed", reviewRequiredAt: requiresReview ? record.contactedAt : undefined, reviewRequiredBy: requiresReview ? record.operator : undefined, completedAt: requiresReview ? undefined : record.contactedAt, completedBy: requiresReview ? undefined : record.operator, recordId: record.recordId, lastContactResult: record.contactResult, lastContactAt: record.contactedAt };
      const nextDate = record.nextContactDate!;
      return {
        ...task,
        status: "rescheduled",
        currentDueDate: nextDate,
        reminderDate: addDays(nextDate, -7),
        lastContactResult: record.contactResult,
        lastContactAt: record.contactedAt,
        rescheduleHistory: [...task.rescheduleHistory, {
          fromDate: task.currentDueDate,
          toDate: nextDate,
          reason: `${contactResultLabels[record.contactResult]}：${record.notes}`,
          changedBy: record.operator,
          changedAt: record.createdAt
        }]
      };
    }));
    if (!reached || requiresReview) return;
    const followUpDate = record.contactedAt.slice(0, 10);
    setPatients((items) => items.map((item) => item.patient_demo_id === record.patientId ? {
      ...item,
      last_followup: followUpDate,
      report_status: "待审核",
      updated_by: record.operator,
      updated_at: record.contactedAt,
      audit_log: [...item.audit_log, `${followUpDate} ${record.operator}完成${record.milestoneMonth}个月随访`]
    } : item));
    const narrative: ClinicalNarrativeRecord = {
      narrativeId: record.recordId,
      patientId: record.patientId,
      encounterAt: record.contactedAt,
      author: record.operator,
      recordType: "康复治疗师随访",
      content: {
        chiefComplaint: record.symptoms.length ? record.symptoms.join("、") : "患者未报告明显不适",
        symptoms: record.symptoms,
        medicationChange: "本次随访未记录用药调整",
        medicationAdherence: record.medicationAdherence,
        trainingFeedback: [record.exerciseAdherence, record.trainingFrequency && `频率：${record.trainingFrequency}`, record.trainingDuration && `时长：${record.trainingDuration}`].filter(Boolean).join("；") || "未补充",
        lifestyle: [record.patientDifficulty && `患者困难：${record.patientDifficulty}`, record.therapistAdvice && `康复师建议：${record.therapistAdvice}`, record.notes].filter(Boolean).join("；") || "未补充",
        newClinicalEvents: record.recentEmergencyOrHospitalization ? "近期有急诊就诊或再次住院" : "无新增急诊或住院",
        clinicalAssessment: `${record.clinicalAssessment}${record.disposition ? `；处理措施：${dispositionLabels[record.disposition]}` : ""}`
      }
    };
    setClinicalNarratives((records) => records.some((item) => item.narrativeId === narrative.narrativeId) ? records : [narrative, ...records]);
  }

  function saveAssessmentRecord(record: AssessmentRecord) {
    setAssessmentRecords((items) => {
      const next = items.some((item) => item.assessmentId === record.assessmentId) ? items.map((item) => item.assessmentId === record.assessmentId ? record : item) : [record, ...items];
      localStorage.setItem("xinkang-assessments", JSON.stringify(next));
      return next;
    });
    setPatients((items) => items.map((patient) => patient.patient_demo_id === record.patientId ? {
      ...patient,
      assessment: { ...patient.assessment, six_mwt: patient.assessment.six_mwt, cpet: patient.assessment.cpet },
      updated_at: record.completedAt ?? record.assessedAt,
      updated_by: record.therapist ?? record.enteredBy,
      audit_log: [...patient.audit_log, `${(record.completedAt ?? record.assessedAt).slice(0, 10)} ${record.therapist ?? record.enteredBy}${record.status === "completed" ? "完成" : "保存"}SPPB评估`]
    } : patient));
    setPatientClinicalProfiles((profiles) => profiles.map((profile) => profile.patientId === record.patientId ? {
      ...profile,
      weightKg: record.weightKg ?? profile.weightKg,
      bmi: record.weightKg != null && profile.heightCm ? Number((record.weightKg / ((profile.heightCm / 100) ** 2)).toFixed(1)) : profile.bmi,
      sixMinuteWalk: record.sppb.totalScore > 0 ? (profile.sixMinuteWalk === "待补充" ? "待补充" : profile.sixMinuteWalk) : profile.sixMinuteWalk,
      rehabAssessment: {
        ...profile.rehabAssessment,
        assessmentId: record.assessmentId,
        assessedAt: record.assessedAt,
        assessor: record.therapist ?? record.enteredBy,
        status: record.status === "completed" ? "已复核" : "待补充",
        sppb: { balanceScore: record.sppb.balance.score, gaitScore: record.sppb.walk4m.score, chairStandScore: record.sppb.chairStand.score },
        sixMinuteWalk: { ...profile.rehabAssessment.sixMinuteWalk, startHeartRate: record.preVitals.pulse, endHeartRate: record.postVitals.pulse }
      },
      updatedBy: record.therapist ?? record.enteredBy,
      updatedAt: record.completedAt ?? record.assessedAt
    } : profile));
  }

  function saveTreatmentRecord(record: CardiopulmonaryTreatmentRecord) {
    setTreatmentRecords((items) => {
      const next = items.some((item) => item.treatmentId === record.treatmentId) ? items.map((item) => item.treatmentId === record.treatmentId ? record : item) : [record, ...items];
      localStorage.setItem("xinkang-treatments", JSON.stringify(next));
      return next;
    });
    setPatients((items) => items.map((patient) => patient.patient_demo_id === record.patientId ? { ...patient, updated_by: record.therapist, updated_at: record.treatmentAt, audit_log: [...patient.audit_log, `${record.treatmentAt.slice(0, 10)} ${record.therapist}新增心肺康复治疗记录`] } : patient));
  }

  function saveRehabReport(report: RehabReport) {
    setRehabReports((items) => {
      const next = items.some((item) => item.reportId === report.reportId) ? items.map((item) => item.reportId === report.reportId ? report : item) : [report, ...items];
      localStorage.setItem("xinkang-rehab-reports", JSON.stringify(next));
      return next;
    });
    if (report.status === "published") {
      setFollowUpTasks((tasks) => markDischargeReportPublished(tasks, report.patientId, report.publishedAt ?? report.generatedAt));
      setPatients((items) => items.map((patient) => patient.patient_demo_id === report.patientId ? { ...patient, report_status: "已发布", training_status: "已完成院内康复", rehab_stage: "院后随访", discharge_date: patient.discharge_date || (report.publishedAt ?? report.generatedAt).slice(0, 10), updated_by: report.confirmedBy ?? currentAccount, updated_at: report.publishedAt ?? report.generatedAt, audit_log: [...patient.audit_log, `${(report.publishedAt ?? report.generatedAt).slice(0, 10)} ${report.confirmedBy ?? currentAccount}发布康复出院报告，系统自动标记出院并生成随访提醒`] } : patient));
    }
  }

  if (system === "chooser") return <SystemChooser onChoose={(target) => setSystem(target === "doctor" ? "staffLogin" : "patient")} />;

  if (system === "staffLogin") {
    return <StaffLogin onBack={() => setSystem("chooser")} onLogin={(nextRole, username, name) => { setRole(nextRole); setAccountId(username); setAccountName(name); setDoctorPage(firstPageForRole(nextRole)); setSystem("doctor"); }} />;
  }

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} publishedTrainingVideos={publishedTrainingVideos} followUpTasks={followUpTasks.filter((task) => task.patientId === "P-DEMO-001")} rehabReports={rehabReports.filter((report) => report.patientId === "P-DEMO-001")} patientPrescription={publishedPatientPrescription} />;
  }

  const doctorContent: Partial<Record<DoctorPageKey, React.ReactNode>> = {
    dashboard: <DashboardPage role={role} patients={patients} followUpTasks={scopedFollowUpTasks} prescriptionTasks={prescriptionTasks} alertEvents={alertEvents} appointments={appointments} accountId={accountId} onOpenFollowUps={openFollowUps} onOpenReports={() => { setSelectedPatientId("P-DEMO-001"); setPatientInitialTab("sessions"); navigateDoctor("patients"); }} onOpenTraining={() => navigateDoctor("training")} onOpenPrescriptions={(status) => { setPrescriptionInitialStatus(status); navigateDoctor("prescriptions"); }} onNavigate={navigateDoctor} />,
    patients: <PatientArchivePage key={`${role}-${selectedPatientId ?? "list"}-${patientInitialTab}-${standaloneRecordId}`} role={role} currentAccount={currentAccount} patients={patients} followUpTasks={followUpTasks} followUpRecords={followUpRecords} clinicalNarratives={clinicalNarratives} clinicalProfiles={patientClinicalProfiles} assessmentRecords={assessmentRecords} treatmentRecords={treatmentRecords} rehabReports={rehabReports} initialPatientId={selectedPatientId} initialTab={patientInitialTab} initialRecordId={standaloneRecordId || null} initialRecordKind={standaloneRecordKind || null} onSavePatient={savePatientRecord} onUpdatePatient={updatePatientRecord} onOpenFollowUp={(taskId) => openFollowUps("pending", taskId)} onOpenAssessment={openAssessment} onSaveTreatmentRecord={saveTreatmentRecord} onSaveRehabReport={saveRehabReport} />,
    assessment: <AssessmentWorkspacePage key={`${role}-${selectedPatientId ?? "all"}-${standaloneRecordId}`} role={role} currentAccount={currentAccount} patients={patients} records={assessmentRecords} initialPatientId={selectedPatientId} initialRecordId={standaloneRecordId || null} onSave={saveAssessmentRecord} onBack={closeAssessment} />,
    followups: <FollowUpManagementPage key={`${role}-${followUpEntryView}-${selectedFollowUpTaskId ?? "list"}`} role={role} currentAccount={currentAccount} patients={patients} tasks={followUpTasks} records={followUpRecords} initialView={followUpEntryView} initialTaskId={selectedFollowUpTaskId} onSaveRecord={saveFollowUpRecord} onOpenPatient={openPatient} />,
    training: <NurseStationPage role={role} />,
    prescriptions: <PrescriptionManagementPage role={role} accountId={accountId} tasks={prescriptionTasks} setTasks={setPrescriptionTasks} initialStatus={prescriptionInitialStatus} />,
    alerts: <AlertManagementPage role={role} events={alertEvents} setEvents={setAlertEvents} rules={alertRules} setRules={setAlertRules} />,
    appointments: <AppointmentManagementPage role={role} accountId={accountId} appointments={appointments} setAppointments={setAppointments} />,
    videoConfig: <VideoLibraryPage role={role} videos={trainingVideos} setVideos={setTrainingVideos} />
  };

  for (const page of adminConsolePages) {
    doctorContent[page] = <AdminConsolePage page={page as Exclude<DoctorPageKey, "dashboard" | "patients" | "assessment" | "followups" | "report" | "training" | "videoConfig" | "prescriptions" | "alerts" | "appointments">} />;
  }

  return (
    <DoctorLayout page={doctorPage} role={role} currentAccount={currentAccount} onRoleChange={changeRole} onNavigate={navigateDoctor} onExit={() => setSystem("staffLogin")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}

function readDemoStore<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function mergePublishedPrescription(base: PrescriptionContent, draft: NonNullable<PrescriptionTask["doctorFinal"]>): PrescriptionContent {
  const byCategory = (category: string) => draft.items.find((item) => item.category === category);
  const breathing = byCategory("呼吸训练");
  const warmup = byCategory("热身运动");
  const aerobic = byCategory("有氧运动");
  const resistance = byCategory("抗阻训练");
  const flexibility = byCategory("柔韧性训练");
  return {
    ...base,
    breathingModes: breathing ? [breathing.project] : base.breathingModes,
    breathingIntensity: breathing?.intensity ?? base.breathingIntensity,
    breathingTime: breathing?.duration ?? base.breathingTime,
    breathingFrequency: breathing?.frequency ?? base.breathingFrequency,
    warmupModes: warmup ? [warmup.project] : base.warmupModes,
    warmupTime: warmup?.duration ?? base.warmupTime,
    warmupFrequency: warmup?.frequency ?? base.warmupFrequency,
    aerobicModes: aerobic ? [aerobic.project] : base.aerobicModes,
    aerobicIntensity: aerobic?.intensity ?? base.aerobicIntensity,
    aerobicTime: aerobic?.duration ?? base.aerobicTime,
    aerobicFrequency: aerobic?.frequency ?? base.aerobicFrequency,
    resistanceModes: resistance ? [resistance.project] : base.resistanceModes,
    resistanceIntensity: resistance?.intensity ?? base.resistanceIntensity,
    resistanceTime: resistance?.duration ?? base.resistanceTime,
    resistanceFrequency: resistance?.frequency ?? base.resistanceFrequency,
    flexibilityModes: flexibility ? [flexibility.project] : base.flexibilityModes,
    flexibilityIntensity: flexibility?.intensity ?? base.flexibilityIntensity,
    flexibilityTime: flexibility?.duration ?? base.flexibilityTime,
    flexibilityFrequency: flexibility?.frequency ?? base.flexibilityFrequency,
    dietCautions: draft.dietAdvice,
    exerciseCautions: draft.exerciseAdvice,
    stopConditions: draft.stopConditions,
    patientInstruction: `${draft.summary} ${draft.exerciseAdvice}`,
    remark: `处方已由责任医生签署发布。${draft.summary}`
  };
}
