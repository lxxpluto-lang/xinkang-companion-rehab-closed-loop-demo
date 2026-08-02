import { useState } from "react";
import { canAccessPage, firstPageForRole, roleMeta } from "./accessControl";
import { DoctorLayout } from "./components/Layout";
import { StaffLogin } from "./components/StaffLogin";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { DashboardPage } from "./pages/DashboardPage";
import { NurseStationPage } from "./pages/NurseStationPage";
import { FollowUpManagementPage, type FollowUpView } from "./pages/FollowUpManagementPage";
import { initialPatients, PatientArchivePage, type ManagedPatient } from "./pages/PatientArchivePage";
import { PrescriptionManagementPage } from "./pages/PrescriptionManagementPage";
import { PrescriptionWorkspacePage, type PrescriptionWorkspaceTab } from "./pages/PrescriptionWorkspacePage";
import { initialTrainingVideos, VideoLibraryPage, type TrainingVideo } from "./pages/VideoLibraryPage";
import { initialPrescriptionTasks, type PrescriptionListStatusFilter, type PrescriptionTask } from "./prescriptionData";
import {
  addDays,
  contactResultLabels,
  createInitialFollowUpData,
  dispositionLabels,
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
import type { DoctorPageKey, Role, TrainingState } from "./types";

type SystemKey = "chooser" | "staffLogin" | "doctor" | "patient";
type StaffRole = Exclude<Role, "PATIENT">;

const adminConsolePages: DoctorPageKey[] = ["orgPermissions", "documentConfig"];
const seededFollowUpData = createInitialFollowUpData(initialPatients);

export default function App() {
  const standaloneView = new URLSearchParams(window.location.search).get("view");
  const standalonePatientId = new URLSearchParams(window.location.search).get("patientId") ?? "";
  const [system, setSystem] = useState<SystemKey>("chooser");
  const [role, setRole] = useState<StaffRole>("DOCTOR");
  const [doctorPage, setDoctorPage] = useState<DoctorPageKey>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [prescriptionEntryStatus, setPrescriptionEntryStatus] = useState<PrescriptionListStatusFilter>("all");
  const [prescriptionTasks, setPrescriptionTasks] = useState<PrescriptionTask[]>(initialPrescriptionTasks);
  const [prescriptionWorkspaceTab, setPrescriptionWorkspaceTab] = useState<PrescriptionWorkspaceTab>("narrative");
  const [patientClinicalProfiles, setPatientClinicalProfiles] = useState<PatientClinicalProfile[]>(initialPatientClinicalProfiles);
  const [clinicalNarratives, setClinicalNarratives] = useState<ClinicalNarrativeRecord[]>(initialClinicalNarratives);
  const [prescriptionContents, setPrescriptionContents] = useState<Record<string, PrescriptionContent>>(initialPrescriptionContents);
  const [patients, setPatients] = useState<ManagedPatient[]>(initialPatients);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>(seededFollowUpData.tasks);
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>(seededFollowUpData.records);
  const [followUpEntryView, setFollowUpEntryView] = useState<FollowUpView>("pending");
  const [selectedFollowUpTaskId, setSelectedFollowUpTaskId] = useState<string | null>(null);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);

  const currentAccount = roleMeta[role].account;
  const scopedPrescriptionTasks = role === "DOCTOR"
    ? prescriptionTasks.filter((task) => task.assignedDoctor === currentAccount)
    : prescriptionTasks;
  const scopedFollowUpTasks = role === "DOCTOR"
    ? followUpTasks.filter((task) => task.assignedDoctor === currentAccount)
    : followUpTasks;
  const selectedTask = scopedPrescriptionTasks.find((task) => task.id === selectedTaskId);
  const selectedClinicalProfile = selectedTask ? patientClinicalProfiles.find((profile) => profile.patientId === selectedTask.patientId) : undefined;
  const publishedTrainingVideos = trainingVideos.filter((video) => video.status === "PUBLISHED" && video.url);

  function resetViewScroll() {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }

  function navigateDoctor(page: DoctorPageKey) {
    if (!canAccessPage(role, page)) return;
    if (page === "prescriptions") {
      setSelectedTaskId(null);
      setPrescriptionEntryStatus("all");
    }
    if (page === "followups") {
      setFollowUpEntryView("pending");
      setSelectedFollowUpTaskId(null);
    }
    if (page === "patients") setSelectedPatientId(null);
    setDoctorPage(page);
    resetViewScroll();
  }

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    if (!canAccessPage(nextRole, doctorPage)) setDoctorPage(firstPageForRole(nextRole));
    setSelectedTaskId(null);
    setSelectedFollowUpTaskId(null);
  }

  function openTask(taskId: string) {
    const task = prescriptionTasks.find((item) => item.id === taskId);
    if (!task || (role === "DOCTOR" && task.assignedDoctor !== currentAccount)) return;
    setSelectedTaskId(taskId);
    setPrescriptionWorkspaceTab("narrative");
    setDoctorPage("prescriptions");
    resetViewScroll();
  }

  function openPrescriptionList(status: PrescriptionListStatusFilter = "all") {
    setSelectedTaskId(null);
    setPrescriptionEntryStatus(status);
    setDoctorPage("prescriptions");
    resetViewScroll();
  }

  function openPatient(patientId: string) {
    setSelectedPatientId(patientId);
    setDoctorPage("patients");
    resetViewScroll();
  }

  function openPatientFromPrescription(patientId: string, returnTab: PrescriptionWorkspaceTab) {
    setPrescriptionWorkspaceTab(returnTab);
    openPatient(patientId);
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
    if (role !== "DOCTOR") return;
    const targetTask = followUpTasks.find((task) => task.id === record.taskId);
    const patient = patients.find((item) => item.patient_demo_id === record.patientId);
    if (!targetTask || !patient || targetTask.assignedDoctor !== currentAccount) return;
    const reached = record.contactResult === "reached";
    setFollowUpRecords((records) => records.some((item) => item.recordId === record.recordId)
      ? records.map((item) => item.recordId === record.recordId ? record : item)
      : [record, ...records]);
    setFollowUpTasks((tasks) => tasks.map((task) => {
      if (task.id !== record.taskId) return task;
      if (reached) return { ...task, status: "completed", completedAt: record.contactedAt, completedBy: record.operator, recordId: record.recordId, lastContactResult: record.contactResult, lastContactAt: record.contactedAt };
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
    if (!reached) return;
    const followUpDate = record.contactedAt.slice(0, 10);
    setPatients((items) => items.map((item) => item.patient_demo_id === record.patientId ? {
      ...item,
      last_followup: followUpDate,
      updated_by: record.operator,
      updated_at: record.contactedAt,
      audit_log: [...item.audit_log, `${followUpDate} ${record.operator}完成${record.milestoneMonth}个月随访`]
    } : item));
    const narrative: ClinicalNarrativeRecord = {
      narrativeId: record.recordId,
      patientId: record.patientId,
      encounterAt: record.contactedAt,
      author: record.operator,
      recordType: "医生随访",
      content: {
        chiefComplaint: record.symptoms.length ? record.symptoms.join("、") : "患者未报告明显不适",
        symptoms: record.symptoms,
        medicationChange: "本次随访未记录用药调整",
        medicationAdherence: record.medicationAdherence,
        trainingFeedback: record.exerciseAdherence,
        lifestyle: record.notes || "未补充",
        newClinicalEvents: record.recentEmergencyOrHospitalization ? "近期有急诊就诊或再次住院" : "无新增急诊或住院",
        clinicalAssessment: `${record.clinicalAssessment}${record.disposition ? `；处理措施：${dispositionLabels[record.disposition]}` : ""}`
      }
    };
    setClinicalNarratives((records) => records.some((item) => item.narrativeId === narrative.narrativeId) ? records : [narrative, ...records]);
  }

  function returnToSelectedPrescription() {
    if (!selectedTaskId) return;
    setDoctorPage("prescriptions");
    resetViewScroll();
  }

  function generateDraft(taskId: string) {
    const targetTask = prescriptionTasks.find((task) => task.id === taskId);
    if (!targetTask || (role === "DOCTOR" && targetTask.assignedDoctor !== currentAccount)) return;
    const assessment = patientClinicalProfiles.find((profile) => profile.patientId === targetTask.patientId)?.rehabAssessment;
    const assessmentTotal = assessment ? assessment.sppb.balanceScore + assessment.sppb.gaitScore + assessment.sppb.chairStandScore : 0;
    const generatedAt = "2026-07-30T10:46:00+08:00";
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? {
      ...task,
      aiDraftStatus: "generated",
      status: "pending_review",
      draftedAt: generatedAt,
      updatedAt: generatedAt,
      aiDraft: {
        draftId: `AI-${task.prescriptionNo}-${generatedAt}`,
        prescriptionId: task.prescriptionId,
        generatedAt,
        evidenceSnapshot: [
          task.sourceLabel,
          task.previousVersionId ? `上一版处方 ${task.previousVersionId}` : "基线临床评估",
          "诊断、特殊用药与风险分层",
          assessment?.status === "已复核"
            ? `结构化康复评估：SPPB ${assessmentTotal}/12、6MWT ${assessment.sixMinuteWalk.distanceMeters ?? "待补"}m、峰值VO₂ ${assessment.cpet.peakVo2 ?? "待补"}`
            : `结构化康复评估：${assessment?.status ?? "待补充"}`,
          ...(task.risk === "高危" ? ["高危患者人工复核要求"] : [])
        ],
        missingData: task.missingFields ?? [],
        proposedContent: {
          targetHeartRate: task.risk === "高危" ? "90–104 bpm" : task.risk === "中危" ? "100–116 bpm" : "104–120 bpm",
          targetPower: task.risk === "高危" ? "30–45 W" : task.risk === "中危" ? "48–62 W" : "50–70 W",
          frequency: "每周 3 次",
          duration: task.kind === "initial" ? "25 分钟/次" : "30 分钟/次",
          clinicalAdvice: task.missingFields?.length
            ? "关键评估尚未补齐，仅生成待补充草稿，不提供强度上调结论。"
            : "结合风险分层与近期训练反馈生成，需由医生逐项确认。"
        },
        modelVersion: "CardiacRx-Demo-1.0",
        promptVersion: "rx-draft-2026.07",
        status: "generated"
      }
    } : task));
    openTask(taskId);
  }

  function confirmTask(taskId: string) {
    const targetTask = prescriptionTasks.find((task) => task.id === taskId);
    if (!targetTask || (role === "DOCTOR" && targetTask.assignedDoctor !== currentAccount)) return;
    const actor = roleMeta[role].account;
    const now = new Date().toISOString();
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, reviewStatus: "confirmed", signatureStatus: "signed", status: "completed", draftState: "signed", confirmedBy: actor, confirmedAt: now, reviewedAt: now, signedBy: actor, signedAt: now, effectiveFrom: now, updatedAt: now, version: task.version.replace(" 草稿", ""), aiDraft: task.aiDraft ? { ...task.aiDraft, status: "accepted" } : undefined } : task));
  }

  function signTask(taskId: string) {
    const targetTask = prescriptionTasks.find((task) => task.id === taskId);
    if (!targetTask || (role === "DOCTOR" && targetTask.assignedDoctor !== currentAccount)) return;
    const actor = roleMeta[role].account;
    const now = new Date().toISOString();
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, signatureStatus: "signed", status: "completed", draftState: "signed", signedBy: actor, signedAt: now, effectiveFrom: now, updatedAt: now, version: task.version.replace(" 草稿", "") } : task));
  }

  function resetDemo() {
    setPrescriptionTasks(initialPrescriptionTasks);
    setPatientClinicalProfiles(initialPatientClinicalProfiles);
    setClinicalNarratives(initialClinicalNarratives);
    setPrescriptionContents(initialPrescriptionContents);
    setPatients(initialPatients);
    setFollowUpTasks(seededFollowUpData.tasks);
    setFollowUpRecords(seededFollowUpData.records);
    setSelectedTaskId(null);
    setTrainingState("ready");
    setAnomaly(false);
  }

  function saveClinicalProfile(profile: PatientClinicalProfile) {
    setPatientClinicalProfiles((profiles) => profiles.map((item) => item.patientId === profile.patientId ? profile : item));
  }

  function saveClinicalNarrative(record: ClinicalNarrativeRecord) {
    setClinicalNarratives((records) => records.some((item) => item.narrativeId === record.narrativeId)
      ? records.map((item) => item.narrativeId === record.narrativeId ? record : item)
      : [record, ...records]);
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === record.taskId ? { ...task, currentNarrativeId: record.narrativeId, draftState: "saved", lastDraftSavedAt: record.encounterAt, updatedAt: record.encounterAt } : task));
  }

  function savePrescriptionContent(taskId: string, content: PrescriptionContent) {
    const savedAt = "2026-07-30T11:00:00+08:00";
    setPrescriptionContents((items) => ({ ...items, [taskId]: content }));
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, draftState: "saved", lastDraftSavedAt: savedAt, updatedAt: savedAt } : task));
  }

  if (standaloneView === "patient-reports") {
    return <main className="doctor-shell min-h-screen p-6"><div className="doctor-main mx-auto max-w-[1440px]"><PatientArchivePage role="DOCTOR" currentAccount="王医生" patients={patients} tasks={prescriptionTasks} followUpTasks={followUpTasks} followUpRecords={followUpRecords} clinicalNarratives={clinicalNarratives} clinicalProfiles={patientClinicalProfiles} initialPatientId={standalonePatientId} initialTab="reports" onSavePatient={savePatientRecord} onUpdatePatient={updatePatientRecord} onOpenPrescription={openTask} onOpenFollowUp={(taskId) => openFollowUps("pending", taskId)} /></div></main>;
  }

  if (system === "chooser") return <SystemChooser onChoose={(target) => setSystem(target === "doctor" ? "staffLogin" : "patient")} />;

  if (system === "staffLogin") {
    return <StaffLogin onBack={() => setSystem("chooser")} onLogin={(nextRole) => { setRole(nextRole); setDoctorPage(firstPageForRole(nextRole)); setSystem("doctor"); }} />;
  }

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} publishedTrainingVideos={publishedTrainingVideos} />;
  }

  const doctorContent: Partial<Record<DoctorPageKey, React.ReactNode>> = {
    dashboard: <DashboardPage role={role} tasks={scopedPrescriptionTasks} patients={patients} followUpTasks={scopedFollowUpTasks} onOpenFollowUps={openFollowUps} onOpenPrescriptionList={openPrescriptionList} onOpen={openTask} onGenerate={generateDraft} onConfirm={confirmTask} onSign={signTask} />,
    prescriptions: selectedTask && selectedClinicalProfile
      ? <PrescriptionWorkspacePage task={selectedTask} profile={selectedClinicalProfile} narratives={clinicalNarratives} content={prescriptionContents[selectedTask.id]} initialTab={prescriptionWorkspaceTab} onBack={() => setSelectedTaskId(null)} onConfirm={confirmTask} onGenerate={generateDraft} onOpenPatient={openPatientFromPrescription} onSaveProfile={saveClinicalProfile} onSaveNarrative={saveClinicalNarrative} onSaveContent={savePrescriptionContent} />
      : <PrescriptionManagementPage key={role} role={role as "ADMIN" | "DOCTOR"} currentDoctor={currentAccount} tasks={scopedPrescriptionTasks} initialStatusFilter={prescriptionEntryStatus} onOpen={openTask} onGenerate={generateDraft} />,
    patients: <PatientArchivePage role={role} currentAccount={currentAccount} patients={patients} tasks={prescriptionTasks} followUpTasks={followUpTasks} followUpRecords={followUpRecords} clinicalNarratives={clinicalNarratives} clinicalProfiles={patientClinicalProfiles} initialPatientId={selectedPatientId} onSavePatient={savePatientRecord} onUpdatePatient={updatePatientRecord} onOpenPrescription={openTask} onOpenFollowUp={(taskId) => openFollowUps("pending", taskId)} onBackToPrescription={selectedTaskId ? returnToSelectedPrescription : undefined} />,
    followups: <FollowUpManagementPage key={`${role}-${followUpEntryView}-${selectedFollowUpTaskId ?? "list"}`} role={role as "ADMIN" | "DOCTOR"} currentAccount={currentAccount} patients={patients} tasks={followUpTasks} records={followUpRecords} initialView={followUpEntryView} initialTaskId={selectedFollowUpTaskId} onSaveRecord={saveFollowUpRecord} onOpenPatient={openPatient} />,
    training: <NurseStationPage role={role} />,
    videoConfig: <VideoLibraryPage role={role} videos={trainingVideos} setVideos={setTrainingVideos} />
  };

  for (const page of adminConsolePages) {
    doctorContent[page] = <AdminConsolePage page={page as Exclude<DoctorPageKey, "dashboard" | "patients" | "followups" | "report" | "prescriptions" | "training" | "videoConfig">} />;
  }

  return (
    <DoctorLayout page={doctorPage} role={role} onRoleChange={changeRole} onNavigate={navigateDoctor} onExit={() => setSystem("staffLogin")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}
