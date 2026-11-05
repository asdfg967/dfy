import { S3Storage } from "coze-coding-dev-sdk";

let storageInstance: S3Storage | null = null;

export function getStorage(): S3Storage {
  if (!storageInstance) {
    storageInstance = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    });
  }
  return storageInstance;
}

// 为一组对象 key 批量生成签名 URL（30 天有效，保证日记历史图片可访问）
export async function signImageUrls(keys: string[]): Promise<Record<string, string>> {
  if (!keys || keys.length === 0) return {};
  const storage = getStorage();
  const map: Record<string, string> = {};
  await Promise.all(
    keys.map(async (key) => {
      try {
        map[key] = await storage.generatePresignedUrl({ key, expireTime: 2592000 });
      } catch {
        map[key] = "";
      }
    })
  );
  return map;
}
