import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  loginApi,
  logoutApi,
  requestPasswordResetPinApi,
  verifyPasswordResetPinApi,
  resetPasswordApi,
} from "../../api/auth/auth.api";
import { switchUserRole } from "../../api/workplace/user/user.api";
import { AuthStoreType } from "../../types/auth/auth.type";

const useAuthStore = create(
  persist<AuthStoreType>(
    (set) => ({
      account: null,
      loginLoading: false,
      logoutLoading: false,
      forgotPasswordLoading: false,
      verifyPinLoading: false,
      resetPasswordLoading: false,
      isSwitching: false,
      showSplash: true,

      login: async ({ email, password }) => {
        set({ loginLoading: true });
        try {
          const response = await loginApi(email, password);
          const user = response.data.user;

          if (user.archived === true || String(user.archived) === "true") {
            await logoutApi();
            return {
              success: false,
              message: "Your account is currently inactive. Please contact the HR department for assistance."
            };
          }

          if (response.data.token) {
            localStorage.setItem("auth-token", response.data.token);
          }
          set({ account: user, showSplash: false });
          return { success: true };
        } catch (error) {
          console.error("Error logging in account", error);
          let message = "An unexpected error occurred.";
          if (error instanceof AxiosError) {
            if (error.response) {
              message = error.response.data.message;
            } else {
              message = error.message;
            }
          }
          return { success: false, message };
        } finally {
          set({ loginLoading: false });
        }
      },

      logoutUser: async () => {
        set({ logoutLoading: true });
        try {
          await logoutApi();
          localStorage.removeItem("auth-token");
          set({ account: null });
        } catch (error) {
          console.error("Error logging out account", error);
          if (error instanceof AxiosError) {
            if (error.response) {
              toast.error(error.response.data.message);
            } else {
              toast.error(error.message);
            }
          } else {
            toast.error("An unexpected error occurred.");
          }
        } finally {
          set({ logoutLoading: false });
        }
      },

      setAccount: (account) => {
        set({ account });
      },

      requestPasswordResetPin: async (email: string) => {
        set({ forgotPasswordLoading: true });
        try {
          await requestPasswordResetPinApi(email);
          toast.success("PIN sent to your email address");
          return true;
        } catch (error) {
          console.error("Error requesting password reset PIN", error);
          if (error instanceof AxiosError) {
            if (error.response) {
              toast.error(error.response.data.message);
            } else {
              toast.error(error.message);
            }
          } else {
            toast.error("An unexpected error occurred.");
          }
          return false;
        } finally {
          set({ forgotPasswordLoading: false });
        }
      },

      verifyPasswordResetPin: async (email: string, pin: string) => {
        set({ verifyPinLoading: true });
        try {
          await verifyPasswordResetPinApi(email, pin);
          toast.success("PIN verified successfully");
          return true;
        } catch (error) {
          console.error("Error verifying PIN", error);
          if (error instanceof AxiosError) {
            if (error.response) {
              toast.error(error.response.data.message);
            } else {
              toast.error(error.message);
            }
          } else {
            toast.error("An unexpected error occurred.");
          }
          return false;
        } finally {
          set({ verifyPinLoading: false });
        }
      },

      resetPassword: async (email: string, pin: string, newPassword: string) => {
        set({ resetPasswordLoading: true });
        try {
          await resetPasswordApi(email, pin, newPassword);
          toast.success("Password reset successfully");
          return true;
        } catch (error) {
          console.error("Error resetting password", error);
          if (error instanceof AxiosError) {
            if (error.response) {
              toast.error(error.response.data.message);
            } else {
              toast.error(error.message);
            }
          } else {
            toast.error("An unexpected error occurred.");
          }
          return false;
        } finally {
          set({ resetPasswordLoading: false });
        }
      },

      switchRole: async (role: string) => {
        set({ isSwitching: true });
        try {
          const response = await switchUserRole(role);
          if (response?.user) {
            set({ account: response.user });
            toast.success(`Switched role to ${role}`);
            return true;
          }
          set({ isSwitching: false });
          return false;
        } catch (error) {
          console.error("Error switching role", error);
          toast.error("Failed to switch role");
          set({ isSwitching: false });
          return false;
        }
      },

      setIsSwitching: (isSwitching: boolean) => {
        set({ isSwitching });
      },

      setShowSplash: (showSplash: boolean) => {
        set({ showSplash });
      },

    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { showSplash, isSwitching, ...rest } = state;
        return rest as AuthStoreType;
      }
    }
  )
);

export default useAuthStore;
