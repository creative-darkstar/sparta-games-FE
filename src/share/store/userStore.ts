import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { getUserData } from "../../api/user";
import { TUserData, TUserDataResponse } from "../../types";

type Store = {
  authStatus: "loading" | "ready" | "error";
  userData?: TUserDataResponse;
  setUser: (accessToken?: string) => Promise<TUserDataResponse | undefined>;
  setUserData: (key: keyof TUserData, value: any) => void;
  logout: () => void;
};

export const userStore = create<Store>()((set) => ({
  authStatus: "loading",
  setUser: async (accessToken?: string) => {
    if (!accessToken) {
      set({ userData: undefined, authStatus: "ready" });
      return;
    }
    set({ authStatus: "loading" });
    try {
      const decoded_jwt = jwtDecode<{ user_id: number }>(accessToken);
      const userData = await getUserData(decoded_jwt.user_id);
      set({ userData: userData, authStatus: "ready" });

      if (userData?.data?.is_staff) {
        sessionStorage.setItem("isAdmin", "true");
      }
      return userData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      set({ userData: undefined, authStatus: "error" });
    }
  },
  setUserData: (key: keyof TUserData, value: any) => {
    set((state) => {
      if (!state.userData) return state;
      return {
        userData: {
          ...state.userData,
          data: {
            ...state.userData.data,
            [key]: value,
          },
        },
      };
    });
  },
  logout: () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("isAdmin");
    set({ userData: undefined, authStatus: "ready" });
    window.location.href = "/";
  },
}));
