// Development-only visual fixture. Every service request is intercepted here.
// This file is not an entry point of the production build.
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider, Outlet, useNavigate } from "react-router-dom";
import { sparta_games, sparta_games_auth } from "../src/api/axios";
import { userStore } from "../src/share/store/userStore";
import GameUpload from "../src/page/GameUpload";
import MyPage from "../src/page/MyPage";
import { TUserDataResponse } from "../src/types";
import "../src/App.css";
const image = "/src/assets/gameDetail/Priview.jpg";
const user = {
  user_id: 1,
  nickname: "테스트메이커",
  email: "fixture@example.test",
  is_maker: true,
  is_staff: false,
  game_category: [],
  profile_image: image,
  introduce: "",
  login_type: "email",
  password: "",
  password_check: "",
};
userStore.setState({
  userData: {
    status: "success",
    data: user,
    message: null,
    pagination: null,
    error_code: null,
  } as unknown as TUserDataResponse,
});
const game = {
  id: 42,
  title: "별빛 탐험대",
  thumbnail: image,
  content: "<p>별을 찾아 떠나는 WebGL 게임입니다.</p>",
  category: [{ id: 1, name: "Action" }],
  category_data: [{ id: 1, name: "Action" }],
  screenshot: [{ id: 1, src: image }],
  youtube_url: "",
  gamefile: "existing.zip",
  register_state: 1,
  maker_data: { id: 1, nickname: user.nickname },
  star: 0,
  chips: [],
};
const adapter: NonNullable<typeof sparta_games.defaults.adapter> = async (config) => {
  let data: unknown = null;
  if (config.url?.includes("denylog"))
    data = { content: "Build 폴더의 필수 파일을 확인해주세요. <script>문자 그대로 표시</script>" };
  else if (config.url?.includes("/games/api/list/"))
    data = config.method === "get" ? { ...game, register_state: config.url.includes("43") ? 2 : 1 } : null;
  else if (config.url?.includes("/users/api/1/games")) data = [game];
  else if (config.url?.includes("/users/api/1/")) data = user;
  return {
    config,
    status: 200,
    statusText: "OK",
    headers: {},
    data: {
      status: "success",
      data,
      pagination: { count: Array.isArray(data) ? data.length : 0, next: null, previous: null },
      message: null,
      error_code: null,
    },
  };
};
sparta_games.defaults.adapter = adapter;
sparta_games_auth.defaults.adapter = adapter;
export default function Layout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-700 text-white">
      <nav className="p-4 flex gap-6 bg-gray-800">
        <strong>로컬 모킹 검증</strong>
        <button onClick={() => navigate("/game-upload")}>신규 등록</button>
        <button onClick={() => navigate("/game-edit/42")}>일반 수정</button>
        <button onClick={() => navigate("/game-edit/43")}>반려 수정</button>
      </nav>
      <div className="w-[1180px] mx-auto">
        <Outlet />
      </div>
    </div>
  );
}
const router = createMemoryRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: "/game-upload", element: <GameUpload /> },
        { path: "/game-edit/:gameId", element: <GameUpload /> },
        { path: "/my-page/:id", element: <MyPage /> },
      ],
    },
  ],
  { initialEntries: ["/game-edit/42"] },
);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
);
