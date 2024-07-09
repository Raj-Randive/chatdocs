import { db } from "@/db";
import { openai } from "@/lib/openai";
import { pc } from "@/lib/pinecone";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  // endpoint for asking a question to a pdf file

  const body = await req.json();

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const { id: userId } = user!;

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { fileId, message } = SendMessageValidator.parse(body);

  // Find the file from our database using this fileId.
  const file = await db.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });

  if (!file) return new Response("Not Found", { status: 404 });

  // add the messages into the database
  await db.message.create({
    data: {
      text: message,
      isUserMessage: true,
      userId,
      fileId,
    },
  });

  // Step:1 Vectorize the message(question).
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GENERATIVE_AI_API_KEY,
  });

  const pineconeIndex = pc.Index("chatdocs");

  // Step-2 Search in the vector store for the most relevant PDF Page
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace: file.id,
  });

  const results = await vectorStore.similaritySearch(message, 4);

  // History of messages to get earlier asked questions!!
  const prevMessages = await db.message.findMany({
    where: {
      fileId,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 6,
  });

  // Step-3 Send it LLM to answer out question!!

  // Format the messages
  const formattedPrevMessages = prevMessages.map((msg) => ({
    role: msg.isUserMessage ? ("user" as const) : ("assistant" as const),
    content: msg.text,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    temperature: 0,
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.",
      },
      {
        role: "user",
        content: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.

              \n----------------\n

              PREVIOUS CONVERSATION:
              ${formattedPrevMessages.map((message) => {
                if (message.role === "user")
                  return `User: ${message.content}\n`;
                return `Assistant: ${message.content}\n`;
              })}

              \n----------------\n

              CONTEXT:
              ${results.map((r) => r.pageContent).join("\n\n")}

              USER INPUT: ${message}`,
      },
    ],
  });

  // const chat = genModel.startChat({
  //   generationConfig: {
  //     temperature: 0,
  //   },
  //   history: [
  //     {
  //       role: "model",
  //       parts: [
  //         {
  //           text: "Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.",
  //         },
  //       ],
  //     },
  //     {
  //       role: "user",
  //       parts: [
  //         {
  //           text: `Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format. \nIf you don't know the answer, just say that you don't know, don't try to make up an answer.

  //                             \n----------------\n

  //                             PREVIOUS CONVERSATION:
  //                             ${formattedPrevMessages.map((message) => {
  //                               if (message.role === "user")
  //                                 return `User: ${message.content}\n`;
  //                               return `model: ${message.content}\n`;
  //                             })}

  //                             \n----------------\n

  //                             CONTEXT:
  //                             ${results.map((r) => r.pageContent).join("\n\n")}

  //                             USER INPUT: ${message}`,
  //         },
  //       ],
  //     },
  //   ],
  // });

  // const response = await chat.sendMessageStream(message);

  const stream = OpenAIStream(response, {
    async onCompletion(completion) {
      await db.message.create({
        data: {
          text: completion,
          isUserMessage: false,
          fileId,
          userId,
        },
      });
    },
  });

  return new StreamingTextResponse(stream);
};
