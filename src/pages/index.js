import Head from 'next/head'
import Image from 'next/image'
import styled, { keyframes } from 'styled-components'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { getOCR } from '../../lib/ocr'
import { getProviders, signIn } from "next-auth/react";
import { useSession } from 'next-auth/react';
import useSpotify from '../../hooks/useSpotify';
import LoadingIcons from 'react-loading-icons';
import Iframe from 'react-iframe';
import { BsFillPeopleFill, BsMusicNoteBeamed, BsHammer } from "react-icons/bs";
import { TbHexagonNumber1, TbHexagonNumber2, TbHexagonNumber3, TbPhotoUp } from 'react-icons/tb'
import {RiPlayListFill} from 'react-icons/ri'
import { VscServerProcess } from 'react-icons/vsc'
import { AiFillCheckCircle, AiFillGithub } from "react-icons/ai";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
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
  const [spotifyLoggedIn, setspotifyLoggedIn] = useState(false);

  useEffect(()=>{
    console.log('login update');
    setspotifyLoggedIn(spotifyApi.getAccessToken());
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

  const handleChangeProcess = (num) => {
    setProcessStatus(process[num]);
  }

  const handleResetArtistStreamData = () => {
    setArtistStreamData("");
  }

  const handleArtistStreamDataChange = (newData) =>{
    setArtistStreamData((prev) => prev + newData);
  }

  const handleSubmit = async () => {
    console.log("scraping text from image");
    setProcessStatus(process[2]);
    const prompt = await getOCR(image, imageURL, handleChangeProcess);
      if(prompt==undefined){
        console.log("bad result");
        setProcessStatus(process[0]);
        return;
      }
      console.log("Finding artists in text");
      setProcessStatus(process[3]);
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
        setProcessStatus(process[4]);
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
        setProcessStatus(process[5]);
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
        setProcessStatus(process[6]);
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
          setProcessStatus(process[7]);
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
        <link href="https://fonts.googleapis.com/css2?family=Dosis:wght@300&display=swap" rel="stylesheet"/>
      </Head>
      <Main>
        {/* INPUT */}
        {(processStatus==process[0] || processStatus==process[1])&& 
        <ContentContainer>
          <InstructionsContainer process={processStatus}>
            <InstructionCard process={processStatus}>
            <NumberIcon1 process={processStatus}/>
              <InstructionCardIcon><UploadIcon/></InstructionCardIcon>
              <InstructionCardTextContainer><InstructionText process={processStatus}>Upload a poster</InstructionText></InstructionCardTextContainer>
              {processStatus==process[1] && 
                <InputContainer>
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
                    hasFile={image}>{image != null ? <span><CheckIcon/>File Selected</span> : 'Select File'}</FileUploadButton>
                  <LineBreak>or</LineBreak>
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
                <SubmitButton disabled={((imageURL==null || imageURL=='') && image==null) ||  !spotifyLoggedIn} onClick={handleSubmit}><BsHammer/>Build Playlist</SubmitButton>    
              </InputContainer>
              }
            </InstructionCard>
            <InstructionCard process={processStatus}>
            <TbHexagonNumber2 size={40} color={'white'}/>
              <InstructionCardIcon><BuildingIcon/></InstructionCardIcon>
              <InstructionCardTextContainer><InstructionText>Run the app</InstructionText></InstructionCardTextContainer>
            </InstructionCard>
            <InstructionCard process={processStatus}>
              <TbHexagonNumber3 size={40} color={'white'}/>
              <InstructionCardIcon><PlaylistIcon/></InstructionCardIcon>
              <InstructionCardTextContainer><InstructionText>View your custom playlist</InstructionText></InstructionCardTextContainer>
            </InstructionCard>
          </InstructionsContainer>
          {!spotifyLoggedIn && Object.values(providers).map((provider)=>(
            <div key={provider.name}>
                <SpotifyLogin
                onClick={()=>signIn(provider.id, {callbackUrl: "/"})}>
                  <SpotifySpan>
                  login with
                    <SpotifyLogo
                      src="/spotify-logo.png"
                      alt="Spotify logo"
                      width={177}
                      height={59}
                    />
                  </SpotifySpan>
                </SpotifyLogin>
            </div>
          ))}
          {spotifyLoggedIn && processStatus==process[0] && <BeginButton onClick={()=>handleChangeProcess(1)}>START</BeginButton>}
        </ContentContainer>}


          {/* LOADING */}
          {(processStatus!=process[0] && processStatus!=process[1] && processStatus!=process[7]) &&
          <ContentContainer>
            <ProcessDisplayContainer>
              <ProcessHeader>{processStatus}</ProcessHeader>
              {processStatus==process[2] && <LoadingIcons.Grid fill="#1DB954"/> }
              {processStatus==process[3] && <CodeSquare>{artistStreamData}</CodeSquare>}
              {processStatus==process[4] && <ProcessHeader>Retrieved {libraryItems} songs</ProcessHeader>}
            </ProcessDisplayContainer>
          </ContentContainer>
          }
          


          {/* FINISHED */}
          {processStatus==process[7] &&
          <FinishedContainer>
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
            <InfoContainer>
            <ArtistsCircleContainer>
                <VisibilitySensor>
                  {({ isVisible }) => {
                    const percentage = isVisible ? userArtists.size : 0;
                    return (
                      <CircularProgressbar value={percentage} maxValue={artists.size} text={`${percentage}%` } styles={buildStyles({
                      pathColor: `#1DB954`,
                      textColor: '#1DB954',
                      trailColor: '#d6d6d6',
                      })} />

                    );
                  }}
                </VisibilitySensor>
              </ArtistsCircleContainer>
            <DetailsConatiner>
              <DetailSpan><BsMusicNoteBeamed/> - {numFound}</DetailSpan>
              <DetailSpan><BsFillPeopleFill/> - {userArtists.size}</DetailSpan>
            </DetailsConatiner>
            <ResetButton onClick={()=>{setProcessStatus(process[0]); setNumFound(0); setImage(null); setImageURL(null); setLibraryItems(0);setArtists(new Set()); setUserArtists(new Set());}}>Restart</ResetButton>
            </InfoContainer>
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

const slideInFromTop = keyframes`
0% {
  transform: translateY(-100%);
}
100% {
  transform: translateY(0);
}
`
const slideInFromLeft = keyframes`
0% {
  transform: translateX(-100%);
}
100% {
  transform: translateX(0);
}
`

const wait = keyframes`
  0% {transform: translateY(-200%); }
  100% { transform: translateY(-200%); }
`

const waitX = keyframes`
  0% {transform: translateX(-200%); }
  100% { transform: translateX(-200%); }
`

const fadeIn = keyframes`
0% {
      opacity: 0;
  }
  100% {
      opacity: 1;
   }
`;

const Main = styled.div`
position: relative;
height: 100vh;
background-color: black;
`;

const IconSpan = styled.span`
@media (prefers-color-scheme: dark) {
  color: white;
}
`

const CheckIcon = styled(AiFillCheckCircle)`
color: green;
`;

const UploadIcon = styled(TbPhotoUp)`
font-size: 120px;
color: #FAFFFD;
@media (max-width: 750px) {
  font-size: 50px;
}
`;
const BuildingIcon = styled(VscServerProcess)`
font-size: 120px;
color: #FAFFFD;
@media (max-width: 750px) {
  font-size: 50px;
}
`;
const PlaylistIcon = styled(RiPlayListFill)`
font-size: 120px;
color: #FAFFFD;
@media (max-width: 750px) {
  font-size: 50px;
}
`;

const NumberIcon1 = styled(TbHexagonNumber1)`
font-size:40px;
color:white;
${props => props.process==process[1] && `
display: none;
`}
`

const ContentContainer = styled.div`
display: flex;
flex-direction: column;
justify-content: center;
gap: 25px;
align-items: center;
height: 90%;
`;

const InstructionsContainer = styled.div`
position: realative;
display: flex;
color: black;
margin-top: 50px;
gap: 50px;
justify-content: center;
${props => props.process==process[1] && `
height: 80%;
width: 80%;
@media (max-width: 750px) {
  width: 100%;
}
margin: 0;
gap: 0;
transition: width .2s 0s ease-in-out;
transition: all .5s 0.2s ease-in-out;
`}
@media (prefers-color-scheme: dark) {
  color: white;
}
@media (max-width: 750px) {
  gap: 20px;
  flex-direction: column;
}
`;

const InstructionCard = styled.div`
&:nth-child(1){
  animation: .3s ease-out 0s 1 ${slideInFromTop};
  ${props => props.process==process[1] && `
  padding: 0;
  box-shadow: none;
  overflow: hidden;

    &:hover,
    &:focus {
      box-shadow: 
        none;
    }
  height: 90vh;
  width: 100vw;
  transition-property: height, width;
  transition: .5s 0.2s ease-in-out;
  flex-direction: column;
`}
}
&:nth-child(2){
  left: 220px;
  animation: .5s ease-out 0s 1 ${wait}, .3s ease-out .5s 1 ${slideInFromTop};
  ${props => props.process==process[1] && `
  padding: 0;
  height: 0;
  width: 0;
  transition: all .2s ease-out;
  box-shadow: none;
  overflow: hidden;

    &:hover,
    &:focus {
      box-shadow: 
        none;
    }
`}
}
&:nth-child(3){
  animation: 1s ease-out 0s 1 ${wait}, .3s ease-out 1s 1 ${slideInFromTop};
  ${props => props.process==process[1] && `
  padding: 0;
  height: 0;
  width: 0;
  transition: all .2s ease-out;
  box-shadow: none;
  overflow: hidden;

`}
}
width: 200px;
background-color: #1DB954;
transition: 0.25s;
display: flex;
flex-direction: column;
justify-content: space-around;
height: 250px;
padding: 15px;
@media (max-width: 750px) {
  width: 400px;
  flex-direction: row;
  height: 100px;
  &:nth-child(1){
    animation: .3s ease-out 0s 1 ${slideInFromLeft};
  }
  &:nth-child(2){
    animation: .5s ease-out 0s 1 ${waitX}, .3s ease-out .5s 1 ${slideInFromLeft};
  }
  &:nth-child(3){
    animation: 1s ease-out 0s 1 ${waitX}, .3s ease-out 1s 1 ${slideInFromLeft};
  }
}
`;

const InstructionCardIcon = styled.div`
height: 150px;
display: flex;
align-items: center;
justify-content: center;
color: black;
@media (max-width: 750px) {
  height: 100px;
  width: 100px;
  border-radius: 10px 0 0 10px;
}
`;

const InstructionCardTextContainer = styled.div`
display: flex;
flex-direction: column;
height: 100px;
color: #FAFFFD;
@media (prefers-color-scheme: dark) {
  color: white;
}
@media (max-width: 750px) {
  height: 100px;
  width: 300px;
}
`;
const InstructionText = styled.div`
font-family: 'Dosis', sans-serif;
font-size: 1.5rem;
font-weight: 900;
justify-self: end;
text-align: center;
${props => props.process==process[1] && `
font-size: 3rem;
transition: font-size .8s 0s ease-in-out;
`}

`;

const BeginButton = styled.button`
font-size: 2rem;
align-self: center;
justify-self: center;
font-weight: 700;
font-family: 'Dosis', sans-serif;
border: none;
padding: 10px;
background-color: #1DB954;
color: white;
&:hover{
  filter: brightness(80%);
  cursor: pointer;
}
`;
const NameInput = styled.input`
text-align: center;
width: 100%;
height: 30px;
border-radius: 10px;
border: 1px solid;
border-color: black;
`;

const LineBreak = styled.div`
position: relative;
font-size: 20px;
width: 50%;
z-index: 1;
overflow: hidden;
text-align: center;
font-family: arial;
&:after {
  position: absolute;
  top: 51%;
  overflow: hidden;
  width: 48%;
  height: 1px;
  content: '\a0';
  background-color: black;
  margin-left: 2%;
}
&:before {
  position: absolute;
  top: 51%;
  overflow: hidden;
  width: 48%;
  height: 1px;
  content: '\a0';
  background-color: black;
  margin-left: 2%;
  margin-left: -50%;
  text-align: right;
}
@media (prefers-color-scheme: dark) {
  &:before {
    background-color: white;
  }
  &:after {
    background-color: white;
  }
  color: white;
}
`;
const InputContainer = styled.div`
display: flex;
flex-direction: column;
align-items: center;
gap: 25px;
margin-bottom: 150px;
opacity: 0;
animation: ${fadeIn} ease 2s 1s;
animation-iteration-count: 1;
animation-fill-mode: forwards;
`;

const SpotifyLogin = styled.button`
margin-top: 50px;
align-self: center;
justify-self: center;
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
font-size: 2rem;
display: flex;
align-items: center;
gap: 5px;
color: black;
`

const SpotifyLogo = styled(Image)`
padding: 3px;
`;

const InputTypeContainer = styled.div`
width: 100%;
justify-content: space-between;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
font-family: Arial, Helvetica, sans-serif;
`;

const LinkSpan = styled.span`
display: flex;
flex-direction: column;
align-items: center;
width: 100%;
`;

const LinkInput = styled.input`
width: 200px;
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
color: rgb(88, 219, 219);
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
width: 200px;
text-align: center;
font-family: Arial, Helvetica, sans-serif;
border-color: ${(props) => props.hasFile==null ? 'black' : 'green'};
color: ${(props) => props.hasFile==null ? 'black' : 'green'};

&:hover {
  background-color: black;
  color: white;
}
&:active:before {
  background: -webkit-linear-gradient(top, #e3e3e3, #f9f9f9);
}
@media (prefers-color-scheme: dark) {
  border-color: ${(props) => props.hasFile==null ? 'white' : 'green'};
  color: ${(props) => props.hasFile==null ? 'white' : 'green'};
}
`;

const SubmitButton = styled.button`
font-family: Arial, Helvetica, sans-serif;
display: flex;
align-items: center;
justify-content: center;
font-weight: 900;
padding: 15px;
border: none;
border-radius: 20px;
width: 150px;
gap: 5px;
background-color:${(props)=>props.disabled?'gray':'black'};
color:${(props)=>props.disabled?'blak':'white'};
cursor:${(props)=>props.disabled?'not-allowed':'pointer'};
@media (prefers-color-scheme: dark) {
  background-color:${(props)=>props.disabled?'gray':'white'};
  color:${(props)=>props.disabled?'blak':'black'};
  cursor:${(props)=>props.disabled?'not-allowed':'pointer'};
}
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
color:white;
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
grid-template-columns: 1fr 150px 400px 1fr;
grid-template-rows: 50px 1fr; 
gap: 10px;
margin-bottom: 20px;
`;

const InfoContainer = styled.div`
grid-column: 2/3;
grid-row: 2/4;
display: flex;
flex-direction: column;
justify-content: space-between;
@media (max-width: 750px) {
  justify-content: flex-start;
  gap: 15px;
}
`;


const ArtistsCircleContainer = styled.div`
width: 100%;
font-family: Arial, Helvetica, sans-serif;
`;

const DetailsConatiner = styled.div`
color: white;
display: flex;
flex-direction: column;
align-items: center;
`;

const DetailSpan = styled.div`
font-size: 2rem;
font-family: Arial, Helvetica, sans-serif;
@media (max-width: 750px) {
  font-size: 1rem;
}
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
grid-row: 2/3;
grid-column: 2/3;
font-weight: 700;
font-family: Arial, Helvetica, sans-serif;
width: 100%;
height: 50px;
border: none;
padding: 10px;
border-radius: 5px;
background-color: #1DB954;
font-size: 1.5rem;
color: white;
&:hover{
  filter: brightness(80%);
  cursor: pointer;
}
`;

const CenterDiv = styled.div`
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
`;

const CreditTag = styled.div`
justify-self: center;
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
  'begin',
  'Scraping text from poster image',
  'Using AI to find artist names',
  'Retrieving liked songs',
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



//SPOTIFY LOGIN BUTTON LOGIC:
// {!spotifyLoggedIn && Object.values(providers).map((provider)=>(
//   <div key={provider.name}>
//       <SpotifyLogin
//       onClick={()=>signIn(provider.id, {callbackUrl: "/"})}>
//         <SpotifySpan>
//           <SpotifyLogo
//             src="/spotify-logo.png"
//             alt="Spotify logo"
//             width={25}
//             height={25}/>
//             login with {provider.name}
//         </SpotifySpan>
//       </SpotifyLogin>
//   </div>
// ))}

{/* <NameInput type="text"
  id="festival name"
  name="festival name"
  placeholder='Festival name'
  onChange={(e) => setFestName(e.target.value)}>
</NameInput> */}