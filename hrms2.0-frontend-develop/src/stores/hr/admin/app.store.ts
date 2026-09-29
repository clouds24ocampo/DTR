import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MessageIo } from "../../../types/global/messaging/messageio.types";
import { MessengerUser, Conversation } from "../../../types/global/messaging/messaging.types";
import { Applicant } from "../../../types/hr/applicant/applicationInfoTypes";
import { Category, JobPost } from "../../../types/hr/job/jobPostingTypes";
import { DocumentType } from "../../../types/hr/document/document.type";
import { Employee } from "../../../types/hr/employee/employeeDataTypes";

type AppState = {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;

  applicants: Applicant[];
  setApplicants: (applicants: Applicant[]) => void;

  filteredPosts: JobPost[];
  setFilteredPosts: (filteredPosts: JobPost[]) => void;

  categories: Category[];
  setCategories: (categories: Category[]) => void;

  documents: DocumentType[];
  setDocuments: (documents: DocumentType[]) => void;

  messengerUsers: MessengerUser[];
  setMessengerUsers: (messengerUsers: MessengerUser[]) => void;

  messages: MessageIo[];
  setMessages: (messages: MessageIo[]) => void;

  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;

  clearAll: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      employees: [],
      setEmployees: (employees) => set({ employees }),

      applicants: [],
      setApplicants: (applicants) => set({ applicants }),

      filteredPosts: [],
      setFilteredPosts: (filteredPosts) => set({ filteredPosts }),

      categories: [],
      setCategories: (categories) => set({ categories }),

      documents: [],
      setDocuments: (documents) => set({ documents }),

      messengerUsers: [],
      setMessengerUsers: (messengerUsers) => set({ messengerUsers }),

      conversations: [],
      setConversations: (conversations) => set({ conversations }),

      messages: [],
      setMessages: (messages) => set({ messages }),

      clearAll: () =>
        set({
          employees: [],
          applicants: [],
          filteredPosts: [],
          categories: [],
          documents: [],
          messengerUsers: [],
          conversations: [],
          messages: [],
        }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        employees: state.employees,
        applicants: state.applicants,
        filteredPosts: state.filteredPosts,
        categories: state.categories,
        documents: state.documents,
        messengerUsers: state.messengerUsers,
        conversations: state.conversations,
        messages: state.messages,
      }),
    }
  )
);
