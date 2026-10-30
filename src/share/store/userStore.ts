import { create } from "zustand";
import { jwtDecode } from "jwt-decode";
import { getUserData } from "../../api/user";
import { TUserData, TUserDataResponse } from "../../types";

// F04: 새로고침 직후 로그인 복원 중(loading)과 비로그인(anonymous)을 구분한다.
export type AuthStatus = "loading" | "authenticated" | "anonymous";

type Store = {
  userData?: TUserDataResponse;
  authStatus: AuthStatus;
  initAuth: () => void;
  setUser: (accessToken?: string) => Promise<TUserDataResponse | undefined>;
  setUserData: (key: keyof TUserData, value: any) => void;
  logout: () => void;
};

const hasStoredToken = () => typeof sessionStorage !== "undefined" && !!sessionStorage.getItem("accessToken");

export const userStore = create<Store>()((set, get) => ({
  authStatus: hasStoredToken() ? "loading" : "anonymous",
  initAuth: () => {
    const accessToken = sessionStorage.getItem("accessToken");
    if (!accessToken) {
      set({ authStatus: "anonymous" });
      return;
    }
    void get().setUser(accessToken);
  },
  setUser: async (accessToken?: string) => {
    if (!accessToken) {
      set({ userData: undefined, authStatus: "anonymous" });
      return;
    }
    // 이미 로그인된 상태의 갱신(프로필 수정 등)은 loading으로 바꾸지 않는다.
    if (!get().userData) set({ authStatus: "loading" });
    try {
      const decoded_jwt = jwtDecode<{ user_id: number }>(accessToken);
      const userData = await getUserData(decoded_jwt.user_id);
      set({ userData: userData, authStatus: "authenticated" });

      if (userData?.data?.is_staff) {
        sessionStorage.setItem("isAdmin", "true");
      }
      return userData;
    } catch (error) {
      console.error("Error fetching user data:", error);
      set({ userData: undefined, authStatus: "anonymous" });
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
    set({ userData: undefined, authStatus: "anonymous" });
    window.location.href = "/";
  },
}));
