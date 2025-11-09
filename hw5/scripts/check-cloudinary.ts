/**
 * Cloudinary 驗證腳本
 * 
 * 這個腳本用於：
 * 1. 驗證 Cloudinary 環境變數是否正確設定
 * 2. 列出 Cloudinary 中已上傳的媒體檔案
 * 3. 檢查資料庫中的媒體記錄
 * 
 * 使用方法：
 * npx tsx scripts/check-cloudinary.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../lib/db';

// 配置 Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkCloudinaryConfig() {
  console.log('🔍 檢查 Cloudinary 環境變數...\n');

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ 錯誤：Cloudinary 環境變數未設定！');
    console.log('請確保 .env 檔案包含以下變數：');
    console.log('  - CLOUDINARY_CLOUD_NAME');
    console.log('  - CLOUDINARY_API_KEY');
    console.log('  - CLOUDINARY_API_SECRET');
    return false;
  }

  console.log('✅ Cloudinary 環境變數已設定');
  console.log(`   Cloud Name: ${cloudName}`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`   API Secret: ${apiSecret ? '已設定' : '未設定'}\n`);

  return true;
}

async function listCloudinaryMedia() {
  console.log('📁 列出 Cloudinary 中的媒體檔案...\n');

  try {
    // 測試 Cloudinary 連接
    try {
      await cloudinary.api.ping();
      console.log('✅ Cloudinary 連接成功\n');
    } catch (pingError: any) {
      console.error('❌ Cloudinary 連接失敗');
      console.error(`   錯誤訊息: ${pingError.message || JSON.stringify(pingError)}\n`);
      return;
    }

    // 使用 resources API 列出所有資源
    try {
      console.log('📋 列出 Cloudinary 中的所有資源...\n');
      const allResources = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'x-clone',
        max_results: 100,
      });

      if (allResources.resources && allResources.resources.length > 0) {
        // 分類資源
        const postsResources = allResources.resources.filter(
          (resource: any) => resource.public_id.startsWith('x-clone/posts/')
        );
        const profileResources = allResources.resources.filter(
          (resource: any) => !resource.public_id.startsWith('x-clone/posts/')
        );

        // 按建立時間排序
        const sortByCreatedAt = (a: any, b: any) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeB - timeA; // 降序
        };

        console.log(`📸 貼文媒體 (x-clone/posts): ${postsResources.length} 個檔案\n`);
        if (postsResources.length > 0) {
          postsResources.sort(sortByCreatedAt).forEach((resource: any, index: number) => {
            console.log(`${index + 1}. ${resource.public_id}`);
            console.log(`   類型: ${resource.resource_type}`);
            console.log(`   大小: ${resource.bytes ? (resource.bytes / 1024).toFixed(2) + ' KB' : 'N/A'}`);
            console.log(`   上傳時間: ${resource.created_at ? new Date(resource.created_at).toLocaleString('zh-TW') : 'N/A'}`);
            console.log(`   URL: ${resource.secure_url || resource.url || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log('   目前沒有檔案\n');
        }

        console.log(`👤 用戶媒體 (x-clone): ${profileResources.length} 個檔案\n`);
        if (profileResources.length > 0) {
          profileResources.sort(sortByCreatedAt).forEach((resource: any, index: number) => {
            console.log(`${index + 1}. ${resource.public_id}`);
            console.log(`   類型: ${resource.resource_type}`);
            console.log(`   大小: ${resource.bytes ? (resource.bytes / 1024).toFixed(2) + ' KB' : 'N/A'}`);
            console.log(`   上傳時間: ${resource.created_at ? new Date(resource.created_at).toLocaleString('zh-TW') : 'N/A'}`);
            console.log(`   URL: ${resource.secure_url || resource.url || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log('   目前沒有檔案\n');
        }

        console.log(`📦 總計: ${allResources.resources.length} 個資源\n`);
      } else {
        console.log('   目前沒有資源\n');
      }
    } catch (resourcesError: any) {
      console.error('❌ 錯誤：無法使用 resources API 列出資源');
      console.error(`   錯誤訊息: ${resourcesError.message || JSON.stringify(resourcesError)}`);
      console.error(`   錯誤詳情: ${JSON.stringify(resourcesError, null, 2)}\n`);
    }
  } catch (error: any) {
    console.error('❌ 錯誤：無法列出 Cloudinary 媒體檔案');
    console.error(`   錯誤訊息: ${error.message || 'Unknown error'}`);
    console.error(`   錯誤詳情: ${JSON.stringify(error, null, 2)}`);
    console.error(`   錯誤堆疊: ${error.stack || 'N/A'}\n`);
  }
}

async function checkDatabaseMedia() {
  console.log('💾 檢查資料庫中的媒體記錄...\n');

  try {
    const mediaCount = await prisma.postMedia.count();
    console.log(`📊 資料庫中的媒體記錄總數: ${mediaCount}\n`);

    if (mediaCount > 0) {
      const recentMedia = await prisma.postMedia.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  userId: true,
                },
              },
            },
          },
        },
      });

      console.log('最近 10 筆媒體記錄：\n');
      recentMedia.forEach((media, index) => {
        console.log(`${index + 1}. ${media.publicId}`);
        console.log(`   類型: ${media.type}`);
        console.log(`   URL: ${media.url}`);
        console.log(`   貼文作者: ${media.post.author.name || media.post.author.userId || 'Unknown'}`);
        console.log(`   建立時間: ${media.createdAt.toLocaleString('zh-TW')}`);
        console.log('');
      });

      // 檢查 URL 是否指向 Cloudinary
      const cloudinaryUrls = recentMedia.filter((media) =>
        media.url.includes('res.cloudinary.com')
      );
      console.log(`✅ ${cloudinaryUrls.length}/${recentMedia.length} 筆記錄使用 Cloudinary URL\n`);
    }
  } catch (error: any) {
    console.error('❌ 錯誤：無法查詢資料庫');
    console.error(`   錯誤訊息: ${error.message}\n`);
  }
}

async function main() {
  console.log('🚀 Cloudinary 驗證腳本\n');
  console.log('='.repeat(50));
  console.log('');

  // 檢查環境變數
  const configValid = await checkCloudinaryConfig();
  if (!configValid) {
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('');

  // 列出 Cloudinary 媒體
  await listCloudinaryMedia();

  console.log('='.repeat(50));
  console.log('');

  // 檢查資料庫
  await checkDatabaseMedia();

  console.log('='.repeat(50));
  console.log('');
  console.log('✅ 驗證完成！');
  console.log('');
  console.log('💡 提示：');
  console.log('   - 在 Cloudinary 控制台查看所有媒體：https://console.cloudinary.com/');
  console.log('   - 在 Media Library 中搜尋特定檔案');
  console.log('   - 檢查 Settings > Usage 查看使用量統計');
  console.log('');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ 發生錯誤：', error);
  process.exit(1);
});

