import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { addJobDataType } from "../../types/job/jobTypes";
import { sendJobDataToAPI } from "../../api/hr/addJob.api";
import toast from "react-hot-toast";

// Define the store's state type
export type jobStoreType = {
  jobData: addJobDataType | null;
  submitJobLoading: boolean;
  setJobData: (formData: addJobDataType) => void;
  clearJobData: () => void;
  jobState: (formData: addJobDataType) => Promise<boolean>;
};

const useJobStore = create(
  persist<jobStoreType>(
    (set) => ({
      jobData: null,
      submitJobLoading: false,

      setJobData: (formData) => set({ jobData: formData }),

      clearJobData: () => set({ jobData: null }),

      jobState: async (formData) => {
        set({ submitJobLoading: true });

        try {
          const response = await sendJobDataToAPI(formData);

          if (response) {
            set({ jobData: formData });
            return true;
          } else {
            toast.error("Failed to post job.");
            return false;
          }
        } catch (error) {
          toast.error("Error submitting job data.");
          console.error("Error submitting job data:", error);
          return false;
        } finally {
          set({ submitJobLoading: false });
        }
      },
    }),
    {
      name: "job-data-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useJobStore;
