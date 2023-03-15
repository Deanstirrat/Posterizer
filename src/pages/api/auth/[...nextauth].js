import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
import { LOGIN_URL } from '../../../../lib/Spotify'
import spotifyApi from '../../../../lib/Spotify'


const refreshAccessToken = async (token) => {
    try{

        spotifyApi.setAccessToken(token.accessToken);
        spotifyApi.setRefreshToken(token.refreshToken);

        const { body: refreshedToken } = await spotifyApi.refreshAccessToken();
        console.log('refreshed token is ' + refreshedToken);

        return {
            ...token,
            accessToken: refreshedToken.access_token,
            accessTokenExpires: Date.now() + refreshedToken.expires_in * 1000,
            refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
            
        }

    }catch (error){
        console.log(error);

        return {
            ...token,
            error: "RefreshAccessTokenError",
        }
    }
}

export default NextAuth ({
  // Configure one or more authentication providers
  providers: [
    SpotifyProvider({
      clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
      clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
      authorization: LOGIN_URL
    }),
    // ...add more providers here
  ],
  secret: process.env.JWT_SECRET,
  pages: {
    signIn: '/index'
  },
  callbacks: {
    async jwt({token, account, user}){
        // initial sign in:
        if(account && user){ 
          console.log("new sign in");
          return{
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            username: account.providerAccountId,
            accessTokenExpires: account.expires_at * 1000,

        }}

        // return previous token if access token still valid
        if(Date.now() < token.accessTokenExpires){
            console.log("sign in still valid");
            return token;
        }

        // token expired so refresh
        console.log("refreshing old sign in");
        return await refreshAccessToken(token);
    },

    async session({ session, token }){
        session.user.accessToken = token.accessToken;
        session.user.refreshToken = token.refreshToken;
        session.user.username = token.username;
        return session;
    }
  },
});