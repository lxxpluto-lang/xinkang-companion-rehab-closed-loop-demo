import { useState } from "react";
import { canAccessPage, firstPageForRole, roleMeta } from "./accessControl";
import { DoctorLayout } from "./components/Layout";
import { StaffLogin } from "./components/StaffLogin";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { DashboardPage } from "./pages/DashboardPage";
import { NurseStationPage } from "./pages/NurseStationPage";
import { PatientArchivePage } from "./pages/PatientArchivePage";
import { PrescriptionManagementPage } from "./pages/PrescriptionManagementPage";
import { PrescriptionReviewPage } from "./pages/PrescriptionReviewPage";
import { initialTrainingVideos, VideoLibraryPage, type TrainingVideo } from "./pages/VideoLibraryPage";
import { initialPrescriptionTasks, type PrescriptionListStatusFilter, type PrescriptionTask } from "./prescriptionData";
import type { DoctorPageKey, Role, TrainingState } from "./types";

type SystemKey = "chooser" | "staffLogin" | "doctor" | "patient";
type StaffRole = Exclude<Role, "PATIENT">;

const adminConsolePages: DoctorPageKey[] = ["orgPermissions", "documentConfig"];

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
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);

  const selectedTask = prescriptionTasks.find((task) => task.id === selectedTaskId);
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
    if (page === "patients") setSelectedPatientId(null);
    setDoctorPage(page);
    resetViewScroll();
  }

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    if (!canAccessPage(nextRole, doctorPage)) setDoctorPage(firstPageForRole(nextRole));
    setSelectedTaskId(null);
  }

  function openTask(taskId: string) {
    setSelectedTaskId(taskId);
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

  function returnToSelectedPrescription() {
    if (!selectedTaskId) return;
    setDoctorPage("prescriptions");
    resetViewScroll();
  }

  function generateDraft(taskId: string) {
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
    const actor = roleMeta[role].account;
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, reviewStatus: "confirmed", signatureStatus: "signed", status: "completed", confirmedBy: actor, confirmedAt: "2026-07-30T10:51:00+08:00", reviewedAt: "2026-07-30T10:51:00+08:00", signedBy: actor, signedAt: "2026-07-30T10:51:00+08:00", effectiveFrom: "2026-07-30T10:51:00+08:00", updatedAt: "2026-07-30T10:51:00+08:00", version: task.version.replace(" 草稿", ""), aiDraft: task.aiDraft ? { ...task.aiDraft, status: "accepted" } : undefined } : task));
  }

  function signTask(taskId: string) {
    const actor = roleMeta[role].account;
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, signatureStatus: "signed", status: "completed", signedBy: actor, signedAt: "2026-07-30T10:54:00+08:00", effectiveFrom: "2026-07-30T10:54:00+08:00", updatedAt: "2026-07-30T10:54:00+08:00", version: task.version.replace(" 草稿", "") } : task));
  }

  function resetDemo() {
    setPrescriptionTasks(initialPrescriptionTasks);
    setSelectedTaskId(null);
    setTrainingState("ready");
    setAnomaly(false);
  }

  if (standaloneView === "patient-reports") {
    return <main className="doctor-shell min-h-screen p-6"><div className="doctor-main mx-auto max-w-[1440px]"><PatientArchivePage role="DOCTOR" tasks={prescriptionTasks} initialPatientId={standalonePatientId} initialTab="reports" onOpenPrescription={openTask} /></div></main>;
  }

  if (system === "chooser") return <SystemChooser onChoose={(target) => setSystem(target === "doctor" ? "staffLogin" : "patient")} />;

  if (system === "staffLogin") {
    return <StaffLogin onBack={() => setSystem("chooser")} onLogin={(nextRole) => { setRole(nextRole); setDoctorPage(firstPageForRole(nextRole)); setSystem("doctor"); }} />;
  }

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} publishedTrainingVideos={publishedTrainingVideos} />;
  }

  const doctorContent: Partial<Record<DoctorPageKey, React.ReactNode>> = {
    dashboard: <DashboardPage role={role} tasks={prescriptionTasks} onOpenPrescriptionList={openPrescriptionList} onOpen={openTask} onGenerate={generateDraft} onConfirm={confirmTask} onSign={signTask} />,
    prescriptions: selectedTask
      ? <PrescriptionReviewPage task={selectedTask} onBack={() => setSelectedTaskId(null)} onConfirm={confirmTask} onGenerate={generateDraft} onOpenPatient={openPatient} />
      : <PrescriptionManagementPage tasks={prescriptionTasks} initialStatusFilter={prescriptionEntryStatus} onOpen={openTask} onGenerate={generateDraft} />,
    patients: <PatientArchivePage role={role} tasks={prescriptionTasks} initialPatientId={selectedPatientId} onOpenPrescription={openTask} onBackToPrescription={selectedTaskId ? returnToSelectedPrescription : undefined} />,
    training: <NurseStationPage role={role} />,
    videoConfig: <VideoLibraryPage role={role} videos={trainingVideos} setVideos={setTrainingVideos} />
  };

  for (const page of adminConsolePages) {
    doctorContent[page] = <AdminConsolePage page={page as Exclude<DoctorPageKey, "dashboard" | "patients" | "report" | "prescriptions" | "training" | "videoConfig">} />;
  }

  return (
    <DoctorLayout page={doctorPage} role={role} onRoleChange={changeRole} onNavigate={navigateDoctor} onExit={() => setSystem("staffLogin")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}
