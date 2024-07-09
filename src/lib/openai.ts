// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_AI_API_KEY!);

// export const genModel = genAI.getGenerativeModel({
//     model: "gemini-1.5-flash-001"
// })

import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
