async function getOCR (image, imageUrl) {

    console.log("SCRAPING");

    const apiKey = process.env.NEXT_PUBLIC_OCR_API_KEY;

    if(image!=null){
      console.log("using image")
      var myHeaders = new Headers();
      myHeaders.append("apikey", "K89038807488957");

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
      return result;
    }

    if(imageUrl!=null){      
        console.log("using url");
        var myHeaders = new Headers();
        myHeaders.append("apikey", "K89038807488957");

        var formdata = new FormData();
        formdata.append("url", imageUrl);
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
        return result;
      }
}

export {getOCR};