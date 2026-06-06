import fs from "fs";
import path from "path";

const docsDir = path.join(process.cwd(), "docs");

/**
 * 从 markdown 文件提取 frontmatter 中的 title
 */
function getTitleFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const titleMatch = frontmatter.match(/title:\s*["']?(.+?)["']?\n/);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
  }

  // 如果没有 frontmatter，尝试从第一个 # 标题提取
  const headingMatch = content.match(/^#\s+(.+)\n/);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // 最后用文件名作为标题
  return path.basename(filePath, ".md");
}

/**
 * 从 frontmatter 提取 date 用于排序
 */
function getDateFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const dateMatch = frontmatter.match(/date:\s*["']?(.+?)["']?\n/);
    if (dateMatch) {
      return new Date(dateMatch[1].trim());
    }
  }

  return null;
}

/**
 * 获取目录下的所有 markdown 文件并生成 sidebar items
 * @param {string} dirPath - 相对于 docs 的路径，如 "/tutorials"
 * @param {object} options - 配置选项
 * @param {string[]} options.exclude - 要排除的文件名
 * @param {object} options.order - 手动排序映射 { filename: position }
 * @param {string} options.sortBy - 排序方式 'date' | 'order' | 'alpha'
 */
function getSidebarItems(dirPath, options = {}) {
  const { exclude = [], order = {}, sortBy = "date" } = options;
  const fullDir = path.join(docsDir, dirPath);

  if (!fs.existsSync(fullDir)) {
    return [];
  }

  const files = fs
    .readdirSync(fullDir)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => !exclude.includes(f))
    .filter((f) => f !== "README.md") // README 通常作为 index
    .map((f) => {
      const filePath = path.join(fullDir, f);
      const name = f.replace(".md", "");
      return {
        text: getTitleFromFile(filePath),
        link: `${dirPath}/${name}`,
        date: getDateFromFile(filePath),
        order: order[name] ?? 999,
      };
    });

  // 排序
  files.sort((a, b) => {
    if (sortBy === "order" && (order[a.link.split("/").pop()] || order[b.link.split("/").pop()])) {
      return a.order - b.order;
    }
    if (sortBy === "date" && a.date && b.date) {
      return b.date - a.date; // 按日期倒序，最新的在前
    }
    // 默认按标题字母排序
    return a.text.localeCompare(b.text, "zh-CN");
  });

  return files.map(({ text, link }) => ({ text, link }));
}

/**
 * 生成完整 sidebar 配置
 */
function generateSidebar() {
  return {
    "/stock/": [
      {
        text: "股票投资",
        collapsed: false,
        items: getSidebarItems("/stock"),
      },
    ],

    "/posts/": [
      {
        text: "博客文章",
        items: getSidebarItems("/posts", { sortBy: "date" }),
      },
    ],

    "/tutorials/": [
      {
        text: "技术教程",
        items: getSidebarItems("/tutorials", {
          sortBy: "date",
          // 如果需要手动排序，可以用这个：
          // order: {
          //   "linux": 1,
          //   "build-vpn": 2,
          //   "jenkins-cicd": 3,
          // },
        }),
      },
    ],

    "/aiops/": [
      {
        text: "AIOps",
        items: getSidebarItems("/aiops", { sortBy: "date" }),
      },
    ],

    "/data-structures/": [
      {
        text: "数据结构",
        items: getSidebarItems("/data-structures", { sortBy: "alpha" }),
      },
    ],

    "/go/": [
      {
        text: "Go 语言",
        items: getSidebarItems("/go", {
          sortBy: "order",
          order: {
            "pointer": 1,
            "func": 2,
            "struct": 3,
            "interface": 4,
            "error": 5,
            "goroutine": 6,
            "channel": 7,
            "data-structure": 8,
          },
        }),
      },
    ],

    "/openclaw/": [
      {
        text: "OpenClaw",
        items: getSidebarItems("/openclaw", {
          sortBy: "order",
          order: {
            "browser-relay-docker": 1,
            "boss-recruiting-practice": 2,
            "progress": 3,
          },
        }),
      },
    ],

    "/mcp/": [
      {
        text: "MCP 协议",
        items: getSidebarItems("/mcp", {
          sortBy: "order",
          order: {
            "claude-config": 1,
            "inspector": 2,
            "local-stdio": 3,
          },
        }),
      },
    ],

    "/cli/": [
      {
        text: "CLI 开发",
        items: getSidebarItems("/cli"),
      },
    ],

    "/linux/": [
      {
        text: "Linux 实用指南",
        items: getSidebarItems("/linux", { sortBy: "date" }),
      },
    ],

    "/agent/": [
      {
        text: "Agent 开发",
        items: getSidebarItems("/agent"),
      },
    ],

    "/dns-proxy/": [
      {
        text: "DNS 与代理",
        items: getSidebarItems("/dns-proxy", {
          sortBy: "order",
          order: {
            "nginx-reverse-proxy": 1,
            "ssl-certificate": 2,
            "deploy-dns-nginx": 3,
          },
        }),
      },
    ],

    "/pipeline/": [
      {
        text: "流水线与 CI/CD",
        items: getSidebarItems("/pipeline", { sortBy: "date" }),
      },
    ],

    "/skill/": [
      {
        text: "Skill",
        items: getSidebarItems("/skill"),
      },
    ],

    "/open-taurus/": [
      {
        text: "Open Taurus — HWRDS CLI",
        items: getSidebarItems("/open-taurus", {
          sortBy: "order",
          order: {
            "m01-configure": 1,
            "m02-config-store": 2,
            "m03-sdk-client": 3,
            "m04-ak-sk-signer": 4,
            "m05-flavor-list": 5,
            "m06-formatter": 6,
            "m07-color": 7,
            "m08-instance-create": 8,
            "m09-waiter": 9,
            "m10-instance-list": 10,
            "m11-instance-show": 11,
            "m12-instance-delete": 12,
            "m13-instance-restart": 13,
            "m14-error-polish-test": 14,
          },
        }),
      },
    ],
  };
}

export { generateSidebar, getSidebarItems };