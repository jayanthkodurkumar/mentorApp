import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md p-8 bg-background rounded-lg shadow-lg">
        <h1 className="text-2xl font-semibold mb-6 text-center"></h1>
        <SignUp />
      </div>
    </div>
  );
}
