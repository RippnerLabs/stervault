import BorrowUI from "@/components/borrow/borrow-ui";
import { Suspense } from "react";

export default function BorrowPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <BorrowUI />
        </Suspense>
    )
}