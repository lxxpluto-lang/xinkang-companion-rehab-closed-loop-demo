import { useEffect, useRef, useState } from "react";
import { canAccessPage, canActAs, firstPageForRole, roleMeta } from "./accessControl";
import { DoctorLayout } from "./components/Layout";
import { StaffLogin } from "./components/StaffLogin";
import { SystemChooser } from "./components/SystemChooser";
import { PatientApp } from "./patient/PatientApp";
import { AdminConsolePage } from "./pages/AdminConsolePage";
import { AssessmentWorkspacePage } from "./pages/AssessmentWorkspacePage";
import { DashboardPage } from "./pages/DashboardPage";
import { PrescriptionManagementPage } from "./pages/PrescriptionManagementPage";
import { PrescriptionWorkspacePage, type PrescriptionWorkspaceTab } from "./pages/PrescriptionWorkspacePage";
import { TreatmentManagementPage } from "./pages/TreatmentManagementPage";
import { AlertManagementPage, type AlertStatusFilter } from "./pages/AlertManagementPage";
import { AppointmentManagementPage } from "./pages/AppointmentManagementPage";
import { NurseStationPage } from "./pages/NurseStationPage";
import { RehabDischargeReportPage } from "./pages/RehabDischargeReportPage";
import { FollowUpManagementPage, type FollowUpView } from "./pages/FollowUpManagementPage";
import { createBlankTreatment, initialPatients, normalizeRehabStage, PatientArchivePage, type ManagedPatient, type PatientWorkspaceTab } from "./pages/PatientArchivePage";
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
  defaultPrescriptionContent,
  type ClinicalNarrativeRecord,
  type PatientClinicalProfile,
  type PrescriptionContent
} from "./prescriptionWorkspaceData";
import type { DoctorPageKey, StaffRole, TrainingState } from "./types";
import { createDemoAssessmentRecords, type AssessmentRecord } from "./assessmentData";
import type { RehabReport } from "./dischargeHandbookData";
import { initialTreatmentRecords, type CardiopulmonaryTreatmentRecord } from "./treatmentData";
import { initialAlertEvents, initialAlertRules, initialAppointments, initialPrescriptionTasks, type AlertEvent, type AlertRule, type Appointment, type PrescriptionTask } from "./clinicalWorkflowData";
import {
  initialSingleReports,
  initialStageReports,
  initialTrainingSessions,
  migrateLegacyStageReports,
  SINGLE_REPORT_STORE,
  STAGE_REPORT_STORE,
  TRAINING_SESSION_STORE,
  type StoredSingleReport,
  type StoredStageReport,
  type StoredTrainingSession,
  createStoredStageReport,
  createSingleReportFromSession,
  toReportPatientSnapshot
} from "./reportData";
import {
  initialTrainingEncounters,
  TRAINING_ENCOUNTER_STORE,
  type TrainingEncounter,
  type TrainingEncounterStatus
} from "./trainingEncounterData";
import { normalizeDeviceLoginCode, publishDeviceHandoff, type DeviceHandoff } from "./deviceHandoffData";
import { archivePatientRecord, clinicalStateKeys, fetchClinicalBootstrap, persistClinicalState, restorePatientRecord, subscribeClinicalState, validateAppointmentRecord, type ClinicalStateDocument, type ClinicalStateKey } from "./clinicalStateApi";

type SystemKey = "chooser" | "staffLogin" | "doctor" | "patient";
type ClinicalBackendMode = "checking" | "database" | "offline";
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
  const [prescriptionInitialTab, setPrescriptionInitialTab] = useState<PrescriptionWorkspaceTab>("profile");
  const [treatmentInitialStatus, setTreatmentInitialStatus] = useState<"all" | "unfinished">("all");
  const [alertInitialStatus, setAlertInitialStatus] = useState<AlertStatusFilter>("all");
  const [selectedTreatmentPatientId, setSelectedTreatmentPatientId] = useState<string | null>(null);
  const [selectedTreatmentRecordId, setSelectedTreatmentRecordId] = useState<string | null>(null);
  const [selectedTrainingEncounterId, setSelectedTrainingEncounterId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(standalonePatientId || null);
  const [selectedAssessmentRecordId, setSelectedAssessmentRecordId] = useState<string | null>(standaloneRecordId || null);
  const [assessmentReturnPrescriptionTaskId, setAssessmentReturnPrescriptionTaskId] = useState<string | null>(null);
  const [patientInitialTab, setPatientInitialTab] = useState<PatientWorkspaceTab>(queryTab ?? "profile");
  const [patientClinicalProfiles, setPatientClinicalProfiles] = useState<PatientClinicalProfile[]>(initialPatientClinicalProfiles);
  const [clinicalNarratives, setClinicalNarratives] = useState<ClinicalNarrativeRecord[]>(initialClinicalNarratives);
  const [patients, setPatients] = useState<ManagedPatient[]>(() =>
    readDemoStore("xinkang-patients", initialPatients).map((patient) => ({
      ...patient,
      rehab_stage: normalizeRehabStage(patient.rehab_stage),
    })),
  );
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>(() => readDemoStore("xinkang-followup-tasks", seededFollowUpData.tasks));
  const [followUpRecords, setFollowUpRecords] = useState<FollowUpRecord[]>(() => readDemoStore("xinkang-followup-records", seededFollowUpData.records));
  const [assessmentRecords, setAssessmentRecords] = useState<AssessmentRecord[]>(() => readDemoStore("xinkang-assessments", seededAssessmentRecords));
  const [treatmentRecords, setTreatmentRecords] = useState<CardiopulmonaryTreatmentRecord[]>(() => mergeSeedDefaults(readDemoStore("xinkang-treatments", initialTreatmentRecords), initialTreatmentRecords, (item) => item.treatmentId));
  const [rehabReports, setRehabReports] = useState<RehabReport[]>(() => readDemoStore("xinkang-rehab-reports", []));
  const [trainingSessions, setTrainingSessions] = useState<StoredTrainingSession[]>(() => mergeSeedRecords(readDemoStore(TRAINING_SESSION_STORE, []), initialTrainingSessions, (item) => item.id));
  const [singleReports, setSingleReports] = useState<StoredSingleReport[]>(() => {
    const candidates = mergeSeedRecords(readDemoStore(SINGLE_REPORT_STORE, []), initialSingleReports, (item) => item.id);
    return trainingSessions.filter((session) => session.completed).flatMap((session) => {
      const existing = candidates.find((report) => report.sourceSessionId === session.id)
        ?? candidates.find((report) => report.patientId === session.patientId && report.actualStartAt.slice(0, 10) === session.actualStartAt.slice(0, 10) && report.exercise === session.exerciseType);
      if (existing) return [{ ...existing, sourceSessionId: session.id, reportStage: existing.reportStage ?? "complete" as const }];
      const patient = patients.find((item) => item.patient_demo_id === session.patientId);
      if (!patient) return [];
      return [createSingleReportFromSession(session, toReportPatientSnapshot({ ...patient, weight_kg: Number(patient.weight_kg) || undefined }))];
    });
  });
  const [stageReports, setStageReports] = useState<StoredStageReport[]>(() => {
    const stored = readDemoStore<StoredStageReport[]>(STAGE_REPORT_STORE, []);
    const legacyPatient = patients.find((item) => item.patient_demo_id === "P-DEMO-001");
    const legacySnapshot = legacyPatient ? toReportPatientSnapshot({ ...legacyPatient, weight_kg: Number(legacyPatient.weight_kg) || undefined }) : undefined;
    const legacy = stored.length ? [] : migrateLegacyStageReports("P-DEMO-001", legacySnapshot, trainingSessions);
    return normalizeStageReportVersions(mergeSeedRecords([...stored, ...legacy], initialStageReports, (item) => item.reportId));
  });
  const [followUpEntryView, setFollowUpEntryView] = useState<FollowUpView>("pending");
  const [selectedFollowUpTaskId, setSelectedFollowUpTaskId] = useState<string | null>(standaloneTaskId || null);
  const [trainingState, setTrainingState] = useState<TrainingState>("ready");
  const [anomaly, setAnomaly] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState<TrainingVideo[]>(initialTrainingVideos);
  const [prescriptionTasks, setPrescriptionTasks] = useState<PrescriptionTask[]>(() => mergeSeedDefaults(readDemoStore("xinkang-prescription-tasks", initialPrescriptionTasks), initialPrescriptionTasks, (item) => item.id));
  const [prescriptionContents, setPrescriptionContents] = useState<Record<string, PrescriptionContent>>(() => readDemoStore("xinkang-prescription-contents", initialPrescriptionContents));
  const [selectedPrescriptionTaskId, setSelectedPrescriptionTaskId] = useState<string | null>(null);
  const [prescriptionReturnPatientId, setPrescriptionReturnPatientId] = useState<string | null>(null);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>(() => readDemoStore("xinkang-alert-events", initialAlertEvents));
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => readDemoStore("xinkang-alert-rules", initialAlertRules));
  const [appointments, setAppointments] = useState<Appointment[]>(() => alignAppointmentsToCurrentDemoDay(mergeSeedDefaults(readDemoStore("xinkang-appointments", initialAppointments), initialAppointments, (item) => item.id)));
  const [trainingEncounters, setTrainingEncounters] = useState<TrainingEncounter[]>(() => mergeSeedRecords(readDemoStore(TRAINING_ENCOUNTER_STORE, []), initialTrainingEncounters, (item) => item.encounterId));
  const [clinicalBackendMode, setClinicalBackendMode] = useState<ClinicalBackendMode>("checking");
  const suppressStatePersistRef = useRef(new Set<ClinicalStateKey>());
  const stateVersionsRef = useRef(new Map<ClinicalStateKey, number>());

  const currentAccount = accountName || roleMeta[role].account;
  const scopedFollowUpTasks = role === "DOCTOR"
    ? followUpTasks.filter((task) => task.assignedDoctor === currentAccount)
    : followUpTasks;
  const publishedTrainingVideos = trainingVideos.filter((video) => video.status === "PUBLISHED" && video.url);
  function applyClinicalStateDocument(document: Pick<ClinicalStateDocument, "key" | "value"> & Partial<Pick<ClinicalStateDocument, "version">>) {
    if (document.version !== undefined) stateVersionsRef.current.set(document.key, document.version);
    suppressStatePersistRef.current.add(document.key);
    switch (document.key) {
      case clinicalStateKeys.patients:
        setPatients((document.value as ManagedPatient[]).map((patient) => ({ ...patient, rehab_stage: normalizeRehabStage(patient.rehab_stage) })));
        break;
      case clinicalStateKeys.assessments: setAssessmentRecords(document.value as AssessmentRecord[]); break;
      case clinicalStateKeys.prescriptionTasks: setPrescriptionTasks(document.value as PrescriptionTask[]); break;
      case clinicalStateKeys.prescriptionContents: setPrescriptionContents(document.value as Record<string, PrescriptionContent>); break;
      case clinicalStateKeys.appointments: setAppointments(alignAppointmentsToCurrentDemoDay(document.value as Appointment[])); break;
      case clinicalStateKeys.trainingEncounters: setTrainingEncounters(document.value as TrainingEncounter[]); break;
      case clinicalStateKeys.treatments: setTreatmentRecords(document.value as CardiopulmonaryTreatmentRecord[]); break;
      case clinicalStateKeys.trainingSessions: setTrainingSessions(document.value as StoredTrainingSession[]); break;
      case clinicalStateKeys.singleReports: setSingleReports(document.value as StoredSingleReport[]); break;
      case clinicalStateKeys.stageReports: setStageReports(document.value as StoredStageReport[]); break;
      case clinicalStateKeys.alertEvents: setAlertEvents(document.value as AlertEvent[]); break;
      case clinicalStateKeys.alertRules: setAlertRules(document.value as AlertRule[]); break;
      case clinicalStateKeys.rehabReports: setRehabReports(document.value as RehabReport[]); break;
      case clinicalStateKeys.followUpTasks: setFollowUpTasks(document.value as FollowUpTask[]); break;
      case clinicalStateKeys.followUpRecords: setFollowUpRecords(document.value as FollowUpRecord[]); break;
      case clinicalStateKeys.patientClinicalProfiles: setPatientClinicalProfiles(document.value as PatientClinicalProfile[]); break;
      case clinicalStateKeys.clinicalNarratives: setClinicalNarratives(document.value as ClinicalNarrativeRecord[]); break;
      case clinicalStateKeys.trainingVideos: setTrainingVideos(document.value as TrainingVideo[]); break;
    }
  }

  function persistState(key: ClinicalStateKey, value: unknown) {
    if (clinicalBackendMode === "checking") return;
    if (suppressStatePersistRef.current.delete(key)) return;
    if (clinicalBackendMode === "database") {
      void persistClinicalState(key, value, stateVersionsRef.current.get(key)).then((document) => {
        stateVersionsRef.current.set(key, document.version);
      }).catch((error) => console.error("Clinical state persistence failed", key, error));
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }

  useEffect(() => {
    let disposed = false;
    void fetchClinicalBootstrap().then((bootstrap) => {
      if (disposed) return;
      for (const key of Object.values(clinicalStateKeys)) {
        const document = bootstrap.documents[key];
        const emptyValue = key === clinicalStateKeys.prescriptionContents ? {} : [];
        applyClinicalStateDocument({ key, value: document?.value ?? emptyValue, version: document?.version });
      }
      setClinicalBackendMode("database");
    }).catch(() => {
      if (!disposed) setClinicalBackendMode("offline");
    });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    if (clinicalBackendMode !== "database") return;
    return subscribeClinicalState((document) => applyClinicalStateDocument(document));
  }, [clinicalBackendMode]);

  useEffect(() => {
    if (clinicalBackendMode !== "offline") return;
    const sync = (event: StorageEvent) => {
      if (event.key === "xinkang-assessments") setAssessmentRecords(readDemoStore("xinkang-assessments", seededAssessmentRecords));
      if (event.key === "xinkang-treatments") setTreatmentRecords(readDemoStore("xinkang-treatments", initialTreatmentRecords));
      if (event.key === "xinkang-rehab-reports") setRehabReports(readDemoStore("xinkang-rehab-reports", []));
      if (event.key === TRAINING_SESSION_STORE) setTrainingSessions(readDemoStore(TRAINING_SESSION_STORE, initialTrainingSessions));
      if (event.key === SINGLE_REPORT_STORE) setSingleReports(readDemoStore(SINGLE_REPORT_STORE, initialSingleReports));
      if (event.key === STAGE_REPORT_STORE) setStageReports(readDemoStore(STAGE_REPORT_STORE, initialStageReports));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [clinicalBackendMode]);

  useEffect(() => { persistState(clinicalStateKeys.patients, patients); }, [patients, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.assessments, assessmentRecords); }, [assessmentRecords, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.prescriptionTasks, prescriptionTasks); }, [prescriptionTasks, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.prescriptionContents, prescriptionContents); }, [prescriptionContents, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.appointments, appointments); }, [appointments, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.trainingEncounters, trainingEncounters); }, [trainingEncounters, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.treatments, treatmentRecords); }, [treatmentRecords, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.trainingSessions, trainingSessions); }, [trainingSessions, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.singleReports, singleReports); }, [singleReports, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.stageReports, stageReports); }, [stageReports, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.alertEvents, alertEvents); }, [alertEvents, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.alertRules, alertRules); }, [alertRules, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.rehabReports, rehabReports); }, [rehabReports, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.followUpTasks, followUpTasks); }, [followUpTasks, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.followUpRecords, followUpRecords); }, [followUpRecords, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.patientClinicalProfiles, patientClinicalProfiles); }, [patientClinicalProfiles, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.clinicalNarratives, clinicalNarratives); }, [clinicalNarratives, clinicalBackendMode]);
  useEffect(() => { persistState(clinicalStateKeys.trainingVideos, trainingVideos); }, [trainingVideos, clinicalBackendMode]);

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
    if (page === "alerts") setAlertInitialStatus("all");
    if (page !== "prescriptions") {
      setSelectedPrescriptionTaskId(null);
      setPrescriptionReturnPatientId(null);
    }
    if (page !== "treatments") {
      setSelectedTreatmentPatientId(null);
      setSelectedTreatmentRecordId(null);
    }
    if (page !== "assessment") {
      setSelectedAssessmentRecordId(null);
      setAssessmentReturnPrescriptionTaskId(null);
    }
    if (page !== "training") setSelectedTrainingEncounterId(null);
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

  function openPatient(patientId: string, tab: PatientWorkspaceTab = "profile") {
    setSelectedPatientId(patientId);
    setPatientInitialTab(tab);
    setDoctorPage("patients");
    setSelectedPrescriptionTaskId(null);
    resetViewScroll();
  }

  function updatePrescriptionTask(taskId: string, patch: Partial<PrescriptionTask>) {
    setPrescriptionTasks((items) => items.map((item) => item.id === taskId ? { ...item, ...patch } : item));
  }

  function savePrescriptionContent(taskId: string, content: PrescriptionContent) {
    setPrescriptionContents((items) => ({ ...items, [taskId]: content }));
  }

  function openPrescriptionTask(taskId: string, tab: PrescriptionWorkspaceTab = "current", returnPatientId?: string) {
    setPrescriptionInitialTab(tab);
    setSelectedPrescriptionTaskId(taskId);
    setPrescriptionReturnPatientId(returnPatientId ?? null);
    setDoctorPage("prescriptions");
    resetViewScroll();
  }

  function createPrescriptionForPatient(patientId: string) {
    if (!canActAs(role, "DOCTOR")) return;
    if (role === "DOCTOR" && !["doctor001", "doctor002"].includes(accountId)) return;
    const patient = patients.find((item) => item.patient_demo_id === patientId);
    if (!patient || patient.record_status === "已归档") return;
    const patientTasks = prescriptionTasks.filter((item) => item.patientId === patientId);
    const latestAssessment = assessmentRecords
      .filter((item) => item.patientId === patientId && item.status !== "draft")
      .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))[0];
    const latestSignedTask = patientTasks
      .filter((item) => item.status === "completed" && item.doctorFinal)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const nextVersion = Math.max(0, ...patientTasks.map((item) => Number(item.version.replace(/\D/g, "")) || 0)) + 1;
    const stamp = Date.now();
    const taskId = `RX-TASK-${stamp}`;
    const patientDigits = patient.patient_no.replace(/\D/g, "").slice(-6) || String(stamp).slice(-6);
    const generatedAt = new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-");
    const assignedDoctorName = role === "ADMIN" ? patient.assigned_doctor || "王医生" : currentAccount;
    const assignedDoctorId: PrescriptionTask["assignedDoctorId"] = assignedDoctorName === "李医生" ? "doctor002" : "doctor001";
    const task: PrescriptionTask = {
      id: taskId,
      prescriptionNo: `RX-${patientDigits}-${String(stamp).slice(-4)}`,
      patientId,
      patientNo: patient.patient_no,
      patientName: patient.name,
      age: patient.age,
      risk: patient.risk_level,
      rehabStage: patient.rehab_stage,
      diagnosis: patient.diagnosis_summary,
      specialMedication: patient.current_medications,
      assignedDoctorId,
      assignedDoctorName,
      version: `V${nextVersion}`,
      kind: patientTasks.length ? "adjustment" : "initial",
      sourceLabel: latestAssessment ? `体能评估/SPPB · ${latestAssessment.assessedAt.slice(0, 10)}` : "患者基础档案",
      generatedAt,
      status: "pending_generation",
      updatedAt: generatedAt,
      previous: latestSignedTask?.doctorFinal,
      plannedSessions: 12,
      cycleEndDate: addDays(new Date().toISOString().slice(0, 10), 60),
    };
    const content: PrescriptionContent = {
      ...defaultPrescriptionContent,
      height: patient.height_cm || defaultPrescriptionContent.height,
      contact: patient.phone,
      rehabGoals: [...defaultPrescriptionContent.rehabGoals],
      breathingModes: [...defaultPrescriptionContent.breathingModes],
      warmupModes: [...defaultPrescriptionContent.warmupModes],
      aerobicModes: [...defaultPrescriptionContent.aerobicModes],
      resistanceModes: [...defaultPrescriptionContent.resistanceModes],
      flexibilityModes: [...defaultPrescriptionContent.flexibilityModes],
      inheritedFields: ["患者基础档案", ...(latestAssessment ? [`SPPB评估 ${latestAssessment.assessmentId}`] : [])],
    };
    setPrescriptionTasks((items) => [task, ...items]);
    setPrescriptionContents((items) => ({ ...items, [taskId]: content }));
    setPatients((items) => items.map((item) => item.patient_demo_id === patientId ? {
      ...item,
      patient_status: "prescription_opened",
      prescription_version: task.version,
      updated_by: currentAccount,
      updated_at: new Date().toISOString(),
      audit_log: [...item.audit_log, `${new Date().toISOString().slice(0, 10)} ${currentAccount}新增运动处方 ${task.prescriptionNo}`],
    } : item));
    openPrescriptionTask(taskId, "current", patientId);
  }

  function openTreatmentList(status: "all" | "unfinished" = "all") {
    setTreatmentInitialStatus(status);
    setSelectedTreatmentPatientId(null);
    setSelectedTreatmentRecordId(null);
    setDoctorPage("treatments");
    resetViewScroll();
  }

  function openTreatmentRecord(patientId: string, recordId?: string) {
    setSelectedTreatmentPatientId(patientId);
    setSelectedTreatmentRecordId(recordId ?? null);
    setDoctorPage("treatments");
    resetViewScroll();
  }

  function updateTrainingEncounter(encounterId: string, patch: Partial<TrainingEncounter>) {
    const encounter = trainingEncounters.find((item) => item.encounterId === encounterId);
    const now = new Date().toISOString();
    setTrainingEncounters((items) => items.map((item) => item.encounterId === encounterId ? { ...item, ...patch, updatedAt: now } : item));
    if (!encounter || !patch.status) return;
    const appointmentStatus = ["device_ready", "in_training", "paused", "awaiting_next_task", "post_assessment", "pending_signature", "terminated"].includes(patch.status)
      ? "in_training"
      : patch.status === "completed" ? "completed" : patch.status === "cancelled" ? "cancelled" : patch.status === "no_show" ? "no_show" : "arrived";
    setAppointments((items) => items.map((item) => item.id === encounter.appointmentId ? { ...item, status: appointmentStatus, updatedBy: currentAccount, updatedAt: now } : item));
  }

  async function checkInAppointment(appointmentId: string) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment) return;
    const existingEncounter = trainingEncounters.find((item) => item.appointmentId === appointmentId);
    if (existingEncounter) {
      openTreatmentRecord(existingEncounter.patientId, existingEncounter.treatmentId);
      return;
    }
    const prescription = prescriptionTasks
      .filter((item) => item.patientId === appointment.patientId && item.status === "completed" && item.doctorFinal)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const patient = patients.find((item) => item.patient_demo_id === appointment.patientId);
    if (!prescription || !patient || patient.record_status === "已归档") return;
    try {
      await validateAppointmentRecord(patient.patient_demo_id, prescription.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "患者或处方状态已变化，无法到诊。");
      return;
    }
    const now = new Date().toISOString();
    const encounterId = `ENC-${appointment.id}-${Date.now()}`;
    const treatmentId = `TREAT-${appointment.id}-${Date.now()}`;
    const blank = createBlankTreatment(patient, currentAccount);
    const treatment: CardiopulmonaryTreatmentRecord = {
      ...blank,
      treatmentId,
      encounterId,
      appointmentId,
      prescriptionVersionId: prescription.version,
      treatmentAt: `${appointment.date}T${appointment.time}:00+08:00`,
      paperSignatureStatus: "not_required"
    };
    const encounter: TrainingEncounter = {
      encounterId,
      appointmentId,
      patientId: patient.patient_demo_id,
      patientNo: patient.patient_no,
      patientName: patient.name,
      prescriptionTaskId: prescription.id,
      prescriptionVersion: prescription.version,
      treatmentId,
      station: appointment.station,
      project: appointment.project,
      therapist: currentAccount,
      status: "pre_assessment",
      adjustments: [],
      paperSignatureStatus: "not_required",
      checkedInAt: now,
      updatedAt: now
    };
    setTrainingEncounters((items) => [encounter, ...items]);
    setTreatmentRecords((items) => [treatment, ...items]);
    setAppointments((items) => items.map((item) => item.id === appointmentId ? {
      ...item,
      status: "arrived",
      encounterId,
      prescriptionTaskId: prescription.id,
      prescriptionVersion: prescription.version,
      plannedSessions: prescription.plannedSessions,
      checkedInBy: currentAccount,
      checkedInAt: now,
      therapistId: accountId,
      therapistName: currentAccount,
      updatedBy: currentAccount,
      updatedAt: now
    } : item));
    openTreatmentRecord(patient.patient_demo_id, treatmentId);
  }

  function advanceEncounterToDevice(record: CardiopulmonaryTreatmentRecord) {
    saveTreatmentRecord(record);
    if (!record.encounterId) return;
    const now = new Date().toISOString();
    const encounter = trainingEncounters.find((item) => item.encounterId === record.encounterId);
    const readyEncounter = encounter ? { ...encounter, status: "ready_for_device" as const, preAssessmentCompletedAt: now, updatedAt: now } : undefined;
    updateTrainingEncounter(record.encounterId, { status: "ready_for_device", preAssessmentCompletedAt: now });
    if (readyEncounter) publishEncounterHandoff(readyEncounter);
    setSelectedTrainingEncounterId(record.encounterId);
    setDoctorPage("training");
    resetViewScroll();
  }

  function publishEncounterHandoff(encounterOrId: TrainingEncounter | string) {
    const encounter = typeof encounterOrId === "string"
      ? trainingEncounters.find((item) => item.encounterId === encounterOrId)
      : encounterOrId;
    if (!encounter) return;
    const patient = patients.find((item) => item.patient_demo_id === encounter.patientId);
    const prescriptionTask = prescriptionTasks.find((item) => item.id === encounter.prescriptionTaskId);
    if (!patient || !prescriptionTask) return;
    const now = new Date().toISOString();
    void publishDeviceHandoff({
      loginCode: normalizeDeviceLoginCode(encounter.patientNo || patient.patient_no),
      patient,
      encounter,
      prescriptionTask,
      prescriptionContent: prescriptionContents[prescriptionTask.id],
      publishedAt: now,
      updatedAt: now
    }).catch(() => undefined);
  }

  function importDeviceHandoff(handoff: DeviceHandoff) {
    setPatients((items) => items.some((item) => item.patient_demo_id === handoff.patient.patient_demo_id)
      ? items
      : [handoff.patient, ...items]);
    setPrescriptionTasks((items) => items.some((item) => item.id === handoff.prescriptionTask.id)
      ? items
      : [handoff.prescriptionTask, ...items]);
    if (handoff.prescriptionContent) {
      setPrescriptionContents((items) => items[handoff.prescriptionTask.id]
        ? items
        : { ...items, [handoff.prescriptionTask.id]: handoff.prescriptionContent as PrescriptionContent });
    }
    setTrainingEncounters((items) => {
      const existing = items.find((item) => item.encounterId === handoff.encounter.encounterId);
      if (!existing) return [handoff.encounter, ...items];
      if (existing.updatedAt >= handoff.encounter.updatedAt) return items;
      return items.map((item) => item.encounterId === handoff.encounter.encounterId ? handoff.encounter : item);
    });
  }

  function openEncounterTreatment(encounterId: string) {
    const encounter = trainingEncounters.find((item) => item.encounterId === encounterId);
    if (!encounter) return;
    openTreatmentRecord(encounter.patientId, encounter.treatmentId);
  }

  function createEncounterAlert(event: AlertEvent) {
    setAlertEvents((items) => [event, ...items.filter((item) => item.id !== event.id)]);
  }

  function openAssessment(patientId?: string, recordId?: string, returnPrescriptionTaskId?: string) {
    if (patientId) setSelectedPatientId(patientId);
    setSelectedAssessmentRecordId(recordId ?? null);
    setAssessmentReturnPrescriptionTaskId(returnPrescriptionTaskId ?? null);
    setPatientInitialTab("assessments");
    setDoctorPage("assessment");
    resetViewScroll();
  }

  function closeAssessment() {
    setSelectedAssessmentRecordId(null);
    if (assessmentReturnPrescriptionTaskId) {
      setSelectedPrescriptionTaskId(assessmentReturnPrescriptionTaskId);
      setPrescriptionInitialTab("reports");
      setAssessmentReturnPrescriptionTaskId(null);
      setDoctorPage("prescriptions");
      resetViewScroll();
      return;
    }
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

  function openAlerts(status: AlertStatusFilter = "all") {
    setAlertInitialStatus(status);
    setDoctorPage("alerts");
    resetViewScroll();
  }

  function savePatientRecord(patient: ManagedPatient, previousDischargeDate: string, dischargeChangeReason: string) {
    const now = new Date().toISOString();
    const auditedPatient: ManagedPatient = {
      ...patient,
      created_by: patient.created_by || currentAccount,
      created_at: patient.created_at || now,
      updated_by: currentAccount,
      updated_at: now,
      audit_log: [
        ...(patient.audit_log ?? []),
        `${now.slice(0, 10)} ${currentAccount}${dischargeChangeReason || "更新患者基础资料"}`,
      ],
    };
    setPatients((items) => items.some((item) => item.patient_demo_id === auditedPatient.patient_demo_id)
      ? items.map((item) => item.patient_demo_id === auditedPatient.patient_demo_id ? auditedPatient : item)
      : [auditedPatient, ...items]);
    setFollowUpTasks((tasks) => reconcilePatientFollowUps(tasks, auditedPatient, previousDischargeDate, dischargeChangeReason, currentAccount));
  }

  function updatePatientRecord(patient: ManagedPatient) {
    setPatients((items) => items.map((item) => item.patient_demo_id === patient.patient_demo_id ? patient : item));
  }

  function saveFollowUpRecord(record: FollowUpRecord) {
    const patient = patients.find((item) => item.patient_demo_id === record.patientId);
    if (!patient) return;
    const targetTask = followUpTasks.find((task) => task.id === record.taskId) ?? {
      id: record.taskId,
      patientId: record.patientId,
      assignedDoctor: patient.assigned_doctor,
      milestoneMonth: record.milestoneMonth,
      originalPlannedDate: record.contactedAt.slice(0, 10),
      currentDueDate: record.contactedAt.slice(0, 10),
      reminderDate: record.contactedAt.slice(0, 10),
      status: "due" as const,
      rescheduleHistory: [],
    };
    const reached = record.contactResult === "reached";
    setFollowUpRecords((records) => records.some((item) => item.recordId === record.recordId)
      ? records.map((item) => item.recordId === record.recordId ? record : item)
      : [record, ...records]);
    setFollowUpTasks((tasks) => {
      const sourceTasks = tasks.some((task) => task.id === targetTask.id) ? tasks : [targetTask, ...tasks];
      const completedTasks = sourceTasks.map((task) => {
      if (task.id !== record.taskId) return task;
      return { ...task, status: "completed" as const, completedAt: record.contactedAt, completedBy: record.operator, recordId: record.recordId, lastContactResult: record.contactResult, lastContactAt: record.contactedAt };
      });
      if (!record.nextContactDate) return completedTasks;
      const retryTask: FollowUpTask = {
        ...targetTask,
        id: `${targetTask.id}-RETRY-${Date.now()}`,
        originalPlannedDate: record.nextContactDate,
        currentDueDate: record.nextContactDate,
        reminderDate: addDays(record.nextContactDate, -1),
        status: "rescheduled",
        completedAt: undefined,
        completedBy: undefined,
        recordId: undefined,
        lastContactResult: record.contactResult,
        lastContactAt: record.contactedAt,
        rescheduleHistory: [...targetTask.rescheduleHistory, { fromDate: targetTask.currentDueDate, toDate: record.nextContactDate, reason: `${contactResultLabels[record.contactResult]}：${record.notes}`, changedBy: record.operator, changedAt: record.createdAt }]
      };
      return [retryTask, ...completedTasks];
    });
    if (!reached) return;
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
      recordType: "人工电话随访",
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

  function deleteFollowUpRecord(recordId: string) {
    const record = followUpRecords.find((item) => item.recordId === recordId);
    setFollowUpRecords((items) => items.filter((item) => item.recordId !== recordId));
    if (!record) return;
    setFollowUpTasks((tasks) => tasks.map((task) => task.id === record.taskId ? { ...task, status: "due", completedAt: undefined, completedBy: undefined, recordId: undefined, lastContactResult: undefined, lastContactAt: undefined } : task));
  }

  async function archivePatients(patientIds: string[], reason: string) {
    try {
      for (const patientId of patientIds) await archivePatientRecord(patientId, currentAccount, role, reason);
      const bootstrap = await fetchClinicalBootstrap();
      Object.entries(bootstrap.documents).forEach(([key, document]) => document && applyClinicalStateDocument({ key: key as ClinicalStateKey, value: document.value, version: document.version }));
      setSelectedPatientId(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "患者归档失败");
      throw error;
    }
  }

  async function restorePatients(patientIds: string[]) {
    try {
      for (const patientId of patientIds) await restorePatientRecord(patientId, currentAccount, role);
      const bootstrap = await fetchClinicalBootstrap();
      Object.entries(bootstrap.documents).forEach(([key, document]) => document && applyClinicalStateDocument({ key: key as ClinicalStateKey, value: document.value, version: document.version }));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "患者恢复失败");
      throw error;
    }
  }

  function saveAssessmentRecord(record: AssessmentRecord) {
    setAssessmentRecords((items) => {
      const next = items.some((item) => item.assessmentId === record.assessmentId) ? items.map((item) => item.assessmentId === record.assessmentId ? record : item) : [record, ...items];
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
    const savedRecord: CardiopulmonaryTreatmentRecord = record.status === "completed" && record.paperSignatureStatus !== "archived"
      ? { ...record, paperSignatureStatus: "pending_patient_signature" }
      : record;
    setTreatmentRecords((items) => {
      const next = items.some((item) => item.treatmentId === savedRecord.treatmentId) ? items.map((item) => item.treatmentId === savedRecord.treatmentId ? savedRecord : item) : [savedRecord, ...items];
      return next;
    });
    setPatients((items) => items.map((patient) => patient.patient_demo_id === savedRecord.patientId ? { ...patient, updated_by: savedRecord.therapist, updated_at: savedRecord.treatmentAt, audit_log: [...patient.audit_log, `${savedRecord.treatmentAt.slice(0, 10)} ${savedRecord.therapist}${savedRecord.status === "completed" ? "完成并签署" : "保存"}心肺康复治疗记录`] } : patient));
    if (!savedRecord.encounterId) return;
    const linkedEncounter = trainingEncounters.find((item) => item.encounterId === savedRecord.encounterId);
    if (savedRecord.paperSignatureStatus === "archived") {
      updateTrainingEncounter(savedRecord.encounterId, { paperSignatureStatus: "archived", paperArchivedAt: savedRecord.paperArchivedAt });
    }
    if (savedRecord.status !== "completed") return;
    const now = new Date().toISOString();
    updateTrainingEncounter(savedRecord.encounterId, {
      status: "completed",
      postAssessmentCompletedAt: now,
      signedAt: savedRecord.signature?.signedAt ?? now,
      paperSignatureStatus: savedRecord.paperSignatureStatus ?? "pending_patient_signature"
    });
    if (linkedEncounter) setAppointments((items) => items.map((item) => item.id === linkedEncounter.appointmentId ? { ...item, status: "completed" } : item));
    const linkedSession = trainingSessions.find((item) => item.id === savedRecord.sessionId || item.encounterId === savedRecord.encounterId);
    const patient = patients.find((item) => item.patient_demo_id === savedRecord.patientId);
    if (!linkedSession || !patient) return;
    const completedSession: StoredTrainingSession = {
      ...linkedSession,
      postBp: savedRecord.postAssessment.bloodPressure || null,
      postHr: savedRecord.postAssessment.heartRate,
      postSpo2: savedRecord.postAssessment.spo2,
      postRespRate: savedRecord.postAssessment.respiratoryRate,
      avgSpo2: linkedSession.avgSpo2 ?? savedRecord.postAssessment.spo2,
      minSpo2: linkedSession.minSpo2 ?? savedRecord.postAssessment.spo2,
      avgRespRate: linkedSession.avgRespRate ?? savedRecord.postAssessment.respiratoryRate,
      rpe: savedRecord.postAssessment.borg,
      symptom: savedRecord.postAssessment.symptomChange || linkedSession.symptom,
      safetyEvents: [savedRecord.adverseEvent, ...linkedSession.safetyEvents].filter(Boolean),
      fieldNote: savedRecord.fieldAction || linkedSession.fieldNote
    };
    const completedSessions = trainingSessions.map((item) => item.id === completedSession.id ? completedSession : item);
    setTrainingSessions(completedSessions);
    const report = createSingleReportFromSession(completedSession, toReportPatientSnapshot({ ...patient, weight_kg: Number(patient.weight_kg) || undefined }));
    setSingleReports((items) => items.some((item) => item.singleReportId === report.singleReportId) ? items.map((item) => item.singleReportId === report.singleReportId ? report : item) : [report, ...items]);
    generateStageReportForPatient(savedRecord.patientId, completedSessions, false, linkedEncounter?.prescriptionTaskId ?? completedSession.prescriptionTaskId);
  }

  function deleteTreatmentRecords(recordIds: string[]) {
    setTreatmentRecords((items) => items.filter((item) => !recordIds.includes(item.treatmentId)));
    setSelectedTreatmentRecordId(null);
  }

  function deletePrescriptionTasks(taskIds: string[]) {
    setPrescriptionTasks((items) => items.filter((item) => !taskIds.includes(item.id)));
    setSelectedPrescriptionTaskId(null);
  }

  function saveRehabReport(report: RehabReport) {
    setRehabReports((items) => {
      const next = items.some((item) => item.reportId === report.reportId) ? items.map((item) => item.reportId === report.reportId ? report : item) : [report, ...items];
      return next;
    });
    if (report.status === "published") {
      setFollowUpTasks((tasks) => markDischargeReportPublished(tasks, report.patientId, report.publishedAt ?? report.generatedAt));
      setPatients((items) => items.map((patient) => patient.patient_demo_id === report.patientId ? { ...patient, report_status: "已发布", training_status: "已完成院内康复", rehab_stage: "冠心病3期", discharge_date: patient.discharge_date || (report.publishedAt ?? report.generatedAt).slice(0, 10), updated_by: report.confirmedBy ?? currentAccount, updated_at: report.publishedAt ?? report.generatedAt, audit_log: [...patient.audit_log, `${(report.publishedAt ?? report.generatedAt).slice(0, 10)} ${report.confirmedBy ?? currentAccount}发布康复出院报告，系统自动标记出院并生成随访提醒`] } : patient));
    }
  }

  function generateStageReportForPatient(patientId: string, sessions: StoredTrainingSession[], force = false, prescriptionTaskId?: string) {
    const patient = patients.find((item) => item.patient_demo_id === patientId);
    if (!patient) return;
    const prescription = prescriptionTasks.find((item) => item.id === prescriptionTaskId)
      ?? prescriptionTasks.filter((item) => item.patientId === patientId && item.status === "completed").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const patientSessions = sessions
      .filter((item) => item.patientId === patientId && item.completed)
      .sort((a, b) => a.actualStartAt.localeCompare(b.actualStartAt));
    const linkedSessions = prescription?.id
      ? patientSessions.filter((item) => item.prescriptionTaskId === prescription.id)
      : patientSessions;
    const plannedSessions = prescription?.plannedSessions ?? 12;
    const cycleSessions = linkedSessions.length >= 2
      ? linkedSessions.slice(-plannedSessions)
      : patientSessions.slice(-plannedSessions);
    const reachedCount = cycleSessions.length >= plannedSessions;
    const reachedDate = Boolean(prescription?.cycleEndDate && new Date().toISOString().slice(0, 10) >= prescription.cycleEndDate);
    if (!force && !reachedCount && !reachedDate) return;
    const selectedIds = cycleSessions.map((item) => item.id);
    if (selectedIds.length < 2) return;
    const fingerprint = [...selectedIds].sort().join("|");
    if (stageReports.some((item) => [...item.selectedSessionIds].sort().join("|") === fingerprint)) return;
    const previousVersion = Math.max(0, ...stageReports.filter((item) => item.patientId === patientId).map((item) => item.version ?? 0));
    const report = createStoredStageReport(toReportPatientSnapshot({ ...patient, weight_kg: Number(patient.weight_kg) || undefined }), cycleSessions, selectedIds, previousVersion);
    const now = new Date().toISOString();
    const sentReport: StoredStageReport = {
      ...report,
      scope: "prescription_cycle",
      prescriptionTaskId: prescription?.id,
      prescriptionVersion: prescription?.version,
      status: "sent",
      generatedBy: force ? currentAccount : "系统自动生成",
      sentBy: force ? currentAccount : "系统自动生成",
      sentAt: now,
      updatedAt: now
    };
    setStageReports((items) => [sentReport, ...items]);
  }

  function saveTrainingSession(session: StoredTrainingSession) {
    setTrainingSessions((items) => items.some((item) => item.id === session.id)
      ? items.map((item) => item.id === session.id ? session : item)
      : [session, ...items]);
    const patient = patients.find((item) => item.patient_demo_id === session.patientId);
    if (!patient) return;
    const snapshot = toReportPatientSnapshot({
      ...patient,
      weight_kg: Number(patient.weight_kg) || undefined
    });
    const singleReport = createSingleReportFromSession(session, snapshot);
    setSingleReports((items) => items.some((item) => item.id === singleReport.id)
      ? items.map((item) => item.id === singleReport.id ? singleReport : item)
      : [singleReport, ...items]);
    setPatients((items) => items.map((item) => item.patient_demo_id === session.patientId ? {
      ...item,
      training_status: "已记录实际训练",
      updated_by: session.recordedBy ?? currentAccount,
      updated_at: session.recordedAt ?? new Date().toISOString(),
      audit_log: [...item.audit_log, `${(session.recordedAt ?? new Date().toISOString()).slice(0, 10)} ${session.recordedBy ?? currentAccount}保存${session.exerciseType}单次训练记录`]
    } : item));
    if (session.encounterId) {
      const encounter = trainingEncounters.find((item) => item.encounterId === session.encounterId);
      const now = new Date().toISOString();
      const hasRemainingTasks = encounter?.dailyTrainingTasks?.some((item) => item.status === "pending") ?? false;
      updateTrainingEncounter(session.encounterId, {
        status: hasRemainingTasks ? "awaiting_next_task" : "post_assessment",
        sessionId: session.id,
        singleReportId: singleReport.singleReportId,
        ...(hasRemainingTasks ? {} : { trainingEndedAt: session.actualEndAt ?? now }),
        immediateSummary: {
          outcome: session.terminatedEarly ? "terminated" : session.activeMinutes < session.totalMinutes ? "partially_completed" : "completed",
          activeMinutes: session.activeMinutes,
          averageHeartRate: session.avgHr,
          peakHeartRate: session.peakHr,
          minimumSpo2: session.minSpo2,
          averagePower: session.avgPower,
          pauses: session.pauses,
          safetySummary: session.safetyEvents.length ? session.safetyEvents.join("；") : "无异常",
          generatedAt: now
        }
      });
      if (encounter) setAppointments((items) => items.map((item) => item.id === encounter.appointmentId ? { ...item, status: "in_training" } : item));
      setTreatmentRecords((items) => items.map((item) => item.encounterId === session.encounterId ? {
        ...item,
        sessionId: session.id,
        treatmentSummary: `${session.exerciseType}设备训练已结束，已生成即时摘要，待补充训练后评估。`,
        actualMetrics: {
          averageHeartRate: { value: session.avgHr, source: "DEVICE_CAPTURED", sourceRecordId: session.id, capturedAt: session.recordedAt },
          peakHeartRate: { value: session.peakHr, source: "DEVICE_CAPTURED", sourceRecordId: session.id, capturedAt: session.recordedAt },
          activeMinutes: { value: session.activeMinutes, source: "RULE_DERIVED", sourceRecordId: session.id, capturedAt: session.recordedAt }
        },
        adverseEvent: session.safetyEvents.join("；"),
        fieldAction: session.fieldNote ?? ""
      } : item));
    }
  }

  function saveSingleReport(report: StoredSingleReport) {
    setSingleReports((items) => items.some((item) => item.id === report.id)
      ? items.map((item) => item.id === report.id ? report : item)
      : [report, ...items]);
  }

  function saveStageReport(report: StoredStageReport) {
    setStageReports((items) => items.some((item) => item.reportId === report.reportId)
      ? items.map((item) => item.reportId === report.reportId ? { ...report, updatedAt: new Date().toISOString() } : item)
      : [{ ...report, updatedAt: new Date().toISOString() }, ...items]);
  }

  function confirmStageReport(reportId: string, account: string) {
    if (!canActAs(role, "DOCTOR")) return;
    setStageReports((items) => items.map((item) => item.reportId === reportId ? { ...item, status: "confirmed", confirmedBy: account, confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item));
  }

  function publishStageReport(reportId: string, account: string) {
    if (!canActAs(role, "DOCTOR")) return;
    setStageReports((items) => items.map((item) => item.reportId === reportId ? { ...item, status: "sent", sentBy: account, sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item));
  }

  if (system === "chooser") return <SystemChooser onChoose={(target) => setSystem(target === "doctor" ? "staffLogin" : "patient")} />;

  if (system === "staffLogin") {
    return <StaffLogin onBack={() => setSystem("chooser")} onLogin={(nextRole, username, name) => { setRole(nextRole); setAccountId(username); setAccountName(name); setDoctorPage(firstPageForRole(nextRole)); setSystem("doctor"); }} />;
  }

  if (system === "patient") {
    return <PatientApp onExit={() => setSystem("chooser")} trainingState={trainingState} setTrainingState={setTrainingState} anomaly={anomaly} setAnomaly={setAnomaly} publishedTrainingVideos={publishedTrainingVideos} followUpTasks={followUpTasks} rehabReports={rehabReports} singleReports={singleReports} stageReports={stageReports.filter((report) => report.status === "sent")} trainingSessions={trainingSessions} patients={patients} trainingEncounters={trainingEncounters} prescriptionTasks={prescriptionTasks} prescriptionContents={prescriptionContents} onUpdateEncounter={updateTrainingEncounter} onSaveTrainingSession={saveTrainingSession} />;
  }

  const doctorContent: Partial<Record<DoctorPageKey, React.ReactNode>> = {
    dashboard: <DashboardPage role={role} patients={patients} followUpTasks={scopedFollowUpTasks} prescriptionTasks={prescriptionTasks} treatmentRecords={treatmentRecords} alertEvents={alertEvents} appointments={appointments} accountId={accountId} currentAccount={currentAccount} onOpenFollowUps={openFollowUps} onOpenReports={() => { setSelectedPatientId("P-DEMO-001"); setPatientInitialTab("sessions"); navigateDoctor("patients"); }} onOpenTraining={() => navigateDoctor("training")} onOpenPrescriptions={(status) => { setPrescriptionInitialStatus(status); setPrescriptionInitialTab("current"); navigateDoctor("prescriptions"); }} onOpenPrescriptionTask={(taskId) => openPrescriptionTask(taskId, "current")} onOpenTreatments={openTreatmentList} onOpenTreatmentRecord={openTreatmentRecord} onOpenAlerts={openAlerts} onNavigate={navigateDoctor} />,
    patients: <PatientArchivePage key={`${role}-${selectedPatientId ?? "list"}-${patientInitialTab}-${standaloneRecordId}`} role={role} currentAccount={currentAccount} patients={patients} followUpTasks={followUpTasks} followUpRecords={followUpRecords} clinicalNarratives={clinicalNarratives} clinicalProfiles={patientClinicalProfiles} assessmentRecords={assessmentRecords} treatmentRecords={treatmentRecords} rehabReports={rehabReports} appointments={appointments} prescriptionTasks={prescriptionTasks} trainingSessions={trainingSessions} singleReports={singleReports} stageReports={stageReports} initialPatientId={selectedPatientId} initialTab={patientInitialTab} initialRecordId={standaloneRecordId || null} initialRecordKind={standaloneRecordKind || null} onSavePatient={savePatientRecord} onUpdatePatient={updatePatientRecord} onOpenFollowUp={(taskId) => openFollowUps("pending", taskId)} onOpenAssessment={openAssessment} onOpenPrescriptionTask={(taskId, patientId) => openPrescriptionTask(taskId, "current", patientId)} onCreatePrescription={createPrescriptionForPatient} onSaveAssessment={saveAssessmentRecord} onSaveTreatmentRecord={saveTreatmentRecord} onSaveRehabReport={saveRehabReport} onSaveTrainingSession={saveTrainingSession} onSaveSingleReport={saveSingleReport} onSaveStageReport={saveStageReport} onConfirmStageReport={confirmStageReport} onPublishStageReport={publishStageReport} onSaveFollowUpRecord={saveFollowUpRecord} onDeleteFollowUpRecord={deleteFollowUpRecord} onArchivePatients={archivePatients} onRestorePatients={restorePatients} />,
    assessment: <AssessmentWorkspacePage key={`${role}-${selectedPatientId ?? "all"}-${selectedAssessmentRecordId ?? "new"}`} role={role} currentAccount={currentAccount} patients={patients} records={assessmentRecords} initialPatientId={selectedPatientId} initialRecordId={selectedAssessmentRecordId} backLabel={assessmentReturnPrescriptionTaskId ? "返回处方相关报告" : "返回患者档案"} onSave={saveAssessmentRecord} onBack={closeAssessment} />,
    followups: <FollowUpManagementPage key={`${role}-${followUpEntryView}-${selectedFollowUpTaskId ?? "list"}`} role={role} currentAccount={currentAccount} patients={patients} tasks={followUpTasks} records={followUpRecords} initialView={followUpEntryView} initialTaskId={selectedFollowUpTaskId} onSaveRecord={saveFollowUpRecord} onOpenPatient={openPatient} />,
    training: <NurseStationPage role={role} currentAccount={currentAccount} encounters={trainingEncounters} appointments={appointments} patients={patients} prescriptions={prescriptionTasks} treatmentRecords={treatmentRecords} trainingSessions={trainingSessions} singleReports={singleReports} stageReports={stageReports} initialEncounterId={selectedTrainingEncounterId} onUpdateEncounter={updateTrainingEncounter} onImportHandoff={importDeviceHandoff} onPublishHandoff={publishEncounterHandoff} onSaveTrainingSession={saveTrainingSession} onCreateAlert={createEncounterAlert} onOpenTreatment={openEncounterTreatment} onGenerateStageReport={(patientId, prescriptionTaskId) => generateStageReportForPatient(patientId, trainingSessions, true, prescriptionTaskId)} />,
    report: <RehabDischargeReportPage key={`${role}-${selectedPatientId ?? "all"}`} role={role} currentAccount={currentAccount} patients={patients} assessments={assessmentRecords} followUps={followUpTasks} followUpRecords={followUpRecords} reports={rehabReports} trainingSessions={trainingSessions} stageReports={stageReports} initialPatientId={selectedPatientId} onSave={saveRehabReport} onSaveStageReport={saveStageReport} onConfirmStageReport={confirmStageReport} onPublishStageReport={publishStageReport} />,
    prescriptions: (() => {
      const selectedTask = prescriptionTasks.find((item) => item.id === selectedPrescriptionTaskId);
      const selectedPatient = selectedTask ? patients.find((item) => item.patient_demo_id === selectedTask.patientId) : undefined;
      const selectedProfile = selectedTask
        ? patientClinicalProfiles.find((item) => item.patientId === selectedTask.patientId)
          ?? (selectedPatient ? createClinicalProfileFromPatient(selectedPatient, assessmentRecords) : undefined)
        : undefined;
      if (selectedTask && selectedProfile) return <PrescriptionWorkspacePage key={`${selectedTask.id}-${prescriptionInitialTab}`} task={selectedTask} allTasks={prescriptionTasks} role={role} accountId={accountId} currentAccount={currentAccount} profile={selectedProfile} content={prescriptionContents[selectedTask.id] ?? initialPrescriptionContents[selectedTask.id] ?? defaultPrescriptionContent} rehabReports={rehabReports} assessmentRecords={assessmentRecords} treatmentRecords={treatmentRecords} followUpRecords={followUpRecords} singleReports={singleReports} stageReports={stageReports} initialTab={prescriptionInitialTab} onBack={() => { setSelectedPrescriptionTaskId(null); if (prescriptionReturnPatientId) openPatient(prescriptionReturnPatientId, "prescriptions"); else resetViewScroll(); setPrescriptionReturnPatientId(null); }} onOpenPatient={(patientId, tab) => openPatient(patientId, (tab === "rehabReport" ? "rehabReports" : tab) as PatientWorkspaceTab)} onOpenAssessment={(patientId, recordId) => openAssessment(patientId, recordId, selectedTask.id)} onUpdateTask={updatePrescriptionTask} onSaveContent={savePrescriptionContent} onSaveRehabReport={saveRehabReport} />;
      return <PrescriptionManagementPage role={role} accountId={accountId} tasks={prescriptionTasks} initialStatus={prescriptionInitialStatus} onOpen={(taskId) => openPrescriptionTask(taskId, "current")} onDelete={deletePrescriptionTasks} />;
    })(),
    treatments: <TreatmentManagementPage key={`${selectedTreatmentPatientId ?? "list"}-${selectedTreatmentRecordId ?? "none"}-${treatmentInitialStatus}`} role={role} currentAccount={currentAccount} patients={patients} profiles={patientClinicalProfiles} treatmentRecords={treatmentRecords} prescriptionTasks={prescriptionTasks} encounters={trainingEncounters} singleReports={singleReports} stageReports={stageReports} initialStatus={treatmentInitialStatus} initialPatientId={selectedTreatmentPatientId} initialRecordId={selectedTreatmentRecordId} onOpenRecord={openTreatmentRecord} onBackToList={() => openTreatmentList(treatmentInitialStatus)} onSave={saveTreatmentRecord} onAdvanceToDevice={advanceEncounterToDevice} onPaperArchive={saveTreatmentRecord} onDelete={deleteTreatmentRecords} />,
    alerts: <AlertManagementPage key={`${role}-${accountId}-${alertInitialStatus}`} role={role} accountId={accountId} initialStatus={alertInitialStatus} patients={patients} prescriptionTasks={prescriptionTasks} events={alertEvents} setEvents={setAlertEvents} rules={alertRules} setRules={setAlertRules} />,
    appointments: <AppointmentManagementPage role={role} accountId={accountId} currentAccount={currentAccount} patients={patients} appointments={appointments} setAppointments={setAppointments} prescriptionTasks={prescriptionTasks} prescriptionContents={prescriptionContents} encounters={trainingEncounters} onCheckIn={checkInAppointment} onOpenTreatment={openTreatmentRecord} onOpenTraining={(encounterId) => { setSelectedTrainingEncounterId(encounterId); setDoctorPage("training"); resetViewScroll(); }} />,
    videoConfig: <VideoLibraryPage role={role} videos={trainingVideos} setVideos={setTrainingVideos} />
  };

  for (const page of adminConsolePages) {
    doctorContent[page] = <AdminConsolePage page={page as Exclude<DoctorPageKey, "dashboard" | "patients" | "assessment" | "followups" | "report" | "training" | "videoConfig" | "prescriptions" | "treatments" | "alerts" | "appointments">} role={role} currentAccount={currentAccount} />;
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

function mergeSeedRecords<T>(stored: T[], seeds: T[], getId: (item: T) => string): T[] {
  const existing = new Set(stored.map(getId));
  return [...stored, ...seeds.filter((item) => !existing.has(getId(item)))];
}

function mergeSeedDefaults<T extends object>(stored: T[], seeds: T[], getId: (item: T) => string): T[] {
  const seedMap = new Map(seeds.map((item) => [getId(item), item]));
  const merged = stored.map((item) => ({ ...(seedMap.get(getId(item)) ?? {}), ...item } as T));
  const existing = new Set(merged.map(getId));
  return [...merged, ...seeds.filter((item) => !existing.has(getId(item)))];
}

function alignAppointmentsToCurrentDemoDay(appointments: Appointment[]) {
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const values = Object.fromEntries(dateParts.map((item) => [item.type, item.value]));
  const today = `${values.year}-${values.month}-${values.day}`;
  const currentTime = `${values.hour}:${values.minute}`;
  const seedIds = new Set(initialAppointments.map((item) => item.id));
  const replaceDate = (value?: string) => value ? value.replace(/^\d{4}-\d{2}-\d{2}/, today) : value;
  return appointments.map((appointment) => {
    const isOpenWorkflow = ["arrived", "in_training"].includes(appointment.status);
    if (!seedIds.has(appointment.id) && !isOpenWorkflow) return appointment;
    return {
      ...appointment,
      date: today,
      time: appointment.id === "APT-LXX-TODAY" ? currentTime : appointment.time,
      checkedInAt: replaceDate(appointment.checkedInAt),
      statusConfirmedAt: replaceDate(appointment.statusConfirmedAt)
    };
  });
}

function createClinicalProfileFromPatient(patient: ManagedPatient, assessments: AssessmentRecord[]): PatientClinicalProfile {
  const latestAssessment = assessments
    .filter((item) => item.patientId === patient.patient_demo_id && item.status !== "draft")
    .sort((a, b) => b.assessedAt.localeCompare(a.assessedAt))[0];
  const heightCm = Number(patient.height_cm) || null;
  const weightKg = latestAssessment?.weightKg ?? (Number(patient.weight_kg) || null);
  const bmi = heightCm && weightKg ? Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : null;
  const [systolic, diastolic] = (latestAssessment?.preVitals.bloodPressure ?? "")
    .split("/")
    .map((value) => Number(value) || null);
  const riskLevel: PatientClinicalProfile["riskLevel"] = ["低危", "中危", "高危"].includes(patient.risk_level)
    ? patient.risk_level as PatientClinicalProfile["riskLevel"]
    : "中危";
  const metricStatus = latestAssessment
    ? latestAssessment.status === "doctor_reviewed" ? "confirmed" as const : "pending_review" as const
    : "not_collected" as const;
  const measuredAt = latestAssessment?.assessedAt.slice(0, 10) ?? "";
  return {
    patientId: patient.patient_demo_id,
    patientNo: patient.patient_no,
    name: patient.name,
    sex: patient.gender,
    age: patient.age,
    birthDate: patient.birth_date,
    heightCm,
    weightKg,
    bmi,
    dischargeDate: patient.discharge_date,
    previousFollowUpDate: patient.last_followup,
    nextFollowUpDate: "",
    currentPrescriptionVersion: patient.prescription_version,
    trainingStatus: patient.training_status,
    latestAbnormal: patient.latest_abnormal,
    idNumberMasked: patient.id_number || "未提供",
    contact: patient.phone,
    riskLevel,
    rehabStage: patient.rehab_stage,
    diagnosis: patient.diagnosis_summary,
    medicalHistory: patient.medical_history,
    specialMedications: patient.current_medications,
    cpet: patient.assessment.cpet || "待补充",
    cpetStatus: patient.assessment.cpet ? "pending_review" : "not_collected",
    sixMinuteWalk: patient.assessment.six_mwt || "待补充",
    restingVitals: latestAssessment
      ? `HR ${latestAssessment.preVitals.pulse ?? "未采集"} bpm · BP ${latestAssessment.preVitals.bloodPressure || "未采集"}`
      : "待补充",
    updatedBy: patient.updated_by,
    updatedAt: patient.updated_at,
    rehabAssessment: {
      assessmentId: latestAssessment?.assessmentId ?? "",
      assessedAt: latestAssessment?.assessedAt ?? "",
      assessor: latestAssessment?.therapist ?? latestAssessment?.enteredBy ?? "",
      source: "结构化录入",
      status: latestAssessment ? (latestAssessment.status === "doctor_reviewed" ? "已复核" : "待复核") : "待补充",
      sppb: {
        balanceScore: latestAssessment?.sppb.balance.score ?? 0,
        gaitScore: latestAssessment?.sppb.walk4m.score ?? 0,
        chairStandScore: latestAssessment?.sppb.chairStand.score ?? 0,
      },
      sixMinuteWalk: {
        distanceMeters: null,
        baselineMeters: null,
        startHeartRate: latestAssessment?.preVitals.pulse ?? null,
        endHeartRate: latestAssessment?.postVitals.pulse ?? null,
      },
      cpet: {
        peakVo2: null,
        anaerobicThreshold: null,
        peakHr: { value: null, unit: "bpm", measuredAt: "", source: "CPET", status: "not_collected" },
        anaerobicThresholdHr: { value: null, unit: "bpm", measuredAt: "", source: "CPET", status: "not_collected" },
        contraindication: "待医生评估",
      },
      restingVitals: {
        heartRate: latestAssessment?.preVitals.pulse ?? null,
        metric: {
          value: latestAssessment?.preVitals.pulse ?? null,
          unit: "bpm",
          measuredAt,
          source: "SPPB",
          status: metricStatus,
          verifiedBy: latestAssessment?.reviewedBy,
          verifiedAt: latestAssessment?.reviewedAt,
        },
        systolic,
        diastolic,
        spo2: null,
      },
    },
  };
}

function normalizeStageReportVersions(reports: StoredStageReport[]) {
  const versionById = new Map<string, number>();
  const patientIds = Array.from(new Set(reports.map((item) => item.patientId)));
  patientIds.forEach((patientId) => {
    reports
      .filter((item) => item.patientId === patientId)
      .sort((a, b) => `${a.periodEnd}|${a.generatedAt}|${a.reportId}`.localeCompare(`${b.periodEnd}|${b.generatedAt}|${b.reportId}`))
      .forEach((item, index) => versionById.set(item.reportId, index + 1));
  });
  return reports.map((item) => ({ ...item, version: versionById.get(item.reportId) ?? item.version ?? 1 }));
}
