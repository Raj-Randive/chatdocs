"use client"
// The only Purpose of this page is to sync the logged in user and make sure they are also in database.

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { trpc } from "../_trpc/client";

const Page = () => {
    const router = useRouter();

    // Get access to the "origin=dashboard" from the url
    const searchParams = useSearchParams();
    const origin = searchParams.get("origin");

    // Checking if tRPC is working
    // const { data, isLoading } = trpc.test.useQuery()

    const { data, isLoading, error } = trpc.authCallback.useQuery(undefined, {
        retry: true,
        retryDelay: 500,
    })

    useEffect(() => {
        if (data) {
            const { success } = data
            if (success) {
                // user is synced to db
                console.log('Data fetched successfully:', data);
                router.push(origin ? `/${origin}` : '/dashboard')
            }
        }
        else if (error) {
            if (error.data?.code === 'UNAUTHORIZED') {
                router.push('/sign-in')
            }
        }

    }, [data, origin, router, error]);

    return (
        <Suspense>
            <div className="w-full mt-24 flex justify-center">
                <div className="flex flex-col items-center gap-2">

                    <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
                    <h3 className="font-semibold text-xl">Setting up your account...</h3>
                    <p>You will be redirected automatically</p>
                </div>
            </div>
        </Suspense>

    )

}

export default Page;