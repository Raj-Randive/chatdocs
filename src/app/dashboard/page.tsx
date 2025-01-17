import Dashboard from "@/components/Dashboard";
import { db } from "@/db";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";


const Page = async () => {

    // Get the current login session for the user!
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    // console.log(user);

    if (!user || !user.id) redirect("/auth-callback?origin=dashboard")

    const dbUser = await db.user.findFirst({
        where: {
            id: user.id
        }
    })

    if (!dbUser) redirect("/auth-callback?origin=dashboard")

    const subscriptionPlan = await getUserSubscriptionPlan();

    return (
        <>
            <Dashboard subscriptionPlan={subscriptionPlan} />
        </>
    )
}

export default Page;