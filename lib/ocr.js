async function getOCR (image, imageUrl, handleChangeProcess) {

    console.log("SCRAPING");

    const apiKey = process.env.NEXT_PUBLIC_OCR_API_KEY;

    if(image!=null){
      console.log("using image")
      var myHeaders = new Headers();
      myHeaders.append("apikey", apiKey);

      var formdata = new FormData();
      formdata.append("language", "eng");
      formdata.append("base64Image", image);
      formdata.append("OCREngine", "2");
      formdata.append("detectOrientation", "true");

      var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: formdata,
        redirect: 'follow'
      };

      const response = await fetch("https://api.ocr.space/parse/image", requestOptions)
      const ret = await response.text();
      const result = JSON.parse(ret).ParsedResults[0].ParsedText;
      if(result==undefined){
        console.log("bad result");
        handleChangeProcess(0);
        return;
      }
      return result;
    }

    if(imageUrl!=null){      
        console.log("using url");

        let myHeaders = new Headers();
        myHeaders.append("apikey", apiKey);

        let formdata = new FormData();
        formdata.append("url", imageUrl);
        formdata.append("OCREngine", "2");
        formdata.append("detectOrientation", "true");


        var requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: formdata,
          redirect: 'follow'
        };

        console.log(myHeaders);


        const response = await fetch("https://api.ocr.space/parse/image", requestOptions)

        const ret = await response.text();
        console.log(ret);
        if(JSON.parse(ret).ParsedResults[0]==undefined){
          console.log("bad result");
          handleChangeProcess(0);
          return;
        }
        const result = JSON.parse(ret).ParsedResults[0].ParsedText;
        return result;
      }
}

export {getOCR};