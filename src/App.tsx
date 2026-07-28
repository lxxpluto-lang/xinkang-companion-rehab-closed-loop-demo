import { useState } from "react";
import { DoctorLayout } from "./components/Layout";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AbnormalPage } from "./pages/AbnormalPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DoctorMonitorPage } from "./pages/DoctorMonitorPage";
import { OperationsPage } from "./pages/OperationsPage";
import { PatientPage } from "./pages/PatientPage";
import { ReportPage } from "./pages/ReportPage";
import { ManagementScreenPage } from "./pages/ManagementScreenPage";
import type { DoctorPageKey, TrainingState } from "./types";

type SystemKey = "chooser" | "doctor" | "patient";

export default function App() {
  const [system, setSystem] = useState<SystemKey>("chooser");
  const [doctorPage, setDoctorPage] = useState<DoctorPageKey>("dashboard");
  const [prescriptionConfirmed, setPrescriptionConfirmed] = useState(false);
  const [prescriptionSigned, setPrescriptionSigned] = useState(false);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);

  function resetDemo() {
    setPrescriptionConfirmed(false);
    setPrescriptionSigned(false);
    setTrainingState("ready");
    setAnomaly(false);
  }

  if (system === "chooser") {
    return <SystemChooser onChoose={setSystem} />;
  }

  if (system === "patient") {
    return (
      <PatientApp
        onExit={() => setSystem("chooser")}
        trainingState={trainingState}
        setTrainingState={setTrainingState}
        anomaly={anomaly}
        setAnomaly={setAnomaly}
      />
    );
  }

  const doctorContent: Record<DoctorPageKey, React.ReactNode> = {
    dashboard: <DashboardPage onNavigate={(page) => setDoctorPage(page === "training" ? "monitor" : page as DoctorPageKey)} />,
    patient: (
      <PatientPage
        onNavigate={() => setDoctorPage("monitor")}
        confirmed={prescriptionConfirmed}
        onConfirm={() => setPrescriptionConfirmed(true)}
        signed={prescriptionSigned}
        onSign={() => setPrescriptionSigned(true)}
      />
    ),
    monitor: <DoctorMonitorPage onNavigate={setDoctorPage} />,
    abnormal: <AbnormalPage trainingState={trainingState} setTrainingState={setTrainingState} />,
    report: <ReportPage />,
    management: <ManagementScreenPage />,
    operations: <OperationsPage onReset={resetDemo} />
  };

  return (
    <DoctorLayout page={doctorPage} onNavigate={setDoctorPage} onExit={() => setSystem("chooser")}>
      {doctorContent[doctorPage]}
    </DoctorLayout>
  );
}
