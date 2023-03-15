import SpotifyWebApi from "spotify-web-api-node";

const scopes = [
    'user-library-read',
    'playlist-modify-public',
    'playlist-modify-private',
].join(',');

const params = {
    scope: scopes,
}

const queryParamString = new URLSearchParams(params);

const LOGIN_URL = `https://accounts.spotify.com/authorize?${queryParamString.toString()}`;

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
    clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
    redirectUri: 'https://posterizer-deanstirrat.vercel.app/api/auth/callback/spotify'
})

export default spotifyApi;

export { LOGIN_URL };