import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styled from 'styled-components'
import Link from 'next/link'
import React, { use, useEffect, useState } from 'react'
import { getOCR } from '../../lib/ocr'
import { getProviders, signIn } from "next-auth/react";
import { useSession } from 'next-auth/react';
import useSpotify from '../../hooks/useSpotify';
import LoadingIcons from 'react-loading-icons';
import Iframe from 'react-iframe';


export default function Home( {providers} ) {
  const spotifyApi = useSpotify();
  const { data: session, status } = useSession();

  const [processStatus, setProcessStatus] = useState(process[0]);
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [artists, setArtists] = useState(new Set());
  const [playlistData, setPlaylistData] = useState(new Set());
  const [festName, setFestName] = useState('festival');
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const [playlistEmbedUrl, setPlaylistEmbedUrl] = useState(null);
  const [numFound, setNumFound] = useState(0);

  useEffect(()=>{
  }, [session, spotifyApi]);


  function handleImageChange(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
  
    reader.onload = function (event) {
      const base64 = event.target.result;
      setImage(base64);
    };
  
    reader.readAsDataURL(file);
  }

  const handleSubmit = () => {
    console.log("scraping text from image");
    setProcessStatus(process[1]);
    getOCR(image, imageURL)
    .then(async (data) => {
      if(data==undefined){
        console.log("bad result");
        setProcessStatus(process[0]);
        return;
      }
      console.log("Finding artists in text");
      setProcessStatus(process[2]);
      try{
        const response = await fetch("/api/openai?prompt=" + encodeURIComponent(data))
        const artistsData = await response.json();
        console.log(artistsData.result);
        JSON.parse(artistsData.result).map((artistData)=>{
          artists.add(artistData.toLowerCase())
        })
        console.log("artists found, retrieving music library");
        console.log(artists);
        setProcessStatus(process[3]);
        let iter=0;
        let run = true;
        let library2 = []
        while(run){
          const data = await spotifyApi.getMySavedTracks({limit : 50, offset: (iter*50)})
          if (data.statusCode!=200) {
            alert("error getting spotify library, try again");
            setProcessStatus(process[0]);
            throw new Error(`HTTP error! status: ${data.statusCode}`);
          }
          console.log('retrieved chunk #'+(iter+1)+' of library');
          library2 = library2.concat(data.body.items)
          if(data.body.items<50) run=false;
          iter+=1;
        }
        console.log('retrieved full library, begin matching tracks');
        setProcessStatus(process[4]);
        let count = 0;
        for(let item of library2){
          for(let trackArtist of item.track.artists){
            if(artists.has(trackArtist.name.toLowerCase())){
              console.log("found match");
              count++;
              playlistData.add(item.track.uri);
              break;
            }
          }
        }
        setNumFound(count);
        console.log("finished searching tracks, creating playlist");
        setProcessStatus(process[5]);
        spotifyApi.createPlaylist(festName, { 'description': 'Playlist made with Dean\'s playlist generator', 'public': true })
        .then(async (playlist)=>{
          console.log(playlist.body.external_urls.spotify);
          setPlaylistUrl(playlist.body.external_urls.spotify);
          setPlaylistEmbedUrl(playlist.body.external_urls.spotify.replace(/open.spotify.com\/playlist\//, "open.spotify.com/embed/playlist/"));
          console.log("playlist created, adding tracks");
          let iter=0;
          let run = true;
          const playListArray = Array.from(playlistData);
          while(run){
            const slice = playListArray.slice((iter*100), ((iter*100)+100));
            const response = await spotifyApi.addTracksToPlaylist(playlist.body.id, slice)
            if (response.statusCode!=200 && response.statusCode!=201) {
              alert("No tracks found");
              setProcessStatus(process[0]);
              throw new Error(`HTTP error! status: ${response.statusCode}`);
            }
            if(slice.length<100) run=false;
            iter=iter+1;
          }
          setProcessStatus(process[6]);
        }, function(err) {
            console.log('Something went wrong!', err);
            alert('unable to create playlist');
            setProcessStatus(process[0]);
        });
      } catch (reason){
        console.log(reason);
        setProcessStatus(process[0]);
        const message = reason instanceof Error ? reason.message : reason;
        console.log("API failure:", message);
        return res.status(500).json({ message: "Internal Server Error" });
        }
    }, function(err) {
        console.log('Something went wrong!', err);
        alert('error atempting to scrape image, ensure valid link is used');
        setProcessStatus(process[0]);
    });
  }

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Main>
      {processStatus==process[0] && <InputContainer>
        <ProcessHeader>1. Login to spotify <br></br> 2. Add festival poster</ProcessHeader>
        {!spotifyApi.getAccessToken() && Object.values(providers).map((provider)=>(
            <div key={provider.name}>
                <SpotifyLogin
                onClick={()=>signIn(provider.id, {callbackUrl: "/"})}>
                  <SpotifySpan>
                    <SpotifyLogo
                      src="/spotify-logo.png"
                      alt="Spotify logo"
                      width={25}
                      height={25}/>
                      login with {provider.name}
                  </SpotifySpan>
                </SpotifyLogin>
            </div>
        ))}
        <LinkInput type="text"
          id="festival name" name="festival name" placeholder='Festival name'
          onChange={(e) => setFestName(e.target.value)}>
        </LinkInput>
        <InputTypeContainer>
          <FileUpload type="file"
            id="poster upload" name="poster upload"
            accept="image/png, image/jpeg" onChange={(e) => handleImageChange(e)}>
          </FileUpload>
          <FileUploadButton for="poster upload">Select file</FileUploadButton>
          or
          <LinkSpan>
            <LinkInput type="text"
              id="posterLink" name="posterLink" placeholder='Image link'
              onChange={(e) => setImageURL(e.target.value)}>
            </LinkInput>
            <ExampleLink href='https://festuff-production.s3.amazonaws.com/uploads/image/attachment/45581/lineup-847-poster-91504ac8-d0d9-42e0-bee2-ae136a86b34b.jpg'>example</ExampleLink>
          </LinkSpan>
        </InputTypeContainer>
        <SubmitButton disabled={((imageURL==null || imageURL=='') && image==null) ||  !spotifyApi.getAccessToken()} onClick={handleSubmit}>Submit</SubmitButton>
      </InputContainer>}
      {(processStatus!=process[0] && processStatus!=process[6]) &&
      <ProcessDisplayContainer>
        <LoadingIcons.Grid fill="#1DB954"/>
        <ProcessHeader>{processStatus}</ProcessHeader>
        {processStatus==process[4] && 
        <ProcessHeader>Found: {numFound}</ProcessHeader>}
      </ProcessDisplayContainer>
      }
      {processStatus==process[6] &&
      <ProcessDisplayContainer>
        <ProcessHeader>Found {numFound} songs</ProcessHeader>
        <PlaylistLink href={playlistUrl}>View Playlist</PlaylistLink>
        <ResetButton onClick={()=>{setProcessStatus(process[0]); setNumFound(0); setImage(null); setImageURL(null)}}>Reset</ResetButton>
        <PlaylistEmbed 
          style="border-radius:12px" 
          src={playlistEmbedUrl}
          height="352" 
          width='100%'
          frameBorder="0" 
          allowFullScreen="" 
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
          loading="lazy">
        </PlaylistEmbed>
      </ProcessDisplayContainer>
      }
      </Main>
    </>
  )
}

const Main = styled.div`
height: 100vh;
`;

const InputContainer = styled.div`
display: flex;
flex-direction: column;
align-items: center;
margin-top: 100px;
gap: 5px;
`;

const SpotifyLogin = styled.button`
font-weight: 700;
font-family: Arial, Helvetica, sans-serif;
border: none;
padding: 10px;
border-radius: 5px;
background-color: #1DB954;
color: white;
&:hover{
  filter: brightness(80%);
  cursor: pointer;
}
`;

const SpotifySpan = styled.span`
display: flex;
align-items: center;
gap: 5px;
`

const SpotifyLogo = styled(Image)`
background-color: black;
padding: 3px;
border-radius: 50%;
`;

const InputTypeContainer = styled.div`
display: flex;
gap: 15px;
align-items: baseline;
font-family: Arial, Helvetica, sans-serif;
`;

const LinkSpan = styled.span`
display: flex;
flex-direction: column;
align-items: center;
`;

const LinkInput = styled.input`
width: 150px;
padding:3px;
text-align: center;
`;

const ExampleLink = styled(Link)`
font-size: 0.8rem;
color: blue;
`;

const FileUpload = styled.input`
display: none;
`
const FileUploadButton = styled.label`
display: inline-block;
background: linear-gradient(top, #f9f9f9, #e3e3e3);
border: 1px solid #999;
border-radius: 3px;
padding: 5px 8px;
outline: none;
white-space: nowrap;
-webkit-user-select: none;
cursor: pointer;
font-weight: 700;
font-size: 10pt;
width: 150px;
text-align: center;
font-family: Arial, Helvetica, sans-serif;

&:hover::before {
  border-color: black;
}
&:active::before {
  background: -webkit-linear-gradient(top, #e3e3e3, #f9f9f9);
}
@media (prefers-color-scheme: dark) {
  color: white;
}
`;

const SubmitButton = styled.button`
font-family: Arial, Helvetica, sans-serif;
padding: 15px;
border: none;
border-radius: 20px;
width: 100px;
background: rgb(249,13,3);
background: linear-gradient(40deg, rgba(249,13,3,1) 4%, rgba(219,165,31,1) 22%, rgba(74,200,58,1) 39%, rgba(40,163,136,1) 63%, rgba(29,56,159,1) 79%, rgba(255,44,192,1) 100%);
background:${(props)=>props.disabled?'gray':'linear-gradient(40deg, rgba(249,13,3,1) 4%, rgba(219,165,31,1) 22%, rgba(74,200,58,1) 39%, rgba(40,163,136,1) 63%, rgba(29,56,159,1) 79%, rgba(255,44,192,1) 100%);'};
cursor:${(props)=>props.disabled?'not-allowed':'pointer'}
`;

const ProcessDisplayContainer = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: 15px;
@media (prefers-color-scheme: dark) {
  color: white;
}
`;

const ProcessHeader = styled.h1`
font-family: Arial, Helvetica, sans-serif;
margin-bottom: 25px;
text-align: center;
`

const PlaylistLink = styled(Link)`
font-weight: 700;
font-family: Arial, Helvetica, sans-serif;
border: none;
padding: 10px;
border-radius: 5px;
background-color: #1DB954;
color: white;
&:hover{
  filter: brightness(80%);
  cursor: pointer;
}
`;

const PlaylistEmbed = styled(Iframe)`
width: 40%;
@media (max-width: 750px) {
  width: 80%;
}
`;

const ResetButton = styled.button`
font-weight: 700;
font-family: Arial, Helvetica, sans-serif;
border: none;
padding: 10px;
border-radius: 5px;
background-color: #1DB954;
color: white;
&:hover{
  filter: brightness(80%);
  cursor: pointer;
}
`;

const process = [
  'before',
  'Scraping text from poster image',
  'Using AI to find artist names',
  'Retrieving liked songs from spotify',
  'Finding songs with attending artists',
  'Creating playlist',
  'done'
]

export async function getServerSideProps() {
  const providers = await getProviders();

  return {
      props: {
          providers,
      }, 
  }
}
