import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔔 Seeding notification data for @jieeeee...');

  // 找到目標用戶 @jieeeee
  const targetUser = await prisma.user.findUnique({
    where: { userId: 'jieeeee' },
  });

  if (!targetUser) {
    console.error('❌ User @jieeeee not found!');
    return;
  }

  console.log(`✅ Found user: ${targetUser.name} (@${targetUser.userId})`);

  // 獲取或創建一些其他用戶作為 actor（執行操作的人）
  const actorUsers = [
    {
      name: 'Alice',
      email: 'alice@notification-test.com',
      userId: 'alice_notif',
      image: 'https://i.pravatar.cc/150?img=1',
      verified: false, // 普通用戶
    },
    {
      name: 'Bob',
      email: 'bob@notification-test.com',
      userId: 'bob_notif',
      image: 'https://i.pravatar.cc/150?img=2',
      verified: true, // 已驗證用戶
    },
    {
      name: 'Charlie',
      email: 'charlie@notification-test.com',
      userId: 'charlie_notif',
      image: 'https://i.pravatar.cc/150?img=3',
      verified: true, // 已驗證用戶
    },
    {
      name: 'Diana',
      email: 'diana@notification-test.com',
      userId: 'diana_notif',
      image: 'https://i.pravatar.cc/150?img=4',
      verified: false, // 普通用戶
    },
    {
      name: 'Eve',
      email: 'eve@notification-test.com',
      userId: 'eve_notif',
      image: 'https://i.pravatar.cc/150?img=5',
      verified: true, // 已驗證用戶
    },
  ];

  const createdActors = [];
  for (const userData of actorUsers) {
    const actor = await prisma.user.upsert({
      where: { userId: userData.userId },
      update: {
        verified: userData.verified, // 更新 verified 狀態
      },
      create: userData,
    });
    createdActors.push(actor);
    console.log(`✅ Created/Found actor: ${actor.name} (@${actor.userId}) ${actor.verified ? '✓ Verified' : ''}`);
  }

  // 獲取目標用戶的貼文，如果沒有則創建一些
  let targetPosts = await prisma.post.findMany({
    where: { authorId: targetUser.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (targetPosts.length === 0) {
    console.log('📝 Creating sample posts for @jieeeee...');
    const postContents = [
      '這是我的第一篇貼文！歡迎大家來互動 #hello #welcome',
      '今天天氣真好，適合出去走走 #weather #life',
      '分享一個有趣的技術文章 #tech #programming',
      '剛剛完成了一個新專案，很有成就感！ #project #coding',
      '大家週末都在做什麼呢？ #weekend #chat',
    ];

    for (const content of postContents) {
      const post = await prisma.post.create({
        data: {
          authorId: targetUser.id,
          content,
        },
      });
      targetPosts.push(post);
    }
    console.log(`✅ Created ${targetPosts.length} posts`);
  } else {
    console.log(`✅ Found ${targetPosts.length} existing posts`);
  }

  // 獲取目標用戶的留言，如果沒有則創建一些
  let targetComments = await prisma.comment.findMany({
    where: { authorId: targetUser.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  if (targetComments.length === 0 && targetPosts.length > 0) {
    console.log('💬 Creating sample comments for @jieeeee...');
    const commentContents = [
      '這是一個很好的觀點！',
      '我同意你的看法',
      '謝謝分享！',
    ];

    for (let i = 0; i < Math.min(commentContents.length, targetPosts.length); i++) {
      const comment = await prisma.comment.create({
        data: {
          authorId: targetUser.id,
          postId: targetPosts[i].id,
          content: commentContents[i],
        },
      });
      targetComments.push(comment);
    }
    console.log(`✅ Created ${targetComments.length} comments`);
  } else {
    console.log(`✅ Found ${targetComments.length} existing comments`);
  }

  // 清理舊的通知（可選，避免重複）
  const existingNotifications = await prisma.notification.count({
    where: { userId: targetUser.id },
  });

  if (existingNotifications > 0) {
    console.log(`⚠️  Found ${existingNotifications} existing notifications. They will be kept.`);
  }

  // 創建不同類型的通知
  const notifications = [];

  // 1. POST_LIKE - 有人按讚貼文
  if (targetPosts.length > 0) {
    for (let i = 0; i < Math.min(3, targetPosts.length, createdActors.length); i++) {
      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.POST_LIKE,
          actorId: createdActors[i].id,
          postId: targetPosts[i].id,
          read: i === 0, // 第一個標記為已讀，其他未讀
          createdAt: new Date(Date.now() - i * 60000), // 不同的時間
        },
      });
      notifications.push(notification);
      console.log(`✅ Created POST_LIKE notification from ${createdActors[i].name}`);
    }
  }

  // 2. POST_REPOST - 有人轉發貼文
  if (targetPosts.length > 0) {
    for (let i = 0; i < Math.min(2, targetPosts.length, createdActors.length); i++) {
      const actorIndex = (i + 1) % createdActors.length;
      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.POST_REPOST,
          actorId: createdActors[actorIndex].id,
          postId: targetPosts[i].id,
          read: false,
          createdAt: new Date(Date.now() - (i + 3) * 60000),
        },
      });
      notifications.push(notification);
      console.log(`✅ Created POST_REPOST notification from ${createdActors[actorIndex].name}`);
    }
  }

  // 3. POST_COMMENT - 有人在貼文下留言（包含一些 @ 提及）
  if (targetPosts.length > 0 && createdActors.length > 0) {
    for (let i = 0; i < Math.min(2, targetPosts.length, createdActors.length); i++) {
      // 創建一個留言，其中一個包含 @jieeeee
      const commentContent = i === 0 
        ? `這是一個測試留言 @jieeeee 你覺得怎麼樣？ #${i + 1}`
        : `這是一個測試留言 #${i + 1}`;
      
      const comment = await prisma.comment.create({
        data: {
          authorId: createdActors[i].id,
          postId: targetPosts[i].id,
          content: commentContent,
        },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.POST_COMMENT,
          actorId: createdActors[i].id,
          postId: targetPosts[i].id,
          commentId: comment.id,
          read: false,
          createdAt: new Date(Date.now() - (i + 5) * 60000),
        },
      });
      notifications.push(notification);
      console.log(`✅ Created POST_COMMENT notification from ${createdActors[i].name}${i === 0 ? ' (with @mention)' : ''}`);
    }
  }

  // 3.5. 創建一些包含 @jieeeee 的貼文和留言（用於測試 Mentions）
  if (createdActors.length > 0) {
    console.log('📝 Creating posts and comments with @mentions for @jieeeee...');
    
    // 創建包含 @jieeeee 的貼文
    const mentionPost = await prisma.post.create({
      data: {
        authorId: createdActors[0].id, // Alice 創建
        content: `嘿 @jieeeee 你覺得這個怎麼樣？ #test #mention`,
      },
    });

    // 為這個貼文創建通知（因為提到了 @jieeeee）
    const mentionPostNotification = await prisma.notification.create({
      data: {
        userId: targetUser.id,
        type: NotificationType.POST_COMMENT, // 使用 POST_COMMENT 類型，因為這是提到用戶的貼文
        actorId: createdActors[0].id,
        postId: mentionPost.id,
        read: false,
        createdAt: new Date(Date.now() - 2 * 60000),
      },
    });
    notifications.push(mentionPostNotification);
    console.log(`✅ Created mention post notification from ${createdActors[0].name}`);

    // 創建包含 @jieeeee 的留言
    if (targetPosts.length > 0) {
      const mentionComment = await prisma.comment.create({
        data: {
          authorId: createdActors[1].id, // Bob 創建
          postId: targetPosts[0].id,
          content: `@jieeeee 我同意你的觀點！這很棒！`,
        },
      });

      const mentionCommentNotification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.POST_COMMENT,
          actorId: createdActors[1].id,
          postId: targetPosts[0].id,
          commentId: mentionComment.id,
          read: false,
          createdAt: new Date(Date.now() - 1 * 60000),
        },
      });
      notifications.push(mentionCommentNotification);
      console.log(`✅ Created mention comment notification from ${createdActors[1].name}`);
    }
  }

  // 4. COMMENT_LIKE - 有人按讚留言
  if (targetComments.length > 0) {
    for (let i = 0; i < Math.min(2, targetComments.length, createdActors.length); i++) {
      const actorIndex = (i + 2) % createdActors.length;
      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.COMMENT_LIKE,
          actorId: createdActors[actorIndex].id,
          postId: targetComments[i].postId,
          commentId: targetComments[i].id,
          read: false,
          createdAt: new Date(Date.now() - (i + 7) * 60000),
        },
      });
      notifications.push(notification);
      console.log(`✅ Created COMMENT_LIKE notification from ${createdActors[actorIndex].name}`);
    }
  }

  // 5. COMMENT_REPOST - 有人轉發留言
  if (targetComments.length > 0) {
    for (let i = 0; i < Math.min(1, targetComments.length, createdActors.length); i++) {
      const actorIndex = (i + 3) % createdActors.length;
      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.COMMENT_REPOST,
          actorId: createdActors[actorIndex].id,
          postId: targetComments[i].postId,
          commentId: targetComments[i].id,
          read: false,
          createdAt: new Date(Date.now() - (i + 9) * 60000),
        },
      });
      notifications.push(notification);
      console.log(`✅ Created COMMENT_REPOST notification from ${createdActors[actorIndex].name}`);
    }
  }

  // 6. COMMENT_REPLY - 有人回覆留言
  if (targetComments.length > 0 && createdActors.length > 0) {
    for (let i = 0; i < Math.min(1, targetComments.length, createdActors.length); i++) {
      // 先創建一個回覆
      const reply = await prisma.comment.create({
        data: {
          authorId: createdActors[i].id,
          postId: targetComments[i].postId,
          parentId: targetComments[i].id,
          content: '這是一個回覆！',
        },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: NotificationType.COMMENT_REPLY,
          actorId: createdActors[i].id,
          postId: targetComments[i].postId,
          commentId: reply.id,
          read: false,
          createdAt: new Date(Date.now() - (i + 11) * 60000),
        },
      });
      notifications.push(notification);
      console.log(`✅ Created COMMENT_REPLY notification from ${createdActors[i].name}`);
    }
  }

  console.log(`\n🎉 Successfully created ${notifications.length} notifications for @jieeeee!`);
  console.log(`📊 Summary:`);
  console.log(`   - POST_LIKE: ${notifications.filter(n => n.type === 'POST_LIKE').length}`);
  console.log(`   - POST_REPOST: ${notifications.filter(n => n.type === 'POST_REPOST').length}`);
  console.log(`   - POST_COMMENT: ${notifications.filter(n => n.type === 'POST_COMMENT').length}`);
  console.log(`   - COMMENT_LIKE: ${notifications.filter(n => n.type === 'COMMENT_LIKE').length}`);
  console.log(`   - COMMENT_REPOST: ${notifications.filter(n => n.type === 'COMMENT_REPOST').length}`);
  console.log(`   - COMMENT_REPLY: ${notifications.filter(n => n.type === 'COMMENT_REPLY').length}`);
  console.log(`   - Read: ${notifications.filter(n => n.read).length}`);
  console.log(`   - Unread: ${notifications.filter(n => !n.read).length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding notifications:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

