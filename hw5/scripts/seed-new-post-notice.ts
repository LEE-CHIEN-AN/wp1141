import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔔 Seeding New Post Notice test data...');

  // 找到目標用戶 @jieeeee
  const targetUser = await prisma.user.findUnique({
    where: { userId: 'jieeeee' },
  });

  if (!targetUser) {
    console.error('❌ User @jieeeee not found!');
    return;
  }

  console.log(`✅ Found user: ${targetUser.name} (@${targetUser.userId})`);

  // 創建或獲取一些測試用戶（這些用戶將被關注）
  const testUsers = [
    {
      name: 'Test User 1',
      email: 'test1@newpost-notice.com',
      userId: 'test_user_1',
      image: 'https://i.pravatar.cc/150?img=1',
    },
    {
      name: 'Test User 2',
      email: 'test2@newpost-notice.com',
      userId: 'test_user_2',
      image: 'https://i.pravatar.cc/150?img=2',
    },
    {
      name: 'Test User 3',
      email: 'test3@newpost-notice.com',
      userId: 'test_user_3',
      image: 'https://i.pravatar.cc/150?img=3',
    },
    {
      name: 'Test User 4',
      email: 'test4@newpost-notice.com',
      userId: 'test_user_4',
      image: 'https://i.pravatar.cc/150?img=4',
    },
    {
      name: 'Test User 5',
      email: 'test5@newpost-notice.com',
      userId: 'test_user_5',
      image: 'https://i.pravatar.cc/150?img=5',
    },
  ];

  const createdUsers = [];
  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { userId: userData.userId },
      update: {},
      create: userData,
    });
    createdUsers.push(user);
    console.log(`✅ Created/Found user: ${user.name} (@${user.userId})`);
  }

  // 讓目標用戶關注這些測試用戶
  console.log('\n📌 Setting up follows...');
  for (const testUser of createdUsers) {
    try {
      const follow = await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: targetUser.id,
            followingId: testUser.id,
          },
        },
        update: {},
        create: {
          followerId: targetUser.id,
          followingId: testUser.id,
        },
      });
      console.log(`✅ @jieeeee is now following @${testUser.userId}`);
    } catch (error) {
      console.log(`⚠️  @jieeeee is already following @${testUser.userId}`);
    }
  }

  // 為這些測試用戶創建一些舊貼文（用於測試滾動）
  console.log('\n📝 Creating old posts for scrolling test...');
  const oldPostContents = [
    '這是第一則舊貼文，用於測試滾動功能 #test #scroll',
    '這是第二則舊貼文，當你滾動到這裡時，新貼文通知應該會出現 #test #scroll',
    '這是第三則舊貼文，繼續往下滾動 #test #scroll',
    '這是第四則舊貼文，滾動到這裡應該能看到新貼文通知了 #test #scroll',
    '這是第五則舊貼文，測試 New Post Notice 功能 #test #scroll',
  ];

  const oldPosts = [];
  for (let i = 0; i < Math.min(oldPostContents.length, createdUsers.length); i++) {
    const post = await prisma.post.create({
      data: {
        authorId: createdUsers[i].id,
        content: oldPostContents[i],
        createdAt: new Date(Date.now() - (i + 1) * 60000), // 1-5 分鐘前
      },
    });
    oldPosts.push(post);
    console.log(`✅ Created old post from @${createdUsers[i].userId}`);
  }

  // 為這些測試用戶創建一些新貼文（這些會觸發 New Post Notice）
  console.log('\n🆕 Creating new posts that will trigger New Post Notice...');
  const newPostContents = [
    '這是一則新貼文！應該會觸發 New Post Notice #new #notice',
    '這是另一則新貼文，測試通知功能 #new #notice',
    '第三則新貼文，看看通知是否正常顯示 #new #notice',
  ];

  const newPosts = [];
  for (let i = 0; i < Math.min(newPostContents.length, createdUsers.length); i++) {
    const post = await prisma.post.create({
      data: {
        authorId: createdUsers[i].id,
        content: newPostContents[i],
        createdAt: new Date(), // 剛剛創建
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
      },
    });
    newPosts.push(post);
    console.log(`✅ Created new post from @${createdUsers[i].userId}`);
  }

  // 為目標用戶創建一些自己的貼文（用於填充 feed）
  console.log('\n📝 Creating posts for @jieeeee...');
  const userPostContents = [
    '這是我的第一則貼文 #myPost #test',
    '這是我的第二則貼文，用於測試 New Post Notice #myPost #test',
    '這是我的第三則貼文，繼續往下滾動 #myPost #test',
  ];

  for (const content of userPostContents) {
    await prisma.post.create({
      data: {
        authorId: targetUser.id,
        content,
        createdAt: new Date(Date.now() - 10 * 60000), // 10 分鐘前
      },
    });
    console.log(`✅ Created post for @jieeeee`);
  }

  console.log('\n🎉 Successfully created test data for New Post Notice!');
  console.log('\n📊 Summary:');
  console.log(`   - Created ${createdUsers.length} test users`);
  console.log(`   - @jieeeee is following ${createdUsers.length} users`);
  console.log(`   - Created ${oldPosts.length} old posts (for scrolling test)`);
  console.log(`   - Created ${newPosts.length} new posts (will trigger notice)`);
  console.log(`   - Created ${userPostContents.length} posts for @jieeeee`);
  console.log('\n💡 Testing Instructions:');
  console.log('   1. Log in as @jieeeee');
  console.log('   2. Go to Home page');
  console.log('   3. Scroll down past the first few posts');
  console.log('   4. The New Post Notice should appear at the top showing the test users');
  console.log('   5. Click the notice to scroll to top and refresh');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding New Post Notice test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




