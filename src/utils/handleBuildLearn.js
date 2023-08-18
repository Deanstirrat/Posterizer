const handleBuildExplorePlaylist = async () => {
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

        //NEW CODE STARS HERE:

        //for artist in scrapedArtists:
            //search spotify artists with api to get spotify artist id
            //add artist id to artistIDs
        //for artistID in artistIDs:
            //add top tracks of artistID to playlistData
        //Create playlist
        let artistIDs = []
        for(let artistName of artits){
            const artistData = await spotifyApi.searchArtists({q : artistName, type : "artist", market: "US", limit: 1});
            if (artistData.statusCode!=200) {
                alert("error getting spotify artist, try again");
                setProcessStatus(process[0]);
                throw new Error(`HTTP error! status: ${data.statusCode}`);
            }
            artistIDs.concat(artistData.artists.items.id);
            //can also get genres artist is known for here
                //could be used for a word cloud about fest
            //can get a popularity ranking of artist to skew tracks
        }

        setProcessStatus(process[5]);
        for(let artistID of artistIDs){
            const topTracks = await spotifyApi.getArtistTopTracks({artistId : artistID, countryId : "US"})
            if (topTracks.statusCode!=200) {
                alert("error getting artist("+ aritstID +"), try again");
                setProcessStatus(process[0]);
                throw new Error(`HTTP error! status: ${data.statusCode}`);
            }
            for(let track of topTracks.tracks) playlistData.add(track.uri);
        }

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