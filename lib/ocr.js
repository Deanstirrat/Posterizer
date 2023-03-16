async function getOCR (image=null, imageUrl=null) {

    const apiKey = process.env.NEXT_PUBLIC_OCR_API_KEY;

    if(image!=null){
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
      const result = JSON.parse(response).ParsedResults[0].ParsedText;
      return result;
    }

    if(imageUrl!=null){      
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
        console.log(result);
        return result;
      }
}

export {getOCR};