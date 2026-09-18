import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { TAlarmList, TApiResponse } from "../types";
import { userStore } from "../share/store/userStore";
import { getAlarm, patchReadAlarm } from "../api/alarm";
type Page = TApiResponse<TAlarmList[]>;
export function useAlarmPages() {
  const { userData } = userStore();
  return useInfiniteQuery<Page>({
    queryKey: ["alarm", userData?.data.user_id],
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => getAlarm(pageParam as string | undefined),
    getNextPageParam: (last) => last.pagination?.next || undefined,
    enabled: !!userData,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
export const useNotifications = () => {
  const { userData } = userStore();
  const userId = userData?.data.user_id;
  const client = useQueryClient();
  const query = useAlarmPages();
  useEffect(() => {
    const base = import.meta.env.VITE_PROXY_HOST;
    const token = sessionStorage.getItem("accessToken");
    if (!userId || !base || !token) return;
    const url = new URL("ws/notifications/", base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(url, ["access_token", token]);
    socket.onmessage = (event) => {
      try {
        const alarm: TAlarmList = JSON.parse(event.data);
        if (!Number.isInteger(alarm.id)) return;
        client.setQueryData<InfiniteData<Page>>(["alarm", userId], (old) => {
          if (!old?.pages.length || old.pages.some((page) => page.data.some((item) => item.id === alarm.id)))
            return old;
          return {
            ...old,
            pages: old.pages.map((page, index) => (index === 0 ? { ...page, data: [alarm, ...page.data] } : page)),
          };
        });
        for (const key of ["alarm", "gameDetail", "gameLog", "myGameList", "gameList"])
          void client.invalidateQueries({ queryKey: [key] });
      } catch {
        /* Ignore malformed socket events; focus refetch reconciles state. */
      }
    };
    return () => {
      socket.close();
    };
  }, [userId, client]);
  const handleAlarmClick = async (alarmId: number) => {
    await patchReadAlarm(alarmId);
    client.setQueryData<InfiniteData<Page>>(
      ["alarm", userId],
      (old) =>
        old && {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((alarm) => (alarm.id === alarmId ? { ...alarm, is_read: true } : alarm)),
          })),
        },
    );
    for (const key of ["alarm", "gameDetail", "gameLog", "myGameList"])
      void client.invalidateQueries({ queryKey: [key] });
  };
  const hasUnread = query.data?.pages.some((page) => page.data.some((alarm) => !alarm.is_read)) ?? false;
  return { handleAlarmClick, hasUnread };
};
