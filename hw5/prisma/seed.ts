import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 創建測試用戶（使用 userId 作為唯一標識，避免與真實用戶衝突）
  const users = [
    {
      name: 'Alice Chen',
      email: 'alice_test@example.com',
      userId: 'alice_chen',
      image: 'https://i.pravatar.cc/150?img=1',
    },
    {
      name: 'Bob Wang',
      email: 'bob_test@example.com',
      userId: 'bob_wang',
      image: 'https://i.pravatar.cc/150?img=2',
    },
    {
      name: 'Charlie Lin',
      email: 'charlie_test@example.com',
      userId: 'charlie_lin',
      image: 'https://i.pravatar.cc/150?img=3',
    },
    {
      name: 'Diana Zhang',
      email: 'diana_test@example.com',
      userId: 'diana_zhang',
      image: 'https://i.pravatar.cc/150?img=4',
    },
    {
      name: 'Eve Liu',
      email: 'eve_test@example.com',
      userId: 'eve_liu',
      image: 'https://i.pravatar.cc/150?img=5',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    try {
      // 先檢查 userId 是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { userId: userData.userId },
      });

      if (existingUser) {
        createdUsers.push(existingUser);
        console.log(`ℹ️  User already exists: ${userData.userId}`);
        continue;
      }

      // 如果不存在，創建新用戶
      const user = await prisma.user.create({
        data: {
          ...userData,
          profile: {
            create: {
              displayName: userData.name,
              bio: `Hello! I'm ${userData.name}. Welcome to my profile!`,
            },
          },
        },
        include: {
          profile: true,
        },
      });
      createdUsers.push(user);
      console.log(`✅ Created user: ${userData.userId}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        // 如果 email 衝突，嘗試使用 userId 查找
        const user = await prisma.user.findUnique({
          where: { userId: userData.userId },
        });
        if (user) {
          createdUsers.push(user);
          console.log(`ℹ️  User already exists: ${userData.userId}`);
        }
      } else {
        console.error(`❌ Error creating user ${userData.userId}:`, error);
      }
    }
  }

  // 創建測試文章
  const posts = [
    {
      authorId: createdUsers[0]?.id,
      content: 'This is a post with a #hashtag and a link: https://example.com',
    },
    {
      authorId: createdUsers[0]?.id,
      content: 'Hello world! This is my first post. @bob_wang check this out!',
    },
    {
      authorId: createdUsers[1]?.id,
      content: 'Just discovered an amazing website: https://nextjs.org - you should check it out! #webdev #nextjs',
    },
    {
      authorId: createdUsers[1]?.id,
      content: 'Working on a new project. Excited to share it with everyone! @alice_chen @charlie_lin',
    },
    {
      authorId: createdUsers[2]?.id,
      content: 'Beautiful day today! #nature #photography',
    },
    {
      authorId: createdUsers[2]?.id,
      content: 'Check out this article: https://react.dev - great resource for learning React!',
    },
    {
      authorId: createdUsers[3]?.id,
      content: 'Just finished reading an amazing book. Highly recommend! #reading #books',
    },
    {
      authorId: createdUsers[3]?.id,
      content: 'New blog post is up! Read it here: https://example.com/blog/post-1',
    },
    {
      authorId: createdUsers[4]?.id,
      content: 'Working on some cool features. Stay tuned! #coding #webdev',
    },
    {
      authorId: createdUsers[4]?.id,
      content: 'Thanks @alice_chen for the great suggestion! #collaboration',
    },
  ];

  let postCount = 0;
  for (const postData of posts) {
    if (!postData.authorId) continue;
    try {
      await prisma.post.create({
        data: postData,
      });
      postCount++;
      console.log(`✅ Created post ${postCount}`);
    } catch (error) {
      console.error(`❌ Error creating post:`, error);
    }
  }

  // 創建關注關係
  if (createdUsers.length >= 3) {
    const follows = [
      { followerId: createdUsers[0].id, followingId: createdUsers[1].id },
      { followerId: createdUsers[0].id, followingId: createdUsers[2].id },
      { followerId: createdUsers[1].id, followingId: createdUsers[0].id },
      { followerId: createdUsers[1].id, followingId: createdUsers[2].id },
      { followerId: createdUsers[2].id, followingId: createdUsers[0].id },
      { followerId: createdUsers[2].id, followingId: createdUsers[3].id },
      { followerId: createdUsers[3].id, followingId: createdUsers[0].id },
      { followerId: createdUsers[3].id, followingId: createdUsers[1].id },
      { followerId: createdUsers[4].id, followingId: createdUsers[0].id },
      { followerId: createdUsers[4].id, followingId: createdUsers[1].id },
    ];

    let followCount = 0;
    for (const followData of follows) {
      try {
        await prisma.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: followData.followerId,
              followingId: followData.followingId,
            },
          },
          update: {},
          create: followData,
        });
        followCount++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`❌ Error creating follow:`, error);
        }
      }
    }
    console.log(`✅ Created ${followCount} follow relationships`);
  }

  // 創建一些 Like
  const allPosts = await prisma.post.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });

  if (allPosts.length > 0 && createdUsers.length >= 2) {
    const likes = [
      { userId: createdUsers[0].id, postId: allPosts[0]?.id },
      { userId: createdUsers[1].id, postId: allPosts[0]?.id },
      { userId: createdUsers[2].id, postId: allPosts[0]?.id },
      { userId: createdUsers[0].id, postId: allPosts[1]?.id },
      { userId: createdUsers[1].id, postId: allPosts[1]?.id },
    ];

    let likeCount = 0;
    for (const likeData of likes) {
      if (!likeData.postId) continue;
      try {
        await prisma.like.upsert({
          where: {
            userId_postId: {
              userId: likeData.userId,
              postId: likeData.postId,
            },
          },
          update: {},
          create: likeData,
        });
        likeCount++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`❌ Error creating like:`, error);
        }
      }
    }
    console.log(`✅ Created ${likeCount} likes`);
  }

  // 創建一些 Repost
  if (allPosts.length > 0 && createdUsers.length >= 2) {
    const reposts = [
      { userId: createdUsers[0].id, postId: allPosts[1]?.id },
      { userId: createdUsers[1].id, postId: allPosts[0]?.id },
    ];

    let repostCount = 0;
    for (const repostData of reposts) {
      if (!repostData.postId) continue;
      try {
        await prisma.repost.upsert({
          where: {
            userId_postId: {
              userId: repostData.userId,
              postId: repostData.postId,
            },
          },
          update: {},
          create: repostData,
        });
        repostCount++;
      } catch (error: any) {
        if (error.code !== 'P2002') {
          console.error(`❌ Error creating repost:`, error);
        }
      }
    }
    console.log(`✅ Created ${repostCount} reposts`);
  }

  // 創建一些草稿
  if (createdUsers.length > 0) {
    const drafts = [
      {
        authorId: createdUsers[0].id,
        content: 'This is a draft post that I haven\'t finished yet...',
      },
      {
        authorId: createdUsers[0].id,
        content: 'Another draft with some #hashtags and a link: https://example.com',
      },
      {
        authorId: createdUsers[1].id,
        content: 'Working on a new idea. Need to refine this...',
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
        console.error(`❌ Error creating draft:`, error);
      }
    }
    console.log(`✅ Created ${draftCount} drafts`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

