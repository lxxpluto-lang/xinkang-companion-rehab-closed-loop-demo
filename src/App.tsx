import { useState } from "react";
import { DoctorLayout } from "./components/Layout";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AbnormalPage } from "./pages/AbnormalPage";
import { DashboardPage } from "./pages/DashboardPage";
import { NurseStationPage } from "./pages/NurseStationPage";
import { OperationsPage } from "./pages/OperationsPage";
import { PatientArchivePage } from "./pages/PatientArchivePage";
import { PrescriptionManagementPage } from "./pages/PrescriptionManagementPage";
import { PrescriptionReviewPage } from "./pages/PrescriptionReviewPage";
import { ReportPage } from "./pages/ReportPage";
import { initialTrainingVideos, VideoLibraryPage, type TrainingVideo } from "./pages/VideoLibraryPage";
import { initialPrescriptionTasks, type PrescriptionTask } from "./prescriptionData";
import type { DoctorPageKey, TrainingState } from "./types";

type SystemKey = "chooser" | "doctor" | "patient";

export default function App() {
  const [system, setSystem] = useState<SystemKey>("chooser");
  const [doctorPage, setDoctorPage] = useState<DoctorPageKey>("dashboard");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [prescriptionTasks, setPrescriptionTasks] = useState<PrescriptionTask[]>(initialPrescriptionTasks);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);

  const selectedTask = prescriptionTasks.find((task) => task.id === selectedTaskId);
  const baduanjinVideo = trainingVideos.find((video) => video.subtype === "八段锦" && video.status === "已发布" && video.url) ?? null;

  function navigateDoctor(page: DoctorPageKey) {
    if (page === "prescriptions") setSelectedTaskId(null);
    setDoctorPage(page);
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

  if (system === "chooser") return <SystemChooser onChoose={setSystem} />;

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} baduanjinVideo={baduanjinVideo} />;
  }

  const doctorContent: Record<DoctorPageKey, React.ReactNode> = {
    dashboard: <DashboardPage tasks={prescriptionTasks} onOpen={openTask} onGenerate={generateDraft} />,
    prescriptions: selectedTask
      ? <PrescriptionReviewPage task={selectedTask} onBack={() => setSelectedTaskId(null)} onConfirm={confirmTask} onSign={signTask} />
      : <PrescriptionManagementPage tasks={prescriptionTasks} onOpen={openTask} onGenerate={generateDraft} />,
    report: <ReportPage onCreatePrescription={(taskId) => prescriptionTasks.find((task) => task.id === taskId)?.status === "pending_generation" ? generateDraft(taskId) : openTask(taskId)} />,
    patients: <PatientArchivePage />,
    abnormal: <AbnormalPage trainingState={trainingState} setTrainingState={setTrainingState} />,
    nurse: <NurseStationPage />,
    videos: <VideoLibraryPage videos={trainingVideos} setVideos={setTrainingVideos} />,
    operations: <OperationsPage onReset={resetDemo} />
  };

  return (
    <DoctorLayout page={doctorPage} onNavigate={navigateDoctor} onExit={() => setSystem("chooser")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}
