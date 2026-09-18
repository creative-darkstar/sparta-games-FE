import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlarmPages } from "../../hook/useNotifications";
import { getTimeAgoInHours } from "../../util/getTimeAgoInHours";
type Props = { modalClose: () => void; handleAlarmClick: (id: number) => Promise<void> };
export default function AlarmModal({ modalClose, handleAlarmClick }: Props) {
  const query = useAlarmPages();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      previous?.focus();
    };
  }, []);
  const navigate = useNavigate();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const alarms = [
    ...new Map(query.data?.pages.flatMap((page) => page.data).map((alarm) => [alarm.id, alarm])).values(),
  ];
  return (
    <section
      ref={panel}
      aria-label="알림"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          modalClose();
        }
      }}
      className="absolute top-10 right-0 p-5 w-[360px] max-h-[630px] overflow-y-auto bg-gray-800 text-white border border-primary-500 rounded-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <h2>알림</h2>
      <button onClick={modalClose}>닫기</button>
      {query.isPending && <p role="status">알림을 불러오는 중입니다.</p>}
      {query.isError && (
        <p role="alert">
          알림을 불러오지 못했습니다.{" "}
          <button onClick={() => (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())}>
            다시 시도
          </button>
        </p>
      )}
      {!query.isPending && !query.isError && !alarms.length && <p>아직 받은 알림이 없습니다.</p>}
      {error && <p role="alert">{error}</p>}
      {alarms.map((alarm) => (
        <button
          key={alarm.id}
          disabled={reading}
          className={`text-left w-full py-3 border-b border-gray-600 ${alarm.is_read ? "text-gray-400" : "text-primary-500"}`}
          onClick={async () => {
            setReading(true);
            setError("");
            try {
              await handleAlarmClick(alarm.id);
              modalClose();
              navigate(`/game-detail?id=${alarm.content_id}`);
            } catch {
              setError("알림을 읽음 처리하지 못했습니다. 다시 선택해주세요.");
            } finally {
              setReading(false);
            }
          }}
        >
          <span>
            {alarm.is_read ? "읽음" : "읽지 않음"} · {getTimeAgoInHours(alarm.create_dt)}
          </span>
          <p>{alarm.message}</p>
        </button>
      ))}
      {query.hasNextPage && (
        <button disabled={query.isFetching} onClick={() => query.fetchNextPage()}>
          알림 더보기
        </button>
      )}
    </section>
  );
}
