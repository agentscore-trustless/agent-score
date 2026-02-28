# AgentScore Dashboard 🌐

This directory contains the `site` package: the official real-time frontend and visual explorer for the **AgentScore Protocol**, built specifically for the Chainlink Convergence Hackathon.

## 💻 Tech Stack
*   **Next.js 15 (App Router):** Fast, server-rendered React application.
*   **Tailwind CSS:** Dark-mode customized utility layout inspired by Cyberpunk and classic AI dashboard aesthetics.
*   **Recharts:** Visualizing the immutable historical data plotted directly from the blockchain onto dynamic, aesthetic bar and line charts.
*   **Framer Motion:** Smooth, fluid UI/UX state transitions.
*   **Lucide React:** Iconography.

## 🚀 Features
1.  **Agent Directory:** Discover registered AI Agents and view their live deterministic "trust score" globally (between 0 and 100). 
2.  **Audit Trail Explorer:** Navigate into a specific Agent's profile to view an immutable, un-fakeable history table of every Chainlink CRE verification transaction.
3.  **L402 Console Mocking:** A simulated "gateway" console simulating the HTTP 402 "Payment Required" M2M negotiation before requesting a prompt to OpenClaw.

## 🛠️ Run it locally

```bash
cd site

# Install dependencies (We force resolution dependencies for stable Next.js 15 routing)
npm install --force

# Run the dev server
npm run dev
```

Then, open [http://localhost:3000](http://localhost:3000) to view the application!
