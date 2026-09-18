import { useEffect, useRef } from "react";

import GamePlay from "./GamePlay";
import GameMedia from "./GameMedia";
import GameDescription from "./GameDescription";

import { TGamePlayData } from "../../../types";

import { getPlayLog, postPlayLog } from "../../../api/game";

import usePlayTimeStore from "../../../share/store/playTimeStore";
import { userStore } from "../../../share/store/userStore";

type Props = {
  gamePlayData?: TGamePlayData;
};

const GamePlaySection = ({ gamePlayData }: Props) => {
  const { id, title, gamepath, youtube_url, screenshot, content, maker_data } = gamePlayData || {};

  const { userData } = userStore();
  const { playTimePk, setPlayTimePk } = usePlayTimeStore();

  const playTimePkRef = useRef(playTimePk);

  useEffect(() => {
    playTimePkRef.current = playTimePk;
  }, [playTimePk]);

  useEffect(() => {
    const fetchPlayLog = async () => {
      if (userData && id && gamePlayData?.register_state === 1) {
        const res = await getPlayLog(id);
        setPlayTimePk(res?.playtime_pk || null);
      }
    };
    fetchPlayLog();

    return () => {
      if (playTimePkRef.current && userData) {
        const sendPlayLog = async () => {
          await postPlayLog(id, playTimePkRef.current);
        };
        sendPlayLog();
      }
    };
  }, [id, gamePlayData?.register_state, setPlayTimePk, userData]);

  return (
    <section className="mt-6">
      <div className="flex gap-5">
        {gamePlayData?.register_state === 1 ? (
          <GamePlay
            gameId={id}
            title={title}
            makerName={maker_data?.nickname}
            gamePath={gamepath}
            makerId={maker_data?.id}
          />
        ) : (
          <div className="p-8 text-white w-2/3">
            <h2>{title}</h2>
            <p>
              {gamePlayData?.register_state === 0
                ? "검수중 · 검수 완료 시 알림으로 안내합니다."
                : gamePlayData?.register_state === 2
                  ? "반려 · 사유를 확인하고 파일을 수정해주세요."
                  : "상태 확인 필요"}
            </p>
          </div>
        )}
        <GameMedia youtubeUrl={youtube_url} screenShot={screenshot} />
      </div>
      <GameDescription title={title} content={content} screenshot={screenshot} />
    </section>
  );
};

export default GamePlaySection;
