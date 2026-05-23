import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const aiDevSidebar = [
  {
    text: "MCP 协议",
    items: [
      { text: "概述", link: "/mcp/" },
      { text: "Claude 配置", link: "/mcp/claude-config" },
      { text: "Inspector 调试", link: "/mcp/inspector" },
      { text: "本地 stdio 实战", link: "/mcp/local-stdio" },
    ],
  },
  {
    text: "CLI 开发",
    items: [{ text: "概述", link: "/cli/" }],
  },
  {
    text: "Agent 开发",
    items: [{ text: "概述", link: "/agent/" }],
  },
  {
    text: "Skill",
    items: [{ text: "概述", link: "/skill/" }],
  },
];

export default withMermaid(
  defineConfig({
    appearance: false,
    lang: "zh-CN",
    title: "我的博客",
    description: "记录后端架构、AI开发与日常思考",
    base: "/blog/",

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
        {
          text: "AI 开发",
          items: [
            { text: "MCP 协议", link: "/mcp/" },
            { text: "CLI 开发", link: "/cli/" },
            { text: "AIOps", link: "/aiops/" },
            { text: "Agent", link: "/agent/" },
            { text: "Skill", link: "/skill/" },
          ],
        },
        { text: "教程", link: "/tutorials/" },
        { text: "GitHub", link: "https://github.com" },
      ],

      sidebar: {
        "/stock/": [
          {
            text: "股票投资",
            collapsed: false,
            items: [{ text: "股票投资入门教程", link: "/stock/" }],
          },
        ],
        "/posts/": [
          {
            text: "博客文章",
            items: [{ text: "Hello World", link: "/posts/hello-world" }],
          },
        ],
        "/tutorials/": [
          {
            text: "技术教程",
            items: [
              { text: "VPN 搭建", link: "/tutorials/build-vpn" },
              { text: "Jenkins CI/CD", link: "/tutorials/jenkins-cicd" },
              { text: "Linux 命令", link: "/tutorials/linux" },
              { text: "Obsidian GitHub 同步", link: "/tutorials/obsidian-github-sync" },
            ],
          },
        ],
        "/aiops/": [
          {
            text: "AIOps",
            items: [
              { text: "概述", link: "/aiops/" },
              { text: "智能体 Coze", link: "/aiops/coze" },
              { text: "RAG 实战", link: "/aiops/rag" },
              { text: "Prometheus + Grafana", link: "/aiops/prometheus" },
            ],
          },
        ],
        "/data-structures/": [
          {
            text: "数据结构",
            items: [
              { text: "概述", link: "/data-structures/" },
              { text: "递归详解", link: "/data-structures/recursion" },
              { text: "链表", link: "/data-structures/linked-list" },
            ],
          },
        ],
        "/go/": [
          {
            text: "Go 语言",
            items: [
              { text: "简介", link: "/go/" },
              { text: "指针", link: "/go/pointer" },
              { text: "函数", link: "/go/func" },
              { text: "结构体", link: "/go/struct" },
              { text: "接口", link: "/go/interface" },
              { text: "错误处理", link: "/go/error" },
              { text: "Goroutine", link: "/go/goroutine" },
              { text: "Channel", link: "/go/channel" },
            ],
          },
        ],
        "/mcp/": aiDevSidebar,
        "/cli/": aiDevSidebar,
        "/agent/": aiDevSidebar,
        "/skill/": aiDevSidebar,
        "/openclaw/": [
          {
            text: "OpenClaw",
            items: [
              { text: "部署与实战", link: "/openclaw/" },
              { text: "Browser Relay", link: "/openclaw/browser-relay-docker" },
              { text: "BOSS 实战", link: "/openclaw/boss-recruiting-practice" },
              { text: "实践进度", link: "/openclaw/progress" },
            ],
          },
        ],
        "/open-taurus/": [
          {
            text: "Open Taurus — HWRDS CLI",
            items: [
              { text: "专栏概述", link: "/open-taurus/" },
              { text: "M01 · configure 配置命令", link: "/open-taurus/m01-configure" },
              { text: "M02 · config-store 配置存储", link: "/open-taurus/m02-config-store" },
              { text: "M03 · sdk-client HTTP 客户端", link: "/open-taurus/m03-sdk-client" },
              { text: "M04 · ak-sk-signer 签名模块", link: "/open-taurus/m04-ak-sk-signer" },
              { text: "M05 · flavor-list 规格查询", link: "/open-taurus/m05-flavor-list" },
              { text: "M06 · formatter 格式化输出", link: "/open-taurus/m06-formatter" },
              { text: "M07 · color 彩色输出", link: "/open-taurus/m07-color" },
              { text: "M08 · instance-create 创建实例", link: "/open-taurus/m08-instance-create" },
              { text: "M09 · waiter 等待机制", link: "/open-taurus/m09-waiter" },
              { text: "M10 · instance-list 列出实例", link: "/open-taurus/m10-instance-list" },
              { text: "M11 · instance-show 查看详情", link: "/open-taurus/m11-instance-show" },
              { text: "M12 · instance-delete 删除实例", link: "/open-taurus/m12-instance-delete" },
              { text: "M13 · instance-restart 重启实例", link: "/open-taurus/m13-instance-restart" },
              { text: "M14 · error-polish-test 收尾", link: "/open-taurus/m14-error-polish-test" },
            ],
          },
        ],
      },

      socialLinks: [{ icon: "github", link: "https://github.com" }],
      outline: { level: [2, 3] },
      outlineTitle: "ON THIS PAGE",
    },
  }),
);
