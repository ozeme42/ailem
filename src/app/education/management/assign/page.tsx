
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated. Redirecting to the management page.
export default function DeprecatedAssignPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/education/management');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Yönlendiriliyor...</p>
    </div>
  );
}
