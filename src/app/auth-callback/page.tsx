import AuthCallback from "@/components/AuthCallback";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const Page = () => {
    const searchParams = useSearchParams();
    const origin = searchParams.get("origin");

    return (
        <Suspense fallback={
            <div className="w-full mt-24 flex justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-800" />
                    <h3 className="font-semibold text-xl">Setting up your account...</h3>
                    <p>You will be redirected automatically</p>
                </div>
            </div>
        }>
            <AuthCallback origin={origin} />
        </Suspense>
    );
};

export default Page;