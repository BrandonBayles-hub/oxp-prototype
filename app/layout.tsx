import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell/app-shell";
import { SetupProvider } from "@/lib/setup-context";
import { VaultProvider } from "@/lib/vault-context";
import { AgentsProvider } from "@/lib/agents-context";
import { WorkflowsProvider } from "@/lib/workflows-context";
import { AgentBuilderProvider } from "@/lib/agent-builder-context";
import { VoiceProvider } from "@/lib/voice-context";
import { EscalationsProvider } from "@/lib/escalations-context";
import { WorkforceProvider } from "@/lib/workforce-context";
import { ToolsProvider } from "@/lib/tools-context";
import { GovernanceProvider } from "@/lib/governance-context";
import { RoleProvider } from "@/lib/role-context";
import { FeedbackProvider } from "@/lib/feedback-context";
import { ConversationsProvider } from "@/lib/conversations-context";
import { NotificationsProvider } from "@/lib/notifications-context";
import { FeatureEntitlementsProvider } from "@/lib/feature-entitlements-context";
import { PermissionsProvider } from "@/lib/permissions-context";
import { PlaybooksProvider } from "@/lib/playbooks-context";

import { ClickToCallDemoProvider } from "@/lib/click-to-call-demo-context";
import { ConversationsDemoProvider } from "@/lib/conversations-demo-context";
import { R1ReleaseProvider } from "@/lib/r1-release-context";
import { R1_2ReleaseProvider } from "@/lib/r1-2-release-context";

import { EliEmailsProvider } from "@/lib/eli-emails-context";
import { EliPlusSetupProvider } from "@/lib/eli-plus-setup-context";
import { RoadmapProvider } from "@/lib/roadmap-context";

export const metadata: Metadata = {
  title: "OXP Studio",
  description: "AI-native multifamily platform POC",
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
          .w-56{width:14rem;}
          .border-r{border-right-width:1px;}
          .border-border{border-color:hsl(var(--border));}
          aside{background:hsl(var(--sidebar));border-color:hsl(var(--sidebar-border));}
          @media (min-width:1024px){.lg\\:block{display:block !important;} .lg\\:pt-0{padding-top:0;}}
          .pt-16{padding-top:4rem;}
          main{background:hsl(var(--muted) / 0.5);}
          .page-content{padding:4.5rem 1.5rem 0.75rem;}
          @media (min-width:640px){.page-content{padding-left:2rem;padding-right:2rem;}}
          @media (min-width:1024px){.page-content{padding-left:2.5rem;padding-right:2.5rem;}}
        ` }} />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/nohemi" rel="stylesheet" />
        <link
          href="https://assets.calendly.com/assets/external/widget.css"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased font-sans">
        <Script
          src="https://assets.calendly.com/assets/external/widget.js"
          strategy="afterInteractive"
        />
        <RoadmapProvider>
        <EliPlusSetupProvider>
        <ClickToCallDemoProvider>
        <R1ReleaseProvider>
        <R1_2ReleaseProvider>
        <RoleProvider>
        <PermissionsProvider>
        <FeatureEntitlementsProvider>
        <SetupProvider>
          <VaultProvider>
            <AgentsProvider>
              <WorkforceProvider>
                <WorkflowsProvider>
                <AgentBuilderProvider>
                  <VoiceProvider>
                    <EscalationsProvider>
                    <ConversationsProvider>
                    <ConversationsDemoProvider>
                    <ToolsProvider>
                    <GovernanceProvider>
                    <FeedbackProvider>
                    <PlaybooksProvider>
                    <NotificationsProvider>
                    <EliEmailsProvider>
                    <AppShell>{children}</AppShell>
                    </EliEmailsProvider>
                    </NotificationsProvider>
                    </PlaybooksProvider>
                    </FeedbackProvider>
                    </GovernanceProvider>
                    </ToolsProvider>
                    </ConversationsDemoProvider>
                    </ConversationsProvider>
                    </EscalationsProvider>
                  </VoiceProvider>
                </AgentBuilderProvider>
                </WorkflowsProvider>
              </WorkforceProvider>
            </AgentsProvider>
          </VaultProvider>
        </SetupProvider>
        </FeatureEntitlementsProvider>
        </PermissionsProvider>
        </RoleProvider>
        </R1_2ReleaseProvider>
        </R1ReleaseProvider>
        </ClickToCallDemoProvider>
        </EliPlusSetupProvider>
        </RoadmapProvider>
      </body>
    </html>
  );
}
