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
import { BsFill1CircleFill, BsFill2CircleFill, BsFillPeopleFill, BsMusicNoteBeamed } from "react-icons/bs";
import { AiFillCheckCircle, AiFillGithub } from "react-icons/ai";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import VisibilitySensor from "react-visibility-sensor";


export default function Home( {providers} ) {
  const spotifyApi = useSpotify();
  const { data: session, status } = useSession();

  const [processStatus, setProcessStatus] = useState(process[0]);
  const [image, setImage] = useState(null);
  const [imageURL, setImageURL] = useState(null);
  const [artists, setArtists] = useState(new Set());
  const [userArtists, setUserArtists] = useState(new Set())
  const [playlistData, setPlaylistData] = useState(new Set());
  const [festName, setFestName] = useState('Festival Playlist');
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const [playlistEmbedUrl, setPlaylistEmbedUrl] = useState(null);
  const [numFound, setNumFound] = useState(0);
  const [artistStreamData, setArtistStreamData] = useState(null);
  const [libraryItems, setLibraryItems] = useState(0);

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

  const handleSubmit = async () => {
    console.log("scraping text from image");
    setProcessStatus(process[1]);
    const prompt = await getOCR(image, imageURL);
      if(prompt==undefined){
        console.log("bad result");
        setProcessStatus(process[0]);
        return;
      }
      console.log("Finding artists in text");
      setProcessStatus(process[2]);
      setArtistStreamData("");
      const cleanArtists = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });
      if (!cleanArtists.ok) {
        throw new Error(cleanArtists.statusText);
      }
      const responseData = cleanArtists.body;
      if (!responseData) {
        return;
      }

      const reader = responseData.getReader();
      const decoder = new TextDecoder();
      let done = false;

      let artistList = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        artistList = artistList + chunkValue;
        setArtistStreamData((prev) => prev + chunkValue);
      }

      console.log("finished");
      setArtistStreamData("");
      const artistsData = JSON.stringify(artistList.split(', '));
      console.log(artistsData);
      JSON.parse(artistsData).map((artistData)=>{
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
          setLibraryItems(iter*50);
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
              userArtists.add(trackArtist.name.toLowerCase());
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
  }

  return (
    <>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet"/>
      </Head>
      <Main>
        <ContentContainer>

          {/* INPUT */}
          {processStatus==process[0] && <InputContainer>
            <InstructionsContainer>
              {spotifyApi.getAccessToken() ? <InstructionsItemDone><CheckIcon size={27}/> Login to spotify</InstructionsItemDone> : <InstructionsItem><BsFill1CircleFill/>Login to spotify </InstructionsItem>}
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
              {(image==null && (imageURL==null || imageURL=='')) ? <InstructionsItem><BsFill2CircleFill/> Add festival poster</InstructionsItem> : <InstructionsItemDone><CheckIcon size={27}/> Add festival poster</InstructionsItemDone>}
            </InstructionsContainer>
            <NameInput type="text"
              id="festival name"
              name="festival name"
              placeholder='Festival name'
              onChange={(e) => setFestName(e.target.value)}>
            </NameInput>
            <InputTypeContainer>
              <FileUpload 
                type="file"
                id="poster upload" 
                name="poster upload"
                accept="image/png, image/jpeg" 
                onChange={(e) => handleImageChange(e)}>
              </FileUpload>
              <FileUploadButton
                htmlFor="poster upload"
                hasFile={image}>Select file</FileUploadButton>
              or
              <LinkSpan>
                <LinkInput 
                  type="text"
                  id="posterLink" 
                  name="posterLink" 
                  placeholder='Image link'
                  link={imageURL}
                  onChange={(e) => setImageURL(e.target.value)}>
                </LinkInput>
                <ExampleLink href='https://festuff-production.s3.amazonaws.com/uploads/image/attachment/45581/lineup-847-poster-91504ac8-d0d9-42e0-bee2-ae136a86b34b.jpg'>example</ExampleLink>
              </LinkSpan>
            </InputTypeContainer>
            <SubmitButton disabled={((imageURL==null || imageURL=='') && image==null) ||  !spotifyApi.getAccessToken()} onClick={handleSubmit}>Build my playlist</SubmitButton>

            <AppDescriptionContainer>
              Upload an image or submit a link of a festival poster and this app will create a custom spotify playlist based on the artists attending and the songs in you music library
            </AppDescriptionContainer>
            
          </InputContainer>}



          {/* LOADING */}
          {(processStatus!=process[0] && processStatus!=process[6]) &&
          <ProcessDisplayContainer>
            <ProcessHeader>{processStatus}</ProcessHeader>
            {processStatus==process[1] && <LoadingIcons.Grid fill="#1DB954"/> }
            {processStatus==process[2] && 
            <CodeSquare>{artistStreamData}</CodeSquare>}
            {processStatus==process[3] && 
            <ProcessHeader>Retrieved {libraryItems} songs</ProcessHeader>}
          </ProcessDisplayContainer>
          }

</ContentContainer>
          


          {/* FINISHED */}
          {processStatus==process[6] &&
          <FinishedContainer>
              <ArtistsCircleContainer>
                <VisibilitySensor>
                  {({ isVisible }) => {
                    const percentage = isVisible ? userArtists.size : 0;
                    return (
                      <CircularProgressbar value={percentage} maxValue={artists.size} text={`${userArtists.size}/${artists.size}`} />

                    );
                  }}
                </VisibilitySensor>
              </ArtistsCircleContainer>
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
            <DetailsConatiner>
              <DetailSpan><BsMusicNoteBeamed/> - {numFound} songs</DetailSpan>
              <DetailSpan><BsFillPeopleFill/> - {userArtists.size} artists</DetailSpan>
            </DetailsConatiner>
            <ResetButton onClick={()=>{setProcessStatus(process[0]); setNumFound(0); setImage(null); setImageURL(null); setLibraryItems(0);setArtists(new Set()); setUserArtists(new Set());}}>Restart</ResetButton>
          </FinishedContainer>
          }


        <CenterDiv>
          <CreditTag>
            <span>
            Created by
            <GitLink href={'https://github.com/Deanstirrat'}>
              <AiFillGithub/>
              <Name>Dean Stirrat</Name>
            </GitLink>
            </span>
          </CreditTag>
        </CenterDiv>
      </Main>
    </>
  )
}

const Main = styled.div`
height: 100vh;
`;

const IconSpan = styled.span`
@media (prefers-color-scheme: dark) {
  color: white;
}
`

const CheckIcon = styled(AiFillCheckCircle)`
color: green;
`;

const ContentContainer = styled.div`
display: grid;
grid-template-columns: 1fr min(350px) 1fr
`;

const InstructionsContainer = styled.div`
display: flex;
flex-direction: column;
align-items: center;
color: black
@media (prefers-color-scheme: dark) {
  color: white;
}
gap: 10px;
margin-bottom: 20px;
`;

const InstructionsItem = styled.div`
font-family: Arial, Helvetica, sans-serif;
text-align: center;
font-size: 1.5rem;
@media (prefers-color-scheme: dark) {
  color: white;
}
`;

const InstructionsItemDone = styled.div`
font-family: Arial, Helvetica, sans-serif;
text-align: center;
font-size: 1.5rem;
color: green;
`;

const NameInput = styled.input`
text-align: center;
width: 100%;
height: 30px;
border-radius: 10px;
border: 1px solid;
border-color: black;

`;

const InputContainer = styled.div`
grid-column-start: 2;
grid-column-end: 3;
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
width: 100%;
justify-content: space-between;
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
border-style: solid;
border-radius: 3px;
border: 1px solid;
border-color: ${(props) => (props.link==null || props.link=='') ? 'black' : 'green'};
@media (prefers-color-scheme: dark) {
  border-color: ${(props) => (props.link==null || props.link=='') ? 'white' : 'green'};
  color: ${(props) => (props.link==null || props.link=='') ? 'white' : 'green'};
}
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
border: 1px solid;
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
border-color: ${(props) => props.hasFile==null ? 'black' : 'green'};
color: ${(props) => props.hasFile==null ? 'black' : 'green'};

&:hover::before {
  border-color: black;
}
&:active::before {
  background: -webkit-linear-gradient(top, #e3e3e3, #f9f9f9);
}
@media (prefers-color-scheme: dark) {
  border-color: ${(props) => props.hasFile==null ? 'white' : 'green'};
  color: ${(props) => props.hasFile==null ? 'white' : 'green'};
}
`;

const SubmitButton = styled.button`
font-family: Arial, Helvetica, sans-serif;
font-weight: 900;
padding: 15px;
border: none;
border-radius: 20px;
width: 150px;
background: rgb(249,13,3);
background: linear-gradient(40deg, rgba(249,13,3,1) 4%, rgba(219,165,31,1) 22%, rgba(74,200,58,1) 39%, rgba(40,163,136,1) 63%, rgba(29,56,159,1) 79%, rgba(255,44,192,1) 100%);
background:${(props)=>props.disabled?'gray':'linear-gradient(40deg, rgba(249,13,3,1) 4%, rgba(219,165,31,1) 22%, rgba(74,200,58,1) 39%, rgba(40,163,136,1) 63%, rgba(29,56,159,1) 79%, rgba(255,44,192,1) 100%);'};
cursor:${(props)=>props.disabled?'not-allowed':'pointer'}
`;

const AppDescriptionContainer = styled.div`
margin-top: 50px;
font-family: Arial, Helvetica, sans-serif;
padding: 15px;
width: 100%;
border-radius: 15px;
background-color: black;
color: white;
@media (prefers-color-scheme: dark) {
  background-color: white;
  color: black
}
`;

const ProcessDisplayContainer = styled.div`
margin-top: 50px;
grid-column-start: 2;
grid-column-end: 3;
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
@media (prefers-color-scheme: dark) {
  color: white;
}
`;

const CodeSquare = styled.div`
width:100%;
height: 300px;
background-color: black;
color: green;
border-style: solid;
border-color: green;
padding: 20px;
border-radius: 10px;
overflow: scroll;
font-family: 'Source Code Pro', monospace;
@media (prefers-color-scheme: dark) {
  color: white;
  background-color: #001261;
}
`;

const FinishedContainer = styled.div`
display: grid;
grid-template-columns: 1fr minmax(100px, 200px) 400px 1fr;
grid-template-rows: 50px 200px 100px 50px 100px;
gap: 10px;
`;

const ArtistsCircleContainer = styled.div`
width: 100%;
height: 100%;
grid-row: 2/3;
grid-column: 2/3;
font-family: Arial, Helvetica, sans-serif;
`;

const DetailsConatiner = styled.div`
display: flex;
flex-direction: column;
grid-row: 3/4;
grid-column: 2/3;
`;

const DetailSpan = styled.div`
font-size: 2rem;
font-family: Arial, Helvetica, sans-serif;
`


const PlaylistEmbed = styled(Iframe)`
grid-row-start: 2;
grid-row-end: 3;
grid-column-start: 3;
grid-column-end: 4;
width: 100%;
height: 500px;
border-radius:30px;
@media (max-width: 750px) {
  width: 80%;
}
`;

const ResetButton = styled.button`
grid-row: 4/5;
grid-column: 2/3;
font-weight: 700;
font-family: Arial, Helvetica, sans-serif;
width: 100%;
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

const CenterDiv = styled.div`
margin-top: 100px;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
`;

const CreditTag = styled.div`
display: flex;
flex-direction: column;
align-items: center;
grid-column-start: 2;
grid-column-end: 3;
z-index: 5;
border-radius: 25px;
padding: 10px;
background-color: rgba(143, 142, 142, 0.36);
width: 175px;
font-family: Arial, Helvetica, sans-serif;
font-size: 0.75rem;
@media (prefers-color-scheme: dark) {
  color: black;
  background-color: white;
}
`;

const GitLink = styled.a`
color: #37371f;
text-decoration: none;
`;

const Name = styled.span`
color: black;
&:hover{
color:#ea9010;
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
