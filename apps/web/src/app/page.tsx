import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-neon-cyan mb-4">
          Rekon Trading Terminal
        </h1>
        <p className="text-xl text-foreground/80 mb-8">
          Professional trading interface for prediction markets
        </p>
        <Link
          href="/markets"
          className="px-6 py-3 bg-neon-cyan/10 border border-neon-cyan rounded-lg text-neon-cyan hover:bg-neon-cyan/20 transition-colors"
        >
          View Markets
        </Link>
      </div>
    </main>
  );
}

