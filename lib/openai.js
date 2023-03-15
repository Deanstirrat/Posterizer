import { Configuration, OpenAIApi } from 'openai';
const configuration = new Configuration({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const getFromAI = async (inputPrompt) => {
  console.log("calling ai to clean data");
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{role: "user", content: inputPrompt}],
  });
  console.log("ai parsed text, returning results");
  return completion.data.choices[0].message.content;
}

export { getFromAI };