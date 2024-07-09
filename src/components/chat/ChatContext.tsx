import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { useMutation } from "@tanstack/react-query";
import { ReactNode, createContext, useRef, useState } from "react";
import { useToast } from "../ui/use-toast";

type StreamResponse = {
    addMessage: () => void,
    message: string,
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void,
    isLoading: boolean
}

export const ChatContext = createContext<StreamResponse>({
    addMessage: () => { },
    message: "",
    handleInputChange: () => { },
    isLoading: false
})

interface Props {
    fileId: string
    children: ReactNode
}

export const ChatContextProvider = ({ fileId, children }: Props) => {

    const [message, setMessage] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const backupMessage = useRef("");

    const utils = trpc.useUtils()

    const { toast } = useToast();

    // Mutation to send the messages to our API endpoint

    const { mutate: sendMessage } = useMutation({
        mutationFn: async ({ message }: { message: string }) => {
            const response = await fetch("/api/message", {
                method: "POST",
                body: JSON.stringify({
                    fileId,
                    message
                })
            })

            if (!response.ok) {
                throw new Error("Failed to send message")
            }
            return response.body;
        },

        // Optimistic Updates
        onMutate: async ({ message }) => {

            backupMessage.current = message;
            setMessage("");

            // Step-1: Cancel any outgoing messages. So they don't overwrite our optimistic updates
            await utils.getFileMessages.cancel()

            // Step-2: Snapshot the previous value we have
            const previousMessages = utils.getFileMessages.getInfiniteData();

            // Step-3: Optimistically insert the new message right away as we send it.
            utils.getFileMessages.setInfiniteData(
                { fileId, limit: INFINITE_QUERY_LIMIT },
                (oldData) => {
                    if (!oldData) {
                        return {
                            pages: [],
                            pageParams: []
                        }
                    }

                    // 1A: Cloning the old pages
                    let newPages = [...oldData.pages]

                    let latestPage = newPages[0]!

                    // This code is putting our message immediately into the page, moving the other previous messages slide upwards.
                    latestPage.messages = [
                        {
                            createdAt: new Date().toISOString(),
                            id: crypto.randomUUID(),
                            text: message,
                            isUserMessage: true

                        },
                        ...latestPage.messages
                    ]

                    newPages[0] = latestPage

                    return {
                        ...oldData,
                        pages: newPages,

                    }
                }
            )

            // Setting the loading state to true after we are done with all the insertions into the page. 
            setIsLoading(true)

            return {
                previousMessages: previousMessages?.pages.flatMap((page) => page.messages) ?? []
            }
        },

        // Show the Real Time Streaming-Response of the AI
        onSuccess: async (stream) => {
            setIsLoading(false)

            if (!stream) {
                return toast({
                    title: "Ther was a problem sending this message",
                    description: "Please refresh this page and try again",
                    variant: "destructive"
                })
            }

            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let done = false;

            // Accumulated Response
            let accResponse = "";

            while (!done) {
                const { value, done: doneReading } = await reader.read()

                done = doneReading;
                const chunkValue = decoder.decode(value);

                accResponse += chunkValue;

                // append the chunk to the actual message

                utils.getFileMessages.setInfiniteData(
                    { fileId, limit: INFINITE_QUERY_LIMIT },
                    (oldData) => {
                        if (!oldData) {
                            return {
                                pages: [],
                                pageParams: []
                            }
                        }

                        let isAiResponseCreated = oldData.pages.some((page) => page.messages.some((message) => message.id === "ai-response")
                        )

                        let updatedPages = oldData.pages.map((page) => {

                            if (page === oldData.pages[0]) {
                                let updatedMessages;

                                if (!isAiResponseCreated) {
                                    updatedMessages = [
                                        {
                                            createdAt: new Date().toISOString(),
                                            id: "ai-response",
                                            text: accResponse,
                                            isUserMessage: false
                                        },
                                        ...page.messages
                                    ]
                                }
                                else {
                                    // Already an AI Response. In that case just append to the existing response.
                                    updatedMessages = page.messages.map((message) => {
                                        if (message.id === "ai-response") {
                                            return {
                                                ...message,
                                                text: accResponse
                                            }
                                        }
                                        return message
                                    })
                                }

                                return {
                                    ...page,
                                    messages: updatedMessages
                                }

                            }

                            return page;
                        })

                        return {
                            ...oldData,
                            pages: updatedPages
                        }
                    }
                )
            }
        },

        onError: (_, __, context) => {
            setMessage(backupMessage.current)
            utils.getFileMessages.setData(
                { fileId },
                { messages: context?.previousMessages ?? [] }
            )
        },

        onSettled: async () => {
            setIsLoading(false)

            await utils.getFileMessages.invalidate({ fileId })
        }

    })

    const addMessage = () => sendMessage({ message })
    const handleInputChange = (eve: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(eve.target.value)
    }

    return (

        <ChatContext.Provider value={{
            addMessage,
            message,
            handleInputChange,
            isLoading
        }}>
            {children}

        </ChatContext.Provider>
    )


} 