import { db } from "@/db";
import { pc } from "@/lib/pinecone";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { createUploadthing, type FileRouter } from "uploadthing/next";
// import { TaskType } from "@google/generative-ai";
 
const f = createUploadthing();

export const ourFileRouter = {
  
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {

        const {getUser} = getKindeServerSession();
        const user = await getUser();
        if(!user || !user.id) throw new Error("Unauthorized");

      return { userId: user.id };

    })
    .onUploadComplete(async ({ metadata, file }) => {

      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          // url: `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`,
          url: file.url,
          uploadStatus: "PROCESSING",
        }
      })


      // Index our file using OPENAI Embedding model and store in vector database (Pinecone).

      try {

        // fetch request to the file url
        const response = await fetch(`https://utfs.io/f/${file.key}` )
        console.log("1");
        
        const blob = await response.blob()
        console.log("2");
        
        const loader = new PDFLoader(blob)
        console.log("3");
        
        const pageLevelDocs = await loader.load()
        console.log("4");
        
        // To check if you are using a PRO or FREE Plan.
        const pagesAmt = pageLevelDocs.length
        console.log("5");

        console.log("creating pinecone");
        
        // Vectorize and Index the entire document
        const pineconeIndex = pc.Index("chatdocs") // name on pinecone created index
        
        // const embeddings = new OpenAIEmbeddings({
          //   openAIApiKey: process.env.LAMA_API_KEY
          // })
          
        const embeddings = new GoogleGenerativeAIEmbeddings({
          apiKey: process.env.GENERATIVE_AI_API_KEY
        });
          
        console.log("Embeddings done");
        await PineconeStore.fromDocuments(
          pageLevelDocs, 
          embeddings, 
          {
            pineconeIndex,
            namespace: createdFile.id
          }
        )

        // update the file to a updated "SUCCESS" state
        await db.file.update({
          data:{
            uploadStatus: "SUCCESS"
          },
          where: {
            id: createdFile.id
          }
        })

      } 
      catch (error: any) {
        console.log("MADARChood Error ARARA****************************************************", error.message);
        
        await db.file.update({
          data:{
            uploadStatus: "FAILED"
          },
          where: {
            id: createdFile.id
          }
        })
      }
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;