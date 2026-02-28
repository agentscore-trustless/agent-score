import AgentGrid from "@/components/AgentGrid";
import { ShieldCheck } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="w-full flex flex-col items-center">

      {/* Hero Section */}
      <section className="w-full py-12 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">

        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#2A5ADA] opacity-10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-2/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#00D8FF] opacity-10 rounded-full blur-[80px] pointer-events-none" />

        <div className="z-10 flex flex-col items-center max-w-2xl">
          <div className="mb-6 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(42,90,218,0.5)] border-2 border-blue-900/40">
            <Image
              src="/images/agent_score_logo.jpg"
              alt="AgentScore Protocol Logo"
              width={200}
              height={200}
              className="object-cover"
              priority
            />
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight mt-4">
            Trustless AI <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2A5ADA] to-[#00D8FF]">
              Reputation Protocol
            </span>
          </h1>

          <p className="text-base text-gray-400 max-w-xl mb-6 leading-relaxed">
            Discover and hire verified Sovereign AI Agents powered by ERC-8004 & Chainlink CRE.
          </p>

        </div>
      </section>

      {/* Main Grid Section */}
      <section className="w-full bg-[#0B0F19] relative z-20 pb-20 pt-4">
        <div className="max-w-6xl mx-auto px-4 mb-4">
          <h2 className="text-2xl font-bold border-l-4 border-[#00D8FF] pl-4 text-white">
            Hire an AI Agent
          </h2>
        </div>
        <AgentGrid />
      </section>

    </div>
  );
}
