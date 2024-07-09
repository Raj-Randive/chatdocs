import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// For creating spacing for left and right side across all the pages

const MaxWidthWrapper = ({
    className,
    children
}: {
    className?: string,
    children: ReactNode
}) => {

    return (
        <div className={cn('mx-auto w-full max-w-screen-xl px-2.5 md:px-20', className)} >
            {children}
        </div>
    )
}

export default MaxWidthWrapper;