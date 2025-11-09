import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Facebook from 'next-auth/providers/facebook';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    GitHub({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'public_profile',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: sessionData }) {
      if (user) {
        token.uid = (user as any).id;
        token.userId = (user as any).userId ?? null;
      }
      // 當 session 更新時（例如註冊 userId 後），更新 token
      if (trigger === 'update' && sessionData?.userId) {
        token.userId = sessionData.userId;
      }
      // 注意：不能在 Edge Runtime 中使用 Prisma
      // userId 會在 Server Components 或 API routes 中從資料庫讀取
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).uid = token.uid;
        (session as any).userId = (token as any).userId ?? null;
      }
      return session;
    },
    async signIn({ user }) {
      // 允許登入，若還沒 userId，稍後在 client 端導向 /register
      return true;
    },
  },
  pages: {
    // 使用內建頁面，之後可自訂
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);


