import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { EnquiryDetails, UserType } from "@momentum/shared";

export type WizardStep = "type" | "details" | "verify" | "requirements";

interface WizardState {
  step: WizardStep;
  userType: UserType | null;
  details: EnquiryDetails | null;
  mobile: string | null;
  enquiryId: string | null;
  referenceNo: string | null;
  chooseUserType: (userType: UserType) => void;
  saveDetails: (details: EnquiryDetails, mobile: string) => void;
  enquiryCreated: (enquiryId: string, referenceNo: string) => void;
  goTo: (step: WizardStep) => void;
  reset: () => void;
}

const initial = {
  step: "type" as WizardStep,
  userType: null,
  details: null,
  mobile: null,
  enquiryId: null,
  referenceNo: null,
};

/**
 * Availability wizard progress. Kept in sessionStorage so a refresh mid-journey resumes
 * the current step, and closing the tab discards the entered details.
 */
export const useAvailabilityWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...initial,
      chooseUserType: (userType) =>
        set((s) => ({
          userType,
          step: "details",
          // Details belong to one user type; switching type starts the form again.
          details: s.userType === userType ? s.details : null,
        })),
      saveDetails: (details, mobile) => set({ details, mobile, step: "verify" }),
      enquiryCreated: (enquiryId, referenceNo) => set({ enquiryId, referenceNo, step: "requirements" }),
      goTo: (step) => set({ step }),
      reset: () => set(initial),
    }),
    { name: "momentum-availability", storage: createJSONStorage(() => sessionStorage) }
  )
);
