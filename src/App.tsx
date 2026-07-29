import { useState } from "react";
import { canAccessPage, firstPageForRole } from "./accessControl";
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
import { ReportPage } from "./pages/ReportPage";
import { initialTrainingVideos, VideoLibraryPage, type TrainingVideo } from "./pages/VideoLibraryPage";
import { initialPrescriptionTasks, type PrescriptionTask } from "./prescriptionData";
import type { DoctorPageKey, Role, TrainingState } from "./types";

type SystemKey = "chooser" | "staffLogin" | "doctor" | "patient";
type StaffRole = Exclude<Role, "PATIENT">;

const adminConsolePages: DoctorPageKey[] = ["adminOverview", "organization", "permissions", "businessConfig", "trainingConfig", "documentConfig", "notifications", "audit", "integrations"];

export default function App() {
  const [system, setSystem] = useState<SystemKey>("chooser");
  const [role, setRole] = useState<StaffRole>("DOCTOR");
  const [doctorPage, setDoctorPage] = useState<DoctorPageKey>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [prescriptionTasks, setPrescriptionTasks] = useState<PrescriptionTask[]>(initialPrescriptionTasks);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);

  const selectedTask = prescriptionTasks.find((task) => task.id === selectedTaskId);
  const publishedTrainingVideos = trainingVideos.filter((video) => video.status === "PUBLISHED" && video.url);

  function navigateDoctor(page: DoctorPageKey) {
    if (!canAccessPage(role, page)) return;
    if (page === "prescriptions") setSelectedTaskId(null);
    setDoctorPage(page);
  }

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    if (!canAccessPage(nextRole, doctorPage)) setDoctorPage(firstPageForRole(nextRole));
    setSelectedTaskId(null);
  }

  function openTask(taskId: string) {
    setSelectedTaskId(taskId);
    setDoctorPage("prescriptions");
  }

  function generateDraft(taskId: string) {
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, aiDraftStatus: "generated", status: "pending_review", updatedAt: "2026-07-29 10:46" } : task));
    openTask(taskId);
  }

  function confirmTask(taskId: string) {
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, reviewStatus: "confirmed", status: "pending_signature", confirmedBy: "王医生", confirmedAt: "2026-07-29 10:51", updatedAt: "2026-07-29 10:51" } : task));
  }

  function signTask(taskId: string) {
    setPrescriptionTasks((tasks) => tasks.map((task) => task.id === taskId ? { ...task, signatureStatus: "signed", status: "completed", signedBy: "王医生", signedAt: "2026-07-29 10:54", updatedAt: "2026-07-29 10:54", version: task.version.replace(" 草稿", "") } : task));
  }

  function resetDemo() {
    setPrescriptionTasks(initialPrescriptionTasks);
    setSelectedTaskId(null);
    setTrainingState("ready");
    setAnomaly(false);
  }

  if (system === "chooser") return <SystemChooser onChoose={(target) => setSystem(target === "doctor" ? "staffLogin" : "patient")} />;

  if (system === "staffLogin") {
    return <StaffLogin onBack={() => setSystem("chooser")} onLogin={(nextRole) => { setRole(nextRole); setDoctorPage(firstPageForRole(nextRole)); setSystem("doctor"); }} />;
  }

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} publishedTrainingVideos={publishedTrainingVideos} />;
  }

  const doctorContent: Partial<Record<DoctorPageKey, React.ReactNode>> = {
    dashboard: <DashboardPage role={role} tasks={prescriptionTasks} onOpen={openTask} onGenerate={generateDraft} />,
    prescriptions: selectedTask
      ? <PrescriptionReviewPage task={selectedTask} onBack={() => setSelectedTaskId(null)} onConfirm={confirmTask} onSign={signTask} />
      : <PrescriptionManagementPage tasks={prescriptionTasks} onOpen={openTask} onGenerate={generateDraft} />,
    report: <ReportPage onCreatePrescription={(taskId) => prescriptionTasks.find((task) => task.id === taskId)?.status === "pending_generation" ? generateDraft(taskId) : openTask(taskId)} />,
    patients: <PatientArchivePage role={role} />,
    training: <NurseStationPage role={role} />,
    videoConfig: <VideoLibraryPage role={role} videos={trainingVideos} setVideos={setTrainingVideos} />
  };

  for (const page of adminConsolePages) {
    doctorContent[page] = <AdminConsolePage page={page as Exclude<DoctorPageKey, "dashboard" | "patients" | "report" | "prescriptions" | "training" | "videoConfig">} videos={trainingVideos} />;
  }

  return (
    <DoctorLayout page={doctorPage} role={role} onRoleChange={changeRole} onNavigate={navigateDoctor} onExit={() => setSystem("staffLogin")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}
