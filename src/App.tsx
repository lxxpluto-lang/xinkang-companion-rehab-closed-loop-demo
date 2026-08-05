import { useState } from "react";
import { canAccessPage, firstPageForRole, roleMeta } from "./accessControl";
import { DoctorLayout } from "./components/Layout";
import { StaffLogin } from "./components/StaffLogin";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { AssessmentWorkspacePage } from "./pages/AssessmentWorkspacePage";
import { DashboardPage } from "./pages/DashboardPage";
import { NurseStationPage } from "./pages/NurseStationPage";
import { FollowUpManagementPage, type FollowUpView } from "./pages/FollowUpManagementPage";
import { RehabDischargeReportPage } from "./pages/RehabDischargeReportPage";
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
  type PatientClinicalProfile
} from "./prescriptionWorkspaceData";
import type { DoctorPageKey, Role, TrainingState } from "./types";
import { createDemoAssessmentRecords, type AssessmentRecord } from "./assessmentData";
import type { RehabReport } from "./dischargeHandbookData";
import { initialTreatmentRecords, type CardiopulmonaryTreatmentRecord } from "./treatmentData";

type SystemKey = "chooser" | "staffLogin" | "doctor" | "patient";
type StaffRole = Exclude<Role, "PATIENT">;

const adminConsolePages: DoctorPageKey[] = ["orgPermissions", "documentConfig"];
const seededFollowUpData = createInitialFollowUpData(initialPatients);
const seededAssessmentRecords = createDemoAssessmentRecords(initialPatients);

export default function App() {
  const standaloneView = new URLSearchParams(window.location.search).get("view");
  const standalonePatientId = new URLSearchParams(window.location.search).get("patientId") ?? "";
  const [system, setSystem] = useState<SystemKey>("chooser");
  const [role, setRole] = useState<StaffRole>("DOCTOR");
  const [doctorPage, setDoctorPage] = useState<DoctorPageKey>("dashboard");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientInitialTab, setPatientInitialTab] = useState<PatientWorkspaceTab>("profile");
  const [patientClinicalProfiles, setPatientClinicalProfiles] = useState<PatientClinicalProfile[]>(initialPatientClinicalProfiles);
  const [clinicalNarratives, setClinicalNarratives] = useState<ClinicalNarrativeRecord[]>(initialClinicalNarratives);
  const [patients, setPatients] = useState<ManagedPatient[]>(initialPatients);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>(seededFollowUpData.tasks);
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>(seededFollowUpData.records);
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>(seededAssessmentRecords);
  const [treatmentRecords, setTreatmentRecords] = useState<CardiopulmonaryTreatmentRecord[]>(initialTreatmentRecords);
  const [rehabReports, setRehabReports] = useState<RehabReport[]>([]);
  const [followUpEntryView, setFollowUpEntryView] = useState<FollowUpView>("pending");
  const [selectedFollowUpTaskId, setSelectedFollowUpTaskId] = useState<string | null>(null);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);

  const currentAccount = roleMeta[role].account;
  const scopedFollowUpTasks = role === "DOCTOR"
    ? followUpTasks.filter((task) => task.assignedDoctor === currentAccount)
    : followUpTasks;
  const publishedTrainingVideos = trainingVideos.filter((video) => video.status === "PUBLISHED" && video.url);
  const publishedPatientPrescription = initialPrescriptionContents["RX-TASK-001"];

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
    if (!canAccessPage(nextRole, doctorPage)) setDoctorPage(firstPageForRole(nextRole));
    setSelectedFollowUpTaskId(null);
  }

  function openPatient(patientId: string) {
    setSelectedPatientId(patientId);
    setPatientInitialTab("profile");
    setDoctorPage("patients");
    resetViewScroll();
  }

  function openAssessment(patientId?: string) {
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

  function openDischargeReport(patientId: string) {
    setSelectedPatientId(patientId);
    setDoctorPage("report");
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
    if (!targetTask || !patient || (role === "DOCTOR" && targetTask.assignedDoctor !== currentAccount)) return;
    const reached = record.contactResult === "reached";
    const highRisk = record.symptoms.includes("持续胸痛") || record.symptoms.includes("晕厥") || record.recentEmergencyOrHospitalization;
    const requiresReview = reached && highRisk && role === "REHAB_EXECUTION";
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
      recordType: role === "REHAB_EXECUTION" ? "康复治疗师随访" : "医生随访",
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
    setAssessmentRecords((items) => items.some((item) => item.assessmentId === record.assessmentId)
      ? items.map((item) => item.assessmentId === record.assessmentId ? record : item)
      : [record, ...items]);
    setPatients((items) => items.map((patient) => patient.patient_demo_id === record.patientId ? {
      ...patient,
      assessment: { ...patient.assessment, six_mwt: patient.assessment.six_mwt, cpet: patient.assessment.cpet },
      updated_at: record.reviewedAt ?? record.confirmedAt ?? record.assessedAt,
      updated_by: record.doctor ?? record.therapist ?? record.enteredBy,
      audit_log: [...patient.audit_log, `${(record.reviewedAt ?? record.confirmedAt ?? record.assessedAt).slice(0, 10)} ${record.doctor ?? record.therapist ?? record.enteredBy}${record.status === "doctor_reviewed" ? "复核" : "确认"}SPPB评估`]
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
        status: record.status === "doctor_reviewed" ? "已复核" : record.status === "therapist_confirmed" ? "待复核" : "待补充",
        sppb: { balanceScore: record.sppb.balance.score, gaitScore: record.sppb.walk4m.score, chairStandScore: record.sppb.chairStand.score },
        sixMinuteWalk: { ...profile.rehabAssessment.sixMinuteWalk, startHeartRate: record.preVitals.pulse, endHeartRate: record.postVitals.pulse }
      },
      updatedBy: record.doctor ?? record.therapist ?? record.enteredBy,
      updatedAt: record.reviewedAt ?? record.confirmedAt ?? record.assessedAt
    } : profile));
  }

  function saveTreatmentRecord(record: CardiopulmonaryTreatmentRecord) {
    setTreatmentRecords((items) => items.some((item) => item.treatmentId === record.treatmentId) ? items.map((item) => item.treatmentId === record.treatmentId ? record : item) : [record, ...items]);
    setPatients((items) => items.map((patient) => patient.patient_demo_id === record.patientId ? { ...patient, updated_by: record.therapist, updated_at: record.treatmentAt, audit_log: [...patient.audit_log, `${record.treatmentAt.slice(0, 10)} ${record.therapist}新增心肺康复治疗记录`] } : patient));
  }

  function saveRehabReport(report: RehabReport) {
    setRehabReports((items) => items.some((item) => item.reportId === report.reportId) ? items.map((item) => item.reportId === report.reportId ? report : item) : [report, ...items]);
    if (report.status === "published") {
      setFollowUpTasks((tasks) => markDischargeReportPublished(tasks, report.patientId, report.publishedAt ?? report.generatedAt));
      setPatients((items) => items.map((patient) => patient.patient_demo_id === report.patientId ? { ...patient, report_status: "已发布", training_status: "已完成院内康复", rehab_stage: "院后随访", discharge_date: patient.discharge_date || (report.publishedAt ?? report.generatedAt).slice(0, 10), updated_by: report.confirmedBy ?? currentAccount, updated_at: report.publishedAt ?? report.generatedAt, audit_log: [...patient.audit_log, `${(report.publishedAt ?? report.generatedAt).slice(0, 10)} ${report.confirmedBy ?? currentAccount}发布康复出院报告，系统自动标记出院并生成随访提醒`] } : patient));
    }
  }

  if (standaloneView === "patient-reports") {
    return <main className="doctor-shell min-h-screen p-6"><div className="doctor-main mx-auto max-w-[1440px]"><PatientArchivePage role="DOCTOR" currentAccount="王医生" patients={patients} followUpTasks={followUpTasks} followUpRecords={followUpRecords} clinicalNarratives={clinicalNarratives} clinicalProfiles={patientClinicalProfiles} assessmentRecords={assessmentRecords} treatmentRecords={treatmentRecords} initialPatientId={standalonePatientId} initialTab="reports" onSavePatient={savePatientRecord} onUpdatePatient={updatePatientRecord} onOpenFollowUp={(taskId) => openFollowUps("pending", taskId)} onOpenAssessment={openAssessment} onOpenDischargeReport={openDischargeReport} onSaveTreatmentRecord={saveTreatmentRecord} /></div></main>;
  }

  if (system === "chooser") return <SystemChooser onChoose={(target) => setSystem(target === "doctor" ? "staffLogin" : "patient")} />;

  if (system === "staffLogin") {
    return <StaffLogin onBack={() => setSystem("chooser")} onLogin={(nextRole) => { setRole(nextRole); setDoctorPage(firstPageForRole(nextRole)); setSystem("doctor"); }} />;
  }

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} publishedTrainingVideos={publishedTrainingVideos} followUpTasks={followUpTasks.filter((task) => task.patientId === "P-DEMO-001")} rehabReports={rehabReports.filter((report) => report.patientId === "P-DEMO-001")} patientPrescription={publishedPatientPrescription} />;
  }

  const doctorContent: Partial<Record<DoctorPageKey, React.ReactNode>> = {
    dashboard: <DashboardPage role={role} patients={patients} followUpTasks={scopedFollowUpTasks} onOpenFollowUps={openFollowUps} onOpenReports={() => navigateDoctor("report")} onOpenTraining={() => navigateDoctor("training")} />,
    patients: <PatientArchivePage key={`${role}-${selectedPatientId ?? "list"}-${patientInitialTab}`} role={role} currentAccount={currentAccount} patients={patients} followUpTasks={followUpTasks} followUpRecords={followUpRecords} clinicalNarratives={clinicalNarratives} clinicalProfiles={patientClinicalProfiles} assessmentRecords={assessmentRecords} treatmentRecords={treatmentRecords} initialPatientId={selectedPatientId} initialTab={patientInitialTab} onSavePatient={savePatientRecord} onUpdatePatient={updatePatientRecord} onOpenFollowUp={(taskId) => openFollowUps("pending", taskId)} onOpenAssessment={openAssessment} onOpenDischargeReport={openDischargeReport} onSaveTreatmentRecord={saveTreatmentRecord} />,
    assessment: <AssessmentWorkspacePage key={`${role}-${selectedPatientId ?? "all"}`} role={role} currentAccount={currentAccount} patients={patients} records={assessmentRecords} initialPatientId={selectedPatientId} onSave={saveAssessmentRecord} onBack={closeAssessment} />,
    report: <RehabDischargeReportPage role={role} currentAccount={currentAccount} patients={patients} assessments={assessmentRecords} followUps={followUpTasks} followUpRecords={followUpRecords} reports={rehabReports} initialPatientId={selectedPatientId} onSave={saveRehabReport} />,
    followups: <FollowUpManagementPage key={`${role}-${followUpEntryView}-${selectedFollowUpTaskId ?? "list"}`} role={role} currentAccount={currentAccount} patients={patients} tasks={followUpTasks} records={followUpRecords} initialView={followUpEntryView} initialTaskId={selectedFollowUpTaskId} onSaveRecord={saveFollowUpRecord} onOpenPatient={openPatient} />,
    training: <NurseStationPage role={role} />,
    videoConfig: <VideoLibraryPage role={role} videos={trainingVideos} setVideos={setTrainingVideos} />
  };

  for (const page of adminConsolePages) {
    doctorContent[page] = <AdminConsolePage page={page as Exclude<DoctorPageKey, "dashboard" | "patients" | "assessment" | "followups" | "report" | "training" | "videoConfig">} />;
  }

  return (
    <DoctorLayout page={doctorPage} role={role} onRoleChange={changeRole} onNavigate={navigateDoctor} onExit={() => setSystem("staffLogin")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}
