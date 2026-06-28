#!/usr/bin/env node

/**
 * 图片整理脚本
 *
 * 功能：
 * 1. 扫描 docs 目录下散落在各处的图片（不在 public/images 目录内的）
 * 2. 扫描 inbox 目录中的临时图片
 * 3. 移动到 docs/.vitepress/public/images/posts/YYYY/MM/ 目录
 * 4. 重命名为 YYYY-MM-DD-主题描述.png
 * 5. 更新所有 markdown 文件中的图片链接
 *
 * 使用：
 * node scripts/organize-images.js
 * node scripts/organize-images.js --dry-run  # 只预览，不执行
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

const docsDir = path.join(process.cwd(), "docs");
// 真实归档目录：docs/images/posts/（git 实际跟踪图片的位置）。
// docs/.vitepress/public/images 是指向这里的相对符号链接，仅供 Obsidian 粘贴图片用，
// markdown 链接一律用真实路径 images/posts/...，不依赖符号链接，CI 也能解析。
const publicImagesDir = path.join(docsDir, "images/posts");
const inboxDir = path.join(publicImagesDir, "inbox");

const DRY_RUN = process.argv.includes("--dry-run");

// 图片扩展名
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

// 获取当前日期
function getCurrentDate() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return { year, month, day, full: `${year}-${month}-${day}` };
}

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] 会创建目录: ${dir}`);
    } else {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * 计算从 md 文件到图片的相对路径
 * VitePress 需要相对路径，不能用绝对路径 /images/posts/...
 * @param {string} mdPath - markdown 文件路径（如 docs/tutorials/linux.md）
 * @param {string} year - 年份
 * @param {string} month - 月份
 * @param {string} filename - 图片文件名
 */
function getRelativeImagePath(mdPath, year, month, filename) {
  // 从 md 文件所在目录回到 docs 再到图片
  const mdDir = path.dirname(mdPath);
  const depth = mdDir.replace(/^docs\/?/, "").split("/").filter(Boolean).length;
  const prefix = Array(depth).fill("..").join("/");
  // 用真实路径 images/posts/...，不依赖 .vitepress/public/images 符号链接
  const imagePath = `images/posts/${year}/${month}/${filename}`;
  return prefix ? `${prefix}/${imagePath}` : imagePath;
}

// 从文件名提取可能的描述
function extractDescription(filename) {
  // 去除扩展名
  const name = filename.replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, "");

  // 如果已经有日期格式，提取描述部分
  const dateMatch = name.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  if (dateMatch) {
    return dateMatch[1];
  }

  // 处理常见的临时文件名
  if (name === "image" || name === "Pasted image" || name.startsWith("Pasted image ")) {
    return "screenshot";
  }

  // 处理带数字的临时名
  const pastedMatch = name.match(/^Pasted image (\d+)$/);
  if (pastedMatch) {
    return `screenshot-${pastedMatch[1]}`;
  }

  // 其他情况，转换为小写并用 - 连接
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-|-$/g, "");
}

// 生成新的文件名
function generateNewFilename(originalFilename, date) {
  const description = extractDescription(originalFilename);
  const ext = path.extname(originalFilename).toLowerCase();
  return `${date.full}-${description}${ext}`;
}

// 扫描需要整理的图片
async function findImagesToOrganize() {
  const images = [];

  // 1. 扫描 inbox 目录
  if (fs.existsSync(inboxDir)) {
    const inboxFiles = fs.readdirSync(inboxDir);
    for (const file of inboxFiles) {
      if (IMAGE_EXTENSIONS.some((ext) => file.endsWith(ext))) {
        images.push({
          path: path.join(inboxDir, file),
          source: "inbox",
          filename: file,
        });
      }
    }
  }

  // 2. 扫描 docs 目录下不在归档目录内的图片（真正散落的）
  const allImages = await glob(`docs/**/*.{${IMAGE_EXTENSIONS.join(",")}}`, {
    ignore: [
      "docs/images/**", // 已归档图片（含 inbox，inbox 由上面单独扫描）
      "docs/.vitepress/**",
    ],
  });

  for (const imgPath of allImages) {
    images.push({
      path: imgPath,
      source: "scattered",
      filename: path.basename(imgPath),
    });
  }

  return images;
}

// 扫描所有 markdown 文件
async function findMarkdownFiles() {
  return await glob("docs/**/*.md", {
    ignore: ["docs/.vitepress/dist/**", "docs/.vitepress/cache/**"],
  });
}

// 更新 markdown 文件中的图片链接
function updateMarkdownLinks(mdPath, oldLinkPatterns, year, month, newFilename) {
  let content = fs.readFileSync(mdPath, "utf-8");
  let modified = false;

  // 计算当前 md 文件需要的相对路径
  const relativeLink = getRelativeImagePath(mdPath, year, month, newFilename);

  for (const oldLink of oldLinkPatterns) {
    // 匹配各种可能的图片链接格式
    // ![alt](path)
    // ![](path)
    // ![[wiki-link]]
    const patterns = [
      // Markdown 标准格式
      new RegExp(`!\\[[^\\]]*\\]\\([^)]*${oldLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^)]*\\)`, "g"),
      // Wiki 链接格式
      new RegExp(`!\\[\\[${oldLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`, "g"),
    ];

    for (const pattern of patterns) {
      if (content.match(pattern)) {
        content = content.replace(pattern, (match) => {
          modified = true;
          // 保持原有的 alt text
          if (match.startsWith("![")) {
            const altMatch = match.match(/!\[([^\]]*)\]/);
            const alt = altMatch ? altMatch[1] : "";
            return `![${alt}](${relativeLink})`;
          }
          // Wiki 链接转换为 Markdown 链接
          return `![](${relativeLink})`;
        });
      }
    }
  }

  if (modified) {
    if (DRY_RUN) {
      console.log(`[DRY RUN] 会更新文件: ${mdPath}`);
    } else {
      fs.writeFileSync(mdPath, content);
    }
  }

  return modified;
}

// 主函数
async function main() {
  console.log("=== 图片整理脚本 ===");
  console.log(`模式: ${DRY_RUN ? "预览 (dry-run)" : "执行"}`);
  console.log("");

  const { year, month, day, full } = getCurrentDate();
  const targetDir = path.join(publicImagesDir, year, month);
  ensureDir(targetDir);

  // 扫描图片
  const images = await findImagesToOrganize();

  if (images.length === 0) {
    console.log("没有找到需要整理的图片。");
    return;
  }

  console.log(`找到 ${images.length} 个需要整理的图片：`);
  images.forEach((img) => {
    console.log(`  - ${img.path} (来源: ${img.source})`);
  });
  console.log("");

  // 准备移动和链接更新
  const imageUpdates = []; // 存储每个图片的信息

  for (const img of images) {
    const newFilename = generateNewFilename(img.filename, { full });
    const newPath = path.join(targetDir, newFilename);

    // 计算旧的链接路径（相对于 docs 目录）
    const relativePath = img.path.replace(/^docs\//, "");
    const oldLinkPatterns = [
      relativePath,
      // 相对路径的各种变体
      `../${relativePath}`,
      `./${relativePath}`,
      // 仅文件名
      img.filename,
    ];

    console.log(`处理: ${img.filename}`);
    console.log(`  新名称: ${newFilename}`);
    console.log(`  新路径: ${newPath}`);

    if (!DRY_RUN) {
      // 移动文件
      if (fs.existsSync(img.path)) {
        fs.renameSync(img.path, newPath);
        console.log(`  ✓ 已移动`);
      }
    }

    // 记录图片更新信息
    imageUpdates.push({
      oldLinkPatterns,
      year,
      month,
      newFilename,
    });
  }

  console.log("");
  console.log("更新 markdown 文件中的链接...");

  // 扫描并更新 markdown 文件
  const mdFiles = await findMarkdownFiles();
  let updatedCount = 0;

  for (const mdFile of mdFiles) {
    let fileModified = false;
    for (const update of imageUpdates) {
      if (updateMarkdownLinks(mdFile, update.oldLinkPatterns, update.year, update.month, update.newFilename)) {
        fileModified = true;
      }
    }
    if (fileModified) {
      updatedCount++;
    }
  }

  console.log(`已更新 ${updatedCount} 个 markdown 文件。`);

  if (DRY_RUN) {
    console.log("");
    console.log("=== 这是预览模式，没有实际执行 ===");
    console.log("要执行实际操作，运行: node scripts/organize-images.js");
  } else {
    console.log("");
    console.log("=== 整理完成 ===");
    console.log(`图片已移动到: docs/images/posts/${year}/${month}/`);
    console.log("请运行 npm run docs:build 检查构建是否正常。");
  }
}

main().catch((err) => {
  console.error("错误:", err);
  process.exit(1);
});