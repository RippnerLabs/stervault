import DepositTokensUI from "@/components/deposit-tokens/deposit-tokens-ui";
import { Suspense } from "react";

export default function DepositTokensPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DepositTokensUI />
        </Suspense>
    )
}