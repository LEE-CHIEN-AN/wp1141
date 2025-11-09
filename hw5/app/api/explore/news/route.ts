import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/utils/api-error-handler';
import { formatDistanceToNow } from 'date-fns';

// GET: 取得今日新聞
export async function GET(req: Request) {
  const session = await auth();
  if (!session || !(session as any).uid) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 從包含新聞相關 hashtag 的貼文中提取新聞
    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        content: {
          contains: '#news',
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
            reposts: true,
          },
        },
      },
    });

    // 將貼文轉換為新聞格式
    const news = posts.map((post, index) => {
      const totalEngagements = post._count.comments + post._count.likes + post._count.reposts;
      
      // 從內容中提取標題和描述
      const lines = post.content.split('\n').filter((line) => line.trim());
      const title = lines[0] || post.content.substring(0, 100);
      const description = lines[1] || post.content.substring(100, 200) || '';

      return {
        id: post.id,
        title: title.length > 100 ? title.substring(0, 100) + '...' : title,
        description: description.length > 150 ? description.substring(0, 150) + '...' : description,
        category: 'News',
        timeAgo: formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }),
        postsCount: totalEngagements,
        thumbnail: post.media?.[0]?.url || undefined,
      };
    });

    // 如果沒有足夠的新聞，生成一些示例新聞
    if (news.length < 3) {
      const sampleNews = [
        {
          id: 'sample-1',
          title: 'Zohran Kwame Mamdani Wins Narrow 2025 NYC Mayoral Race as Youngest Mayor and First Muslim Leader...',
          description: 'In a historic election, Zohran Kwame Mamdani has been elected as the youngest mayor of New York City and the first Muslim leader in the city\'s history.',
          category: 'News',
          timeAgo: '2 days ago',
          postsCount: 131000,
          thumbnail: undefined,
        },
        {
          id: 'sample-2',
          title: 'X\'s "Cozy Sapphic" Trend Celebrates Lesbian Romance with 1.4 Million Engagements...',
          description: 'The "Cozy Sapphic" trend on X has gained massive popularity, celebrating lesbian romance and representation with over 1.4 million engagements.',
          category: 'Entertainment',
          timeAgo: '2 days ago',
          postsCount: 199000,
          thumbnail: undefined,
        },
        {
          id: 'sample-3',
          title: 'Thai Actresses Lingling Kwong and Orm Kornnaphat Dazzle at Chiang Mai Lanna Festival...',
          description: 'Thai actresses Lingling Kwong and Orm Kornnaphat made stunning appearances at the Chiang Mai Lanna Festival, showcasing traditional Thai culture.',
          category: 'Entertainment',
          timeAgo: '2 days ago',
          postsCount: 287000,
          thumbnail: undefined,
        },
      ];
      
      return NextResponse.json({ ok: true, news: [...news, ...sampleNews.slice(0, 3 - news.length)] });
    }

    return NextResponse.json({ ok: true, news });
  } catch (error) {
    return handleApiError(error);
  }
}




