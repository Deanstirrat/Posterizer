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
      {"role": "system", content: taskPrompt},
      {role: "user", content: prompt}
    ],
  });
  console.log("ai parsed text, returning results");

  const result = completion.data.choices[0].message.content;

  res.status(200).json({ result });
}


const setupPrompt = "You are a super intelligent AI with complex pattern recognition capabilities, a deep understanding of OCR technology and a vast knowledge of music and musical artists. You do exactly what is asked of you in the following instructions.";
const taskPrompt = "you will be given raw text that is the result of running an OCR on an image displaying musical artists at an upcoming music festival. The OCR result is imperfect because of the stylized fashion of the festival poster. Because of this, the data you receive may have the following errors: 1) Multiple artist names joined together 2) Artist names fragmented and mixed in with other names 3) Missing characters or incorrect characters in artist names 4) general festival information such as name, location, date etc. that should be removed.  Please parse the data to find the names of all musical artists and correct any errors. Rejoin fragmented names and separate merged names of multiple artists when necessary. Respond with a raw json array containing the found artists. Do not preface the array or add any comments or code. Use the data in the following message:"