import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Explore page data...');

  // 創建或獲取測試用戶
  const users = [
    {
      name: 'News Reporter',
      email: 'news_reporter@explore.com',
      userId: 'news_reporter',
      image: 'https://i.pravatar.cc/150?img=11',
    },
    {
      name: 'Sports Fan',
      email: 'sports_fan@explore.com',
      userId: 'sports_fan',
      image: 'https://i.pravatar.cc/150?img=12',
    },
    {
      name: 'Entertainment Star',
      email: 'entertainment_star@explore.com',
      userId: 'entertainment_star',
      image: 'https://i.pravatar.cc/150?img=13',
    },
    {
      name: 'Tech Blogger',
      email: 'tech_blogger@explore.com',
      userId: 'tech_blogger',
      image: 'https://i.pravatar.cc/150?img=14',
    },
    {
      name: 'Trending User',
      email: 'trending_user@explore.com',
      userId: 'trending_user',
      image: 'https://i.pravatar.cc/150?img=15',
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    try {
      const user = await prisma.user.upsert({
        where: { userId: userData.userId },
        update: {},
        create: userData,
      });
      createdUsers.push(user);
      console.log(`✅ User: ${user.userId}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.userId}:`, error);
    }
  }

  if (createdUsers.length === 0) {
    console.log('⚠️  No users created, skipping posts...');
    return;
  }

  // 創建新聞類貼文
  const newsPosts = [
    {
      authorId: createdUsers[0].id,
      content: `Zohran Kwame Mamdani Wins Narrow 2025 NYC Mayoral Race as Youngest Mayor and First Muslim Leader

In a historic election, Zohran Kwame Mamdani has been elected as the youngest mayor of New York City and the first Muslim leader in the city's history. The race was incredibly close, with Mamdani winning by just a few thousand votes.

This marks a significant moment in NYC politics, representing a shift towards more diverse and progressive leadership. #news #politics #nyc`,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      authorId: createdUsers[0].id,
      content: `Breaking: Major Tech Company Announces Revolutionary AI Breakthrough

A leading technology company has just announced a major breakthrough in artificial intelligence that could change the way we interact with technology forever. The new system demonstrates unprecedented capabilities in natural language understanding and generation.

Experts are calling this a game-changer for the industry. #news #technology #ai`,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      authorId: createdUsers[3].id,
      content: `Global Climate Summit Reaches Historic Agreement

World leaders have reached a historic agreement at the latest climate summit, committing to ambitious new targets for reducing carbon emissions. This represents the most significant climate action in decades.

The agreement includes commitments from over 150 countries. #news #climate #environment`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      authorId: createdUsers[0].id,
      content: `New Study Reveals Surprising Health Benefits of Daily Exercise

A comprehensive new study has revealed that just 30 minutes of daily exercise can significantly improve both physical and mental health. The research followed thousands of participants over several years.

The findings could revolutionize how we approach public health. #news #health #science`,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
    {
      authorId: createdUsers[3].id,
      content: `Revolutionary Medical Treatment Shows Promise in Clinical Trials

A new medical treatment has shown remarkable results in early clinical trials, offering hope for patients with previously untreatable conditions. The breakthrough could save thousands of lives.

Doctors are cautiously optimistic about the treatment's potential. #news #medicine #healthcare`,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  ];

  // 創建運動類貼文
  const sportsPosts = [
    {
      authorId: createdUsers[1].id,
      content: `Incredible Comeback Victory in Championship Game!

What a game! The underdogs pulled off an incredible comeback in the final minutes, scoring three goals in the last 10 minutes to win the championship. This will go down as one of the greatest games in history.

The crowd went absolutely wild! #sports #championship #football`,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      authorId: createdUsers[1].id,
      content: `New World Record Set in Track and Field

An athlete has just broken a world record that stood for over 20 years! The performance was absolutely stunning, and the entire stadium erupted in celebration.

This is a moment that will be remembered for generations. #sports #trackandfield #worldrecord`,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      authorId: createdUsers[1].id,
      content: `Olympic Games Announce New Sports for 2028

The Olympic Committee has announced that several new sports will be added to the 2028 games, including some exciting new disciplines that will attract younger audiences.

This is great news for the future of the Olympics! #sports #olympics #2028`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      authorId: createdUsers[4].id,
      content: `Rising Star Signs Record-Breaking Contract

A young athlete has just signed the largest contract in the sport's history, marking a new era for player compensation. The deal is worth millions and includes various performance bonuses.

This sets a new standard for the industry. #sports #contract #breakingnews`,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
  ];

  // 創建娛樂類貼文
  const entertainmentPosts = [
    {
      authorId: createdUsers[2].id,
      content: `X's "Cozy Sapphic" Trend Celebrates Lesbian Romance with 1.4 Million Engagements

The "Cozy Sapphic" trend on X has gained massive popularity, celebrating lesbian romance and representation with over 1.4 million engagements. The trend features heartwarming stories and beautiful artwork.

This is a beautiful celebration of love and representation! #entertainment #sapphic #trending`,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      authorId: createdUsers[2].id,
      content: `Thai Actresses Lingling Kwong and Orm Kornnaphat Dazzle at Chiang Mai Lanna Festival

Thai actresses Lingling Kwong and Orm Kornnaphat made stunning appearances at the Chiang Mai Lanna Festival, showcasing traditional Thai culture and fashion. Their performances were absolutely mesmerizing.

The festival was a huge success! #entertainment #thailand #festival`,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      authorId: createdUsers[2].id,
      content: `New Movie Breaks Box Office Records on Opening Weekend

A highly anticipated movie has shattered box office records on its opening weekend, becoming the highest-grossing film of the year. Critics and audiences alike are raving about it.

This is a must-see film! #entertainment #movies #boxoffice`,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      authorId: createdUsers[4].id,
      content: `Award Show Announces Surprising Winners

The annual awards show had some surprising winners this year, with several underdogs taking home major awards. The ceremony was filled with emotional moments and standing ovations.

What a night! #entertainment #awards #celebration`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      authorId: createdUsers[2].id,
      content: `Music Festival Announces Incredible Lineup for Next Year

The biggest music festival has just announced its lineup for next year, and it's absolutely incredible! Some of the world's biggest artists will be performing.

Tickets are going to sell out fast! #entertainment #music #festival`,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
  ];

  // 創建熱門貼文（高互動數）
  const trendingPosts = [
    {
      authorId: createdUsers[4].id,
      content: `This is going to be HUGE! 🚀

Just announced something that will change everything. Stay tuned for more updates!

#trending #breaking #exciting`,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      authorId: createdUsers[4].id,
      content: `You won't believe what just happened! 😱

This is absolutely incredible. The response has been overwhelming!

#trending #viral #amazing`,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
    {
      authorId: createdUsers[0].id,
      content: `Breaking: This just changed everything we thought we knew!

The implications are massive. This will be discussed for years to come.

#trending #breaking #news`,
      createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
    },
  ];

  // 合併所有貼文
  const allPosts = [...newsPosts, ...sportsPosts, ...entertainmentPosts, ...trendingPosts];

  // 創建貼文
  const createdPosts = [];
  for (const postData of allPosts) {
    try {
      const post = await prisma.post.create({
        data: postData,
      });
      createdPosts.push(post);
    } catch (error) {
      console.error(`❌ Error creating post:`, error);
    }
  }
  console.log(`✅ Created ${createdPosts.length} posts`);

  // 為熱門貼文添加大量互動（按讚、留言、轉發）
  const trendingPostIds = createdPosts
    .slice(newsPosts.length + sportsPosts.length + entertainmentPosts.length)
    .map((p) => p.id);

  // 為熱門貼文添加按讚
  for (const postId of trendingPostIds) {
    for (let i = 0; i < Math.min(createdUsers.length, 5); i++) {
      try {
        await prisma.like.create({
          data: {
            userId: createdUsers[i].id,
            postId: postId,
          },
        });
      } catch (error) {
        // 忽略重複錯誤
      }
    }
  }

  // 為熱門貼文添加轉發
  for (const postId of trendingPostIds) {
    for (let i = 0; i < Math.min(createdUsers.length, 3); i++) {
      try {
        await prisma.repost.create({
          data: {
            userId: createdUsers[i].id,
            postId: postId,
          },
        });
      } catch (error) {
        // 忽略重複錯誤
      }
    }
  }

  // 為熱門貼文添加留言
  for (const postId of trendingPostIds) {
    for (let i = 0; i < Math.min(createdUsers.length, 4); i++) {
      try {
        await prisma.comment.create({
          data: {
            postId: postId,
            authorId: createdUsers[i].id,
            content: `This is amazing! ${i === 0 ? '🔥' : i === 1 ? '💯' : i === 2 ? '👏' : '🎉'}`,
          },
        });
      } catch (error) {
        console.error(`❌ Error creating comment:`, error);
      }
    }
  }

  // 為其他貼文添加一些互動
  const otherPosts = createdPosts.slice(0, newsPosts.length + sportsPosts.length + entertainmentPosts.length);
  for (const post of otherPosts) {
    // 隨機添加 1-3 個按讚
    const likeCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < Math.min(likeCount, createdUsers.length); i++) {
      try {
        await prisma.like.create({
          data: {
            userId: createdUsers[i].id,
            postId: post.id,
          },
        });
      } catch (error) {
        // 忽略重複錯誤
      }
    }

    // 隨機添加 0-2 個留言
    const commentCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < Math.min(commentCount, createdUsers.length); i++) {
      try {
        await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: createdUsers[i].id,
            content: `Great post! ${i === 0 ? '👍' : '💬'}`,
          },
        });
      } catch (error) {
        console.error(`❌ Error creating comment:`, error);
      }
    }
  }

  console.log('✅ Added interactions to posts');

  console.log('✨ Explore page seeding completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Users: ${createdUsers.length}`);
  console.log(`   - Posts: ${createdPosts.length}`);
  console.log(`   - News posts: ${newsPosts.length}`);
  console.log(`   - Sports posts: ${sportsPosts.length}`);
  console.log(`   - Entertainment posts: ${entertainmentPosts.length}`);
  console.log(`   - Trending posts: ${trendingPosts.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




