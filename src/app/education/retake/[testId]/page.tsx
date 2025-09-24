
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

// This page is no longer used and will be removed.
// Redirecting to the main education page to avoid confusion.
export default function DeprecatedRetakePage() {
    const router = useRouter();
    React.useEffect(() => {
        router.replace('/education');
    }, [router]);

    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <p>Yönlendiriliyor...</p>
        </div>
    );
}
