import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/storage/s3";
import { getAuthUser, unauthorized } from "@/lib/server-auth";

/** 是否配置了对象存储（沙箱自动注入 COZE_BUCKET_*） */
function hasS3Config(): boolean {
  return !!(process.env.COZE_BUCKET_ENDPOINT_URL && process.env.COZE_BUCKET_NAME);
}

// POST /api/diaries/upload - multipart/form-data, field: file
// 两种存储模式：
// 1. 有对象存储配置 → 上传 S3，返回 key + 签名 URL
// 2. 无对象存储（如 Render 部署）→ sharp 压缩后转 base64 data URI 直接作为 key 存入数据库
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "未找到文件" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 15 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "图片不能超过 15MB" }, { status: 400 });
    }

    // ---------- 模式 2：base64 入库（无 S3 配置时） ----------
    if (!hasS3Config()) {
      try {
        const sharp = (await import("sharp")).default;
        // 压缩到最长边 1080px 的 JPEG，控制单张 base64 在 ~200KB 内
        buffer = await sharp(buffer)
          .rotate() // 按 EXIF 方向旋转
          .resize({ width: 1080, height: 1080, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 70, mozjpeg: true })
          .toBuffer();
      } catch (e) {
        console.error("图片压缩失败，按原图存储:", e);
      }
      const dataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      // key 与 url 同为 data URI：保存时存入 image_keys，展示时经 /api/diaries/image 代理输出
      return NextResponse.json({ success: true, data: { key: dataUri, url: dataUri } });
    }

    // ---------- 模式 1：S3 对象存储 ----------
    // 规范文件名（仅允许字母数字点下划线短横），按用户隔离目录
    const rawName = file.name || "image.jpg";
    const safeName = rawName.replace(/[^A-Za-z0-9._-]/g, "_").slice(-60) || "image.jpg";
    const fileName = `diaries/${auth.id}/${Date.now()}_${safeName}`;

    const storage = getStorage();
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type || "image/jpeg",
    });

    const url = await storage.generatePresignedUrl({ key, expireTime: 604800 });

    return NextResponse.json({ success: true, data: { key, url } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
