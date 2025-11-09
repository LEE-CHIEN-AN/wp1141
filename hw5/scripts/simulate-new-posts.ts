import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 模擬 API 請求來發布貼文
async function createPostViaAPI(authorId: string, content: string) {
  // 直接調用數據庫和 Pusher，模擬 API 行為
  const { triggerNewPostForFollowers } = await import('@/lib/pusher-server');
  
  try {
    // 獲取作者信息
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        name: true,
        userId: true,
        image: true,
      },
    });

    if (!author) {
      console.error(`❌ Author not found: ${authorId}`);
      return null;
    }

    // 創建貼文（模擬 API 行為）
    const post = await prisma.post.create({
      data: {
        authorId: author.id,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            userId: true,
            image: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
      },
    });

    console.log(`✅ Created post from @${author.userId}: "${content.substring(0, 50)}..."`);

    // 通知所有關注該用戶的人有新貼文（模擬 API 行為）
    try {
      const followers = await prisma.follow.findMany({
        where: { followingId: author.id },
        select: { followerId: true },
      });

      if (followers.length > 0) {
        // 並發通知所有關注者
        const notificationPromises = followers.map((follower) =>
          triggerNewPostForFollowers(follower.followerId, {
            postId: post.id,
            author: {
              id: post.author.id,
              name: post.author.name,
              userId: post.author.userId,
              image: post.author.image,
            },
          })
        );

        await Promise.all(notificationPromises);
        console.log(`   📢 Notified ${followers.length} follower(s)`);
        
        // 在 Mock 模式下，通過 HTTP 觸發客戶端事件
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          for (const follower of followers) {
            const { getFollowingChannelName } = await import('@/lib/pusher-channels');
            const channelName = getFollowingChannelName(follower.followerId);
            
            await fetch(`${baseUrl}/api/pusher/mock/trigger`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: channelName,
                event: 'new:post',
                payload: {
                  postId: post.id,
                  author: {
                    id: post.author.id,
                    name: post.author.name,
                    userId: post.author.userId,
                    image: post.author.image,
                  },
                },
              }),
            }).catch((error) => {
              console.log(`   ⚠️  Failed to trigger client event for ${follower.followerId}:`, error.message);
            });
          }
        } catch (error) {
          console.log(`   ⚠️  Error triggering client events:`, error);
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Error notifying followers:`, error);
    }

    return post;
  } catch (error) {
    console.error(`❌ Error creating post:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 Simulating new posts via API to trigger Pusher events...\n');

  // 找到目標用戶 @jieeeee（用於確認關注關係）
  const targetUser = await prisma.user.findUnique({
    where: { userId: 'jieeeee' },
  });

  if (!targetUser) {
    console.error('❌ User @jieeeee not found!');
    return;
  }

  console.log(`✅ Found target user: ${targetUser.name} (@${targetUser.userId})\n`);

  // 找到測試用戶
  const testUserIds = ['test_user_1', 'test_user_2', 'test_user_3', 'test_user_4', 'test_user_5'];
  const testUsers = [];

  for (const userId of testUserIds) {
    const user = await prisma.user.findUnique({
      where: { userId },
    });
    if (user) {
      testUsers.push(user);
    }
  }

  if (testUsers.length === 0) {
    console.error('❌ No test users found! Please run db:seed:newpost-notice first.');
    return;
  }

  console.log(`✅ Found ${testUsers.length} test users\n`);

  // 確認關注關係
  const follows = await prisma.follow.findMany({
    where: {
      followerId: targetUser.id,
      followingId: { in: testUsers.map((u) => u.id) },
    },
  });

  console.log(`✅ @jieeeee is following ${follows.length} test users\n`);

  // 模擬發布新貼文（每次運行時都創建新的貼文）
  const timestamp = new Date().toISOString();
  const postContents = [
    `這是一則新貼文！應該會觸發 New Post Notice 🎉 #new #notice [${timestamp}]`,
    `這是另一則新貼文，測試通知功能 📢 #new #notice [${timestamp}]`,
    `第三則新貼文，看看通知是否正常顯示 🔔 #new #notice [${timestamp}]`,
    `第四則新貼文，繼續測試 New Post Notice 功能 ✨ #new #notice [${timestamp}]`,
    `第五則新貼文，最後一則測試貼文 🎊 #new #notice [${timestamp}]`,
  ];

  console.log('📝 Simulating posts...\n');
  console.log(`⏰ Timestamp: ${timestamp}\n`);

  for (let i = 0; i < Math.min(postContents.length, testUsers.length); i++) {
    const user = testUsers[i];
    const content = postContents[i];

    console.log(`[${i + 1}/${Math.min(postContents.length, testUsers.length)}] Publishing post from @${user.userId}...`);
    
    await createPostViaAPI(user.id, content);

    // 等待一段時間再發布下一則（模擬真實場景）
    if (i < Math.min(postContents.length, testUsers.length) - 1) {
      console.log('   ⏳ Waiting 2 seconds before next post...\n');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log('\n🎉 Successfully simulated new posts!');
  console.log('\n💡 Testing Instructions:');
  console.log('   1. Log in as @jieeeee');
  console.log('   2. Go to Home page');
  console.log('   3. Scroll down past the first few posts (more than 200px)');
  console.log('   4. The New Post Notice should appear showing the test users');
  console.log('   5. Click the notice to scroll to top and refresh');
  console.log('\n⚠️  Note: Make sure the app is running and Pusher is configured!');
}

main()
  .catch((e) => {
    console.error('❌ Error simulating new posts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

