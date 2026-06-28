import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { generateSidebar } from "./sidebar.js";

export default withMermaid(
  defineConfig({
    appearance: false,
    mermaid: {
      securityLevel: "loose",
    },
    lang: "zh-CN",
    title: "我的博客",
    description: "记录后端架构、AI开发与日常思考",
    base: "/",

    head: [
      ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
      [
        "link",
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
      ],
      [
        "link",
        {
          href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@500;700&display=swap",
          rel: "stylesheet",
        },
      ],
    ],

    markdown: {
      theme: {
        light: "one-dark-pro",
        dark: "one-dark-pro",
      },
      lineNumbers: true,
    },

    themeConfig: {
      nav: [
        { text: "首页", link: "/" },
        { text: "博客", link: "/posts/" },
        { text: "股票", link: "/stock/" },
        { text: "Go", link: "/go/" },
        { text: "数据结构", link: "/data-structures/" },
        { text: "OpenClaw", link: "/openclaw/" },
        { text: "Linux", link: "/linux/" },
        {
          text: "AI 开发",
          items: [
            { text: "MCP 协议", link: "/mcp/" },
            { text: "CLI 开发", link: "/cli/" },
            { text: "AIOps", link: "/aiops/" },
            { text: "Agent", link: "/agent/" },
            { text: "Skill", link: "/skill/" },
            { text: "DNS 与代理", link: "/dns-proxy/" },
          ],
        },
        { text: "教程", link: "/tutorials/" },
        { text: "GitHub", link: "https://github.com" },
      ],

      sidebar: generateSidebar(),

      socialLinks: [{ icon: "github", link: "https://github.com" }],
      outline: { level: [2, 3] },
      outlineTitle: "ON THIS PAGE",
    },
  }),
);
