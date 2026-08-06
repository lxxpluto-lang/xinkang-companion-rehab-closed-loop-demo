export type StaffSignatureProfile = {
  staffName: string;
  fileName: string;
  imageData: string;
  updatedAt: string;
};

const STORAGE_KEY = "xinkang-staff-signatures";

export function readStaffSignature(staffName: string): StaffSignatureProfile | undefined {
  try {
    const values = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StaffSignatureProfile[];
    return values.find((item) => item.staffName === staffName);
  } catch {
    return undefined;
  }
}

export function saveStaffSignature(profile: StaffSignatureProfile) {
  let values: StaffSignatureProfile[] = [];
  try {
    values = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StaffSignatureProfile[];
  } catch {
    values = [];
  }
  const next = values.some((item) => item.staffName === profile.staffName)
    ? values.map((item) => item.staffName === profile.staffName ? profile : item)
    : [...values, profile];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("xinkang-signature-updated", { detail: profile }));
}
