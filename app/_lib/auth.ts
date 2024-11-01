import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import userModel from "../_mongodb/models/userModel";

// Extend the Session and User types
declare module "next-auth" {
  interface Profile {
    given_name?: string;
    family_name?: string;
    picture?: string;
    // other Google profile-specific fields can go here
  }
  interface Session {
    user: {
      userId?: string;
      image: any;
      name: string;
      email: string;
    };
    provider: string;
  }

  interface User {
    userId?: string;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Add the provider type to the token if available (e.g., "google", "github")
      if (account && profile) {
        token.provider = account.provider; // e.g., "google", "github", etc.
        const user = await userModel.findOne({ email: profile.email });
        if (user) token.userId = user._id.toString();
      }
      return token;
    },
    async signIn({ profile }) {
      try {
        const user = await userModel.findOne({ email: profile?.email });
        if (!user) {
          await userModel.create({
            userName: profile?.name,
            email: profile?.email,
            firstName: profile?.given_name,
            lastName: profile?.family_name,
            profileImage: profile?.picture,
            address: {
              city: "",
              country: "",
              unit_number: 0,
              street_number: 0,
              address_line1: "",
              address_line2: "",
              geolocation: {
                lat: 0,
                long: 0,
              },
            },
            provider: "google",
          });
        }
        return true;
      } catch (error) {
        return false;
      }
    },
    async session({ session, token }) {
      // Add the provider information to the session
      session.provider = token.provider as string;
      session.user.userId = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
