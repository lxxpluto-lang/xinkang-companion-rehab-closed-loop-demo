import { describe, expect, it } from "vitest";
import { can, canActAs } from "../src/accessControl";

describe("administrator clinical capabilities", () => {
  it("allows an administrator to perform doctor and rehabilitation workflows", () => {
    expect(canActAs("ADMIN", "DOCTOR")).toBe(true);
    expect(canActAs("ADMIN", "REHAB_EXECUTION")).toBe(true);
  });

  it("keeps the original doctor and rehabilitation boundaries", () => {
    expect(canActAs("DOCTOR", "DOCTOR")).toBe(true);
    expect(canActAs("DOCTOR", "REHAB_EXECUTION")).toBe(false);
    expect(canActAs("REHAB_EXECUTION", "REHAB_EXECUTION")).toBe(true);
    expect(canActAs("REHAB_EXECUTION", "DOCTOR")).toBe(false);
  });

  it("retains all configured administrator actions", () => {
    expect(can("ADMIN", "CREATE")).toBe(true);
    expect(can("ADMIN", "EDIT")).toBe(true);
    expect(can("ADMIN", "REVIEW")).toBe(true);
    expect(can("ADMIN", "SIGN")).toBe(true);
    expect(can("ADMIN", "PUBLISH")).toBe(true);
  });
});
