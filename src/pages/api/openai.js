import { Configuration, OpenAIApi } from 'openai';
import { NextApiRequest, NextApiResponse } from "next";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler (req, res) {
  const prompt = req.query.prompt;

  console.log("calling ai to clean data");
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {"role": "system", content: setupPrompt},
      {role: "user", content: prompt}
    ],
  });
  console.log("ai parsed text, returning results");

  const result = completion.data.choices[0].message.content;

  res.status(200).json({ result });
}


const setupPrompt = "You are a super intelligent AI with complex pattern recognition capabilities, a deep understanding of OCR technology and a vast knowledge of music and musical artists. I will give you a json object that is the result of running an OCR on an image displaying musical artists at an upcoming music festival. The OCR result is probably imperfect because of the stylized fashion of the festival poster. Because of this, the data you receive may have multiple artist names joined together or fragmented individual artist names into multiple segments. There may also be general festival information such as name, location, date etc. that should be removed.  Please parse the data to find the names of all musical artists. Rejoin fragmented names and separate merged names of multiple artists when necessary. Return only an array containing the found artist names and ensure it is valid json by using only double quotes. Use the data in the following message";
