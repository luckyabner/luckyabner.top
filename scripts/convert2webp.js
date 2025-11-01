import fs from "fs";
import path from "path";
import sharp from "sharp";

// === 配置 ===
const inputDir = "./src/images"; // 要扫描的目录（可改成 . 表示当前目录）
const deleteOriginal = true; // ✅ 转换成功后是否删除原图

async function convertToWebp() {
  const files = fs.readdirSync(inputDir);

  for (const file of files) {
    const lower = file.toLowerCase();
    const ext = path.extname(lower)
    const baseName = path.basename(file, ext);

    // 仅处理 jpg / jpeg / png
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(inputDir, `${baseName}.webp`);

      try {
        await sharp(inputPath)
          .rotate()
          .webp({ quality: 85 })
          .toFile(outputPath);

        console.log(`✅ 已转换: ${file} → ${baseName}.webp`);

        if (deleteOriginal) {
          fs.unlinkSync(inputPath);
          console.log(`🗑️ 已删除原图: ${file}`);
        }
      } catch (err) {
        console.error(`❌ 转换失败: ${file}`, err);
      }
    }
  }

  console.log("🎉 所有图片已转换完成！");
}

// === 执行 ===
convertToWebp();
