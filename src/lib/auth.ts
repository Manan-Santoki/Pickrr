import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getConfigValue } from '@/lib/settings';

// Extend the built-in session/JWT types
declare module 'next-auth' {
  interface User {
    role?: string;
    id?: string;
  }
  interface Session {
    user: DefaultSession['user'] & {
      id?: string;
      role?: string;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      id: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return { id: user.id, name: user.username, role: user.role };
      },
    }),
    Credentials({
      id: 'jellyfin',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const jellyfinUrl = await getConfigValue('JELLYFIN_URL');
        if (!jellyfinUrl) return null;

        const authRes = await fetch(
          `${jellyfinUrl.replace(/\/$/, '')}/Users/AuthenticateByName`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization:
                'MediaBrowser Client="Pickrr", Device="Web", DeviceId="pickrr-server", Version="1.0.0"',
            },
            body: JSON.stringify({
              Username: credentials.username,
              Pw: credentials.password,
            }),
          }
        );

        if (!authRes.ok) return null;

        const authData = (await authRes.json()) as { User?: { Id?: string; Name?: string } };
        const jellyfinUsername = authData?.User?.Name ?? String(credentials.username);

        let user = await db.user.findUnique({
          where: { username: jellyfinUsername },
        });

        if (!user) {
          const generatedPassword = `${Date.now()}-${Math.random()}-${authData?.User?.Id ?? jellyfinUsername}`;
          const passwordHash = await bcrypt.hash(generatedPassword, 12);
          user = await db.user.create({
            data: {
              username: jellyfinUsername,
              password: passwordHash,
              role: 'user',
            },
          });
        }

        return { id: user.id, name: user.username, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, user is populated; persist role and id to token
      if (user?.role) {
        token.role = user.role;
      }
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose role and id on the session object
      if (session.user && typeof token.role === 'string') {
        session.user.role = token.role;
      }
      if (session.user && (typeof token.id === 'string' || typeof token.sub === 'string')) {
        session.user.id = (token.id ?? token.sub) as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
