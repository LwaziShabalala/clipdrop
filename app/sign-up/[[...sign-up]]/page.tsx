import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center px-4">
            <SignUp
                appearance={{
                    variables: {
                        colorPrimary: "#ff3d6e",
                        colorBackground: "#141417",
                        colorForeground: "#f2f2f0",
                        colorMutedForeground: "#8a8a92",
                        colorInput: "#0a0a0c",
                        colorInputForeground: "#f2f2f0",
                        borderRadius: "0.75rem",
                    },
                }}
            />
        </main>
    );
}