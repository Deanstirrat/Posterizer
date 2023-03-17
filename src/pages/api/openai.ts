// import { Configuration, OpenAIApi } from 'openai';

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const openai = new OpenAIApi(configuration);

// export default async function handler (req, res) {
//   try{
//     const prompt = req.query.prompt;

//     const completion = await openai.createChatCompletion({
//       model: "gpt-3.5-turbo",
//       temperature: 0.5,
//       max_tokens: 700,
//       messages: [
//         {"role": "system", content: setupPrompt+taskPrompt},
//         {"role": "user", content: prompt}
//       ],
//     });

//     const result = completion.data.choices[0].message.content;

//     res.status(200).json({ result });
//   } catch (reason) {
//     const message = reason instanceof Error ? reason.message : reason;
//     console.log("API failure:", message);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// }


// const setupPrompt = "You are a super intelligent AI with complex pattern recognition capabilities, a deep understanding of OCR technology and a vast knowledge of music and musical artists. You do exactly what is asked of you. ";
// const taskPrompt = "you will be given raw text that is the result of running an OCR on an image displaying musical artists at an upcoming music festival. The OCR result is imperfect because of the stylized fashion of the festival poster. Because of this, the data you receive may have the following errors: 1) Multiple artist names joined together 2) Artist names fragmented and mixed in with other names 3) Missing characters or incorrect characters in artist names 4) general festival information such as name, location, date etc. that should be removed.  Please parse the data to find the names of all musical artists and correct any errors. Rejoin fragmented names and separate merged names of multiple artists when necessary. Respond with a text in the format of a valid json array containing the found artists. Do not preface the array or add any comments or code. Use the data in the following message:"

import { OpenAIStream, OpenAIStreamPayload } from "../../utils/openAIStream";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing env var from OpenAI");
}

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  const { prompt } = (await req.json()) as {
    prompt?: string;
  };

  if (!prompt) {
    return new Response("No prompt in the request", { status: 400 });
  }

  const payload: OpenAIStreamPayload = {
    model: "gpt-3.5-turbo",
      messages: [
        {role: "system", content: setupPrompt+taskPrompt},
        {role: "user", content: prompt}
      ],
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 700,
    stream: true,
    n: 1,
  };

  const stream = await OpenAIStream(payload);
  return new Response(stream);
};

export default handler;

const setupPrompt = "You are a super intelligent AI with complex pattern recognition capabilities, a deep understanding of OCR technology and a vast knowledge of music and musical artists. You do exactly what is asked of you. ";
const taskPrompt = "you will be given raw text that is the result of running an OCR on an image displaying musical artists at an upcoming music festival. The OCR result is imperfect because of the stylized fashion of the festival poster. Because of this, the data you receive may have the following errors: 1) Multiple artist names joined together 2) Artist names fragmented and mixed in with other names 3) Missing characters or incorrect characters in artist names 4) general festival information such as name, location, date etc. that should be removed.  Please parse the data to find the names of all musical artists and correct any errors. Rejoin fragmented names and separate merged names of multiple artists when necessary. Respond with only a comma seperated list of the found artists. Do not preface the output or add any comments or code. Use the data in the following message:"