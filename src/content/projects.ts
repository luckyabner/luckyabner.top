interface Project {
  title: string;
  description: string;
  url: string;
  icon?: string;
}

export const projects: Project[] = [
  {
    title: "Hexagram",
    description:
      "AI Divination PWA app",
    url: "https://yao.luckyabner.top/",
  },
  {
    title: "MusicRoast",
    description:
      "An AI-powered application that provides different reviews of users' playlists.",
    url: "https://music.luckyabner.top/",
    icon: "/icons/musicroast.ico",
  },
  {
    title: "HexVerse",
    description: "An AI-powered fortune-telling application.",
    url: "https://hexverse.luckyabner.top/",
    icon: "/icons/hexverse.ico",
  },
  {
    title: "EchoMemo",
    description:
      "An AI-enhanced thought capturing platform that provides intelligent feedback on your ideas.",
    url: "https://echo.luckyabner.top/",
    icon: "/icons/echomemo.ico",
  },
];
