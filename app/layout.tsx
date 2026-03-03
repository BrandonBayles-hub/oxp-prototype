import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/app-shell/sidebar";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { EntrataTopNav } from "@/components/app-shell/entrata-top-nav";
import { SetupProvider } from "@/lib/setup-context";
import { VaultProvider } from "@/lib/vault-context";
import { AgentsProvider } from "@/lib/agents-context";
import { WorkflowsProvider } from "@/lib/workflows-context";
import { VoiceProvider } from "@/lib/voice-context";
import { EscalationsProvider } from "@/lib/escalations-context";
import { WorkforceProvider } from "@/lib/workforce-context";
import { ToolsProvider } from "@/lib/tools-context";
import { RoleProvider } from "@/lib/role-context";
import { ContractProvider } from "@/lib/contract-context";

export const metadata: Metadata = {
  title: "OXP Studio / Entrata Agent Platform",
  description: "AI-native multifamily platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fallback so layout and typography apply even if main CSS is delayed or blocked */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root{--background:0 0% 100%;--foreground:0 0% 3.9%;--muted:0 0% 96.1%;--muted-foreground:0 0% 45.1%;--border:0 0% 89.8%;--card:0 0% 100%;--card-foreground:0 0% 3.9%;--primary:0 0% 9%;--primary-foreground:0 0% 98%;--radius:0.5rem;--sidebar:0 0% 98%;--sidebar-border:0 0% 89.8%;}
          *{box-sizing:border-box;}
          body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:hsl(var(--background));color:hsl(var(--foreground));-webkit-font-smoothing:antialiased;}
          .flex{display:flex;}
          .flex-col{flex-direction:column;}
          .hidden{display:none !important;}
          .min-h-screen,.h-screen{min-height:100vh;}
          .h-screen{height:100vh;}
          .flex-1{flex:1 1 0%;}
          .overflow-hidden{overflow:hidden;}
          .overflow-y-auto{overflow-y:auto;}
          .shrink-0{flex-shrink:0;}
          .select-none{user-select:none;}
          .w-64{width:16rem;}
          .border-r{border-right-width:1px;}
          .border-border{border-color:hsl(var(--border));}
          aside{background:hsl(var(--sidebar));border-color:hsl(var(--sidebar-border));}
          @media (min-width:1024px){.lg\\:block{display:block !important;} .lg\\:pt-0{padding-top:0;}}
          .pt-16{padding-top:4rem;}
          main{background:hsl(var(--muted) / 0.5);}
          .page-content{padding:1.5rem 1rem;}
          @media (min-width:640px){.page-content{padding-left:1.5rem;padding-right:1.5rem;}}
          @media (min-width:1024px){.page-content{padding-left:2.5rem;padding-right:2.5rem;}}
        ` }} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased font-sans">
        <RoleProvider>
        <ContractProvider>
        <SetupProvider>
          <VaultProvider>
            <AgentsProvider>
              <WorkforceProvider>
                <WorkflowsProvider>
                  <VoiceProvider>
                    <EscalationsProvider>
                    <ToolsProvider>
                    <div className="flex h-screen flex-col overflow-hidden">
                      <EntrataTopNav />
                      <MobileNav />
                      <div className="flex flex-1 overflow-hidden">
                        <div className="hidden shrink-0 lg:block">
                          <Sidebar />
                        </div>
                        <main className="flex-1 overflow-y-auto bg-muted/50 pt-16 lg:pt-0">
                          <div className="page-content px-4 py-6 sm:px-6 lg:px-10">
                            {children}
                          </div>
                        </main>
                      </div>
                    </div>
                    </ToolsProvider>
                    </EscalationsProvider>
                  </VoiceProvider>
                </WorkflowsProvider>
              </WorkforceProvider>
            </AgentsProvider>
          </VaultProvider>
        </SetupProvider>
        </ContractProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
