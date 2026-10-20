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
      "An AI-assisted I Ching reading, packaged as a PWA.",
    url: "https://yao.luckyabner.top/",
  },
  {
    title: "MusicRoast",
    description:
      "An AI playlist reviewer that gives your music taste a second opinion.",
    url: "https://music.luckyabner.top/",
    icon: "/icons/musicroast.ico",
  },
  {
    title: "HexVerse",
    description: "A playful AI fortune-telling app.",
    url: "https://hexverse.luckyabner.top/",
    icon: "/icons/hexverse.ico",
  },
  {
    title: "EchoMemo",
    description:
      "An AI thought-capture app that gives feedback on your ideas.",
    url: "https://echo.luckyabner.top/",
    icon: "/icons/echomemo.ico",
  },
];
