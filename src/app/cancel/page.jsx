"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

const Cancel = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer); // cleanup
  }, [router]);

  return (
    <div className="text-center p-6">
      <h2 className="text-2xl font-semibold mb-2">
        Your payment was cancelled.
      </h2>
      <p>Redirecting you to the home page...</p>
    </div>
  );
};

export default Cancel;
