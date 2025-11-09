import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 為 @hw5xclone 生成測試資料...');

  // 查找或創建 hw5xclone 用戶
  const email = 'hw5xclone@gmail.com';
  let testUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!testUser) {
    // 如果找不到，嘗試通過 userId 查找
    testUser = await prisma.user.findUnique({
      where: { userId: 'hw5xclone' },
    });
  }

  if (!testUser) {
    console.log('❌ 找不到 @hw5xclone 用戶，請先使用該 Google 帳號登入一次');
    console.log('   登入後，系統會自動創建用戶，然後再運行此腳本');
    return;
  }

  console.log(`✅ 找到用戶: ${testUser.name} (@${testUser.userId || '未設置'})`);

  // 確保用戶有 userId
  if (!testUser.userId) {
    testUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { userId: 'hw5xclone' },
    });
    console.log('✅ 設置 userId: hw5xclone');
  }

  // 確保用戶有 Profile
  let profile = await prisma.profile.findUnique({
    where: { userId: testUser.id },
  });

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: testUser.id,
        displayName: testUser.name || 'HW5 X-Clone Test User',
        bio: '這是用於測試 X-Clone 所有功能的測試帳號。歡迎同學們使用此帳號進行互評測試！',
        avatarUrl: testUser.image || 'https://i.pravatar.cc/150?img=68',
        bannerUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1500&h=500&fit=crop',
      },
    });
    console.log('✅ 創建個人資料');
  } else {
    console.log('ℹ️  個人資料已存在');
  }

  // 獲取其他用戶（用於互動）
  const otherUsers = await prisma.user.findMany({
    where: {
      id: { not: testUser.id },
      userId: { not: null },
    },
    take: 10,
  });

  console.log(`ℹ️  找到 ${otherUsers.length} 個其他用戶用於互動`);

  // 1. 創建貼文
  console.log('\n📝 創建貼文...');
  const posts = [
    {
      authorId: testUser.id,
      content: '歡迎使用 @hw5xclone 測試帳號！這是一個用於測試 X-Clone 所有功能的帳號。 #welcome #test',
    },
    {
      authorId: testUser.id,
      content: '這是一個包含連結的貼文：https://nextjs.org 和 https://vercel.com 都是很棒的工具！ #webdev #nextjs',
    },
    {
      authorId: testUser.id,
      content: '測試 @mention 功能！如果你看到這則貼文，請試試看按讚、轉發或留言！ #testing',
    },
    {
      authorId: testUser.id,
      content: '這是一個包含多個 #hashtag 的貼文，包括 #webdev #programming #javascript #react #nextjs',
    },
    {
      authorId: testUser.id,
      content: '測試貼文功能：\n1. 可以發文\n2. 可以按讚\n3. 可以轉發\n4. 可以留言\n5. 可以書籤\n\n請測試所有功能！',
    },
    {
      authorId: testUser.id,
      content: '這是一個較長的貼文，用來測試貼文顯示功能。貼文可以包含多行文字，也可以包含連結和 hashtag。例如：https://github.com 和 #opensource',
    },
    {
      authorId: testUser.id,
      content: '測試 Explore 頁面：這則貼文包含 #news hashtag，應該會出現在 News 分類中。',
    },
    {
      authorId: testUser.id,
      content: '測試 Explore 頁面：這則貼文包含 #sports hashtag，應該會出現在 Sports 分類中。',
    },
    {
      authorId: testUser.id,
      content: '測試 Explore 頁面：這則貼文包含 #entertainment hashtag，應該會出現在 Entertainment 分類中。',
    },
    {
      authorId: testUser.id,
      content: '最後一則測試貼文！請確保所有功能都正常運作。如果有任何問題，請回報。 #feedback #testing',
    },
  ];

  const createdPosts = [];
  for (const postData of posts) {
    try {
      const post = await prisma.post.create({
        data: postData,
      });
      createdPosts.push(post);
      console.log(`✅ 創建貼文: ${post.content.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ 創建貼文失敗:`, error);
    }
  }

  // 2. 對其他用戶的貼文按讚
  console.log('\n❤️  創建按讚...');
  const otherPosts = await prisma.post.findMany({
    where: {
      authorId: { not: testUser.id },
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  let likeCount = 0;
  for (const post of otherPosts.slice(0, 5)) {
    try {
      await prisma.like.upsert({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: post.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          postId: post.id,
        },
      });
      likeCount++;
    } catch (error: any) {
      if (error.code !== 'P2002') {
        console.error(`❌ 創建按讚失敗:`, error);
      }
    }
  }
  console.log(`✅ 創建 ${likeCount} 個按讚`);

  // 3. 轉發其他用戶的貼文
  console.log('\n🔄 創建轉發...');
  let repostCount = 0;
  for (const post of otherPosts.slice(5, 8)) {
    try {
      await prisma.repost.upsert({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: post.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          postId: post.id,
        },
      });
      repostCount++;
    } catch (error: any) {
      if (error.code !== 'P2002') {
        console.error(`❌ 創建轉發失敗:`, error);
      }
    }
  }
  console.log(`✅ 創建 ${repostCount} 個轉發`);

  // 4. 對其他用戶的貼文留言
  console.log('\n💬 創建留言...');
  let commentCount = 0;
  for (const post of otherPosts.slice(0, 3)) {
    try {
      const comment = await prisma.comment.create({
        data: {
          postId: post.id,
          authorId: testUser.id,
          content: `這是 @hw5xclone 的測試留言！用來測試留言功能。`,
        },
      });
      commentCount++;
      console.log(`✅ 創建留言: ${comment.content.substring(0, 30)}...`);

      // 創建回覆（如果原貼文有留言）
      const postComments = await prisma.comment.findMany({
        where: { postId: post.id },
        take: 1,
      });
      if (postComments.length > 0 && postComments[0].authorId !== testUser.id) {
        await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: testUser.id,
            parentId: postComments[0].id,
            content: `這是回覆留言的測試！`,
          },
        });
        commentCount++;
        console.log(`✅ 創建回覆留言`);
      }
    } catch (error) {
      console.error(`❌ 創建留言失敗:`, error);
    }
  }
  console.log(`✅ 創建 ${commentCount} 個留言`);

  // 5. 對留言按讚
  console.log('\n❤️  對留言按讚...');
  const comments = await prisma.comment.findMany({
    where: {
      authorId: { not: testUser.id },
    },
    take: 5,
  });

  let commentLikeCount = 0;
  for (const comment of comments) {
    try {
      await prisma.commentLike.upsert({
        where: {
          userId_commentId: {
            userId: testUser.id,
            commentId: comment.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          commentId: comment.id,
        },
      });
      commentLikeCount++;
    } catch (error: any) {
      if (error.code !== 'P2002') {
        console.error(`❌ 對留言按讚失敗:`, error);
      }
    }
  }
  console.log(`✅ 對 ${commentLikeCount} 個留言按讚`);

  // 6. 書籤其他用戶的貼文
  console.log('\n🔖 創建書籤...');
  let bookmarkCount = 0;
  for (const post of otherPosts.slice(0, 5)) {
    try {
      await prisma.bookmark.upsert({
        where: {
          userId_postId: {
            userId: testUser.id,
            postId: post.id,
          },
        },
        update: {},
        create: {
          userId: testUser.id,
          postId: post.id,
        },
      });
      bookmarkCount++;
    } catch (error: any) {
      if (error.code !== 'P2002') {
        console.error(`❌ 創建書籤失敗:`, error);
      }
    }
  }
  console.log(`✅ 創建 ${bookmarkCount} 個書籤`);

  // 7. 追蹤其他用戶
  console.log('\n👥 創建追蹤關係...');
  let followCount = 0;
  for (const user of otherUsers.slice(0, 5)) {
    try {
      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: testUser.id,
            followingId: user.id,
          },
        },
        update: {},
        create: {
          followerId: testUser.id,
          followingId: user.id,
        },
      });
      followCount++;
    } catch (error: any) {
      if (error.code !== 'P2002') {
        console.error(`❌ 創建追蹤關係失敗:`, error);
      }
    }
  }
  console.log(`✅ 追蹤 ${followCount} 個用戶`);

  // 8. 創建草稿
  console.log('\n📄 創建草稿...');
  const drafts = [
    {
      authorId: testUser.id,
      content: '這是一個測試草稿，還沒有完成...',
    },
    {
      authorId: testUser.id,
      content: '另一個草稿，包含 #hashtag 和連結：https://example.com',
    },
    {
      authorId: testUser.id,
      content: '第三個草稿，用來測試草稿功能是否正常運作。',
    },
  ];

  let draftCount = 0;
  for (const draftData of drafts) {
    try {
      await prisma.draft.create({
        data: draftData,
      });
      draftCount++;
    } catch (error) {
      console.error(`❌ 創建草稿失敗:`, error);
    }
  }
  console.log(`✅ 創建 ${draftCount} 個草稿`);

  // 9. 創建通知（模擬其他用戶對測試用戶的互動）
  console.log('\n🔔 創建通知...');
  if (otherUsers.length > 0 && createdPosts.length > 0) {
    let notificationCount = 0;
    
    // 創建 POST_LIKE 通知
    try {
      await prisma.notification.create({
        data: {
          userId: testUser.id,
          actorId: otherUsers[0].id,
          type: 'POST_LIKE',
          postId: createdPosts[0].id,
        },
      });
      notificationCount++;
    } catch (error) {
      console.error(`❌ 創建 POST_LIKE 通知失敗:`, error);
    }

    // 創建 POST_REPOST 通知
    try {
      await prisma.notification.create({
        data: {
          userId: testUser.id,
          actorId: otherUsers[1]?.id || otherUsers[0].id,
          type: 'POST_REPOST',
          postId: createdPosts[0].id,
        },
      });
      notificationCount++;
    } catch (error) {
      console.error(`❌ 創建 POST_REPOST 通知失敗:`, error);
    }

    // 創建 POST_COMMENT 通知（需要先找到留言）
    try {
      const comment = await prisma.comment.findFirst({
        where: {
          postId: createdPosts[1].id,
          authorId: { in: otherUsers.map(u => u.id) },
        },
      });

      if (comment) {
        await prisma.notification.create({
          data: {
            userId: testUser.id,
            actorId: comment.authorId,
            type: 'POST_COMMENT',
            postId: createdPosts[1].id,
            commentId: comment.id,
          },
        });
        notificationCount++;
      }
    } catch (error) {
      console.error(`❌ 創建 POST_COMMENT 通知失敗:`, error);
    }

    // 創建另一個 POST_LIKE 通知
    try {
      await prisma.notification.create({
        data: {
          userId: testUser.id,
          actorId: otherUsers[1]?.id || otherUsers[0].id,
          type: 'POST_LIKE',
          postId: createdPosts[2].id,
        },
      });
      notificationCount++;
    } catch (error) {
      console.error(`❌ 創建 POST_LIKE 通知失敗:`, error);
    }

    console.log(`✅ 創建 ${notificationCount} 個通知`);
  }

  // 總結
  console.log('\n✨ 測試資料生成完成！');
  console.log('\n📊 總結：');
  console.log(`   - 貼文: ${createdPosts.length} 則`);
  console.log(`   - 按讚: ${likeCount} 個`);
  console.log(`   - 轉發: ${repostCount} 個`);
  console.log(`   - 留言: ${commentCount} 個`);
  console.log(`   - 留言按讚: ${commentLikeCount} 個`);
  console.log(`   - 書籤: ${bookmarkCount} 個`);
  console.log(`   - 追蹤: ${followCount} 個用戶`);
  console.log(`   - 草稿: ${draftCount} 個`);
  console.log('\n✅ 現在可以使用 @hw5xclone 帳號測試所有功能了！');
}

main()
  .catch((e) => {
    console.error('❌ 生成測試資料失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

