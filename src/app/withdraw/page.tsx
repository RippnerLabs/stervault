import WithdrawUI from "@/components/withdraw/withdraw-ui";
import { Suspense } from "react";

export default function WithdrawPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WithdrawUI />
        </Suspense>
    )
}