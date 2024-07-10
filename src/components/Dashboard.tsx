"use client"

import { trpc } from "@/app/_trpc/client";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { format } from "date-fns";
import { Ghost, Loader2, MessageSquare, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Skeleton from "react-loading-skeleton";
import UploadButton from "./UploadButton";
import { Button } from "./ui/button";

interface PageProps {
    subscriptionPlan: Awaited<ReturnType<typeof getUserSubscriptionPlan>>
}

const Dashboard = ({ subscriptionPlan }: PageProps) => {
    const [currentlyDeletingFile, setCurrentlyDeletingFile] = useState<string | null>(null)

    const utils = trpc.useUtils()

    const { data: files, isLoading } = trpc.getUserFiles.useQuery();
    const { mutate: deleteFile, isSuccess, } = trpc.deleteFile.useMutation({
        onSuccess: () => {
            utils.getUserFiles.invalidate();
        },
        // When processing set its value to id
        onMutate({ id }) {
            setCurrentlyDeletingFile(id)
        },
        // When processing is done, then set the loading to null
        onSettled() {
            setCurrentlyDeletingFile(null)
        }

    });

    // useEffect(() => {
    //     if (isSuccess) {
    //         utils.getUserFiles.invalidate();
    //     }
    // }, [isSuccess, utils])

    return (
        <main className="mx-auto max-w-7xl md:p-10">

            <div className="mt-8 flex flex-col items-start justify-between gap-8 border-b border-gray-200 pb-5 md:flex-row sm:items-center sm:gap-0">

                <h1 className="mb-3 font-bold text-5xl text-gray-900">
                    My Files
                </h1>

                <UploadButton isSubscribed={subscriptionPlan.isSubscribed} />

            </div>

            {/* Display all user files */}
            {files && files?.length !== 0 ? (

                <ul className="mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3">

                    {files.sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                    ).map((eachFile) => (

                        <li key={eachFile.id} className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg">

                            <Link href={`/dashboard/${eachFile.id}`} className="flex flex-col gap-2 ">

                                <div className="pt-6 px-6 flex w-full items-center justify-between space-x-6">

                                    {/* Decoration div */}
                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />

                                    <div className="flex-1 truncate">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="truncate text-lg font-medium">
                                                {eachFile.name}
                                            </h3>
                                        </div>
                                    </div>

                                </div>

                            </Link>

                            <div className="px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500">

                                <div className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    {format(new Date(eachFile.createdAt), "MMM yyyy")}
                                </div>

                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" />mocked
                                </div>

                                {/* Delete-button */}

                                <Button
                                    onClick={() => deleteFile({ id: eachFile.id })}
                                    size="sm"
                                    className="w-full"
                                    variant="destructive">

                                    {/* Conditionally render the icons for loading */}

                                    {currentlyDeletingFile === eachFile.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash className="h-4 w-4" />
                                    )}


                                </Button>

                            </div>


                        </li>

                    ))}

                </ul>

            ) : isLoading ? (

                <Skeleton height={80} className="my-2" count={4} />

            ) : (

                <div className="mt-16 flex flex-col items-center gap-2">
                    <Ghost className="h-8 w-8 text-zinc-800" />
                    <h3 className="font-semibold text-xl">Preety empty around here</h3>
                    <p>Let&apos; upload your first PDF.</p>
                </div>

            )}

        </main>
    )
}

export default Dashboard;