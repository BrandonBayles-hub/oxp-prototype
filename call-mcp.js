const { spawn } = require('child_process');

// Path to the MCP server executable
const serverPath = '/Users/court.white/.cursor/projects/Users-court-white-OXP-Studio-oxp-prototype/mcps/plugin-atlassian-atlassian/index.js';

const mcpServer = spawn('node', [serverPath], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'inherit']
});

const req = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "createJiraIssue",
    arguments: {
      cloudId: "entrata.atlassian.net",
      projectKey: "DEV",
      issueTypeName: "Epic",
      parent: "DEV-270377",
      summary: "Trainings & SOP | Activity Tab",
      description: `### User Story
As a Property Manager, I need to see a consolidated activity feed of all changes, approvals, and workforce acknowledgments within the document vault so that I can easily track compliance and document status.
As a Compliance Officer, I need to be able to export the activity log to a CSV format so that I can provide an audit trail during compliance reviews.

### FE Doc - Why
To maintain regulatory compliance and have a clear audit trail, organizations need to track when documents are added, updated, approved, and acknowledged by the workforce. Without a centralized activity feed with robust filtering and export capabilities, tracking down specific document changes or proof of acknowledgment is manual and error-prone. This feature provides a legally sufficient, non-repudiable audit trail for document management and team compliance.

### FE Doc - Who
Which files/components are affected:
| Surface | File | Component |
| --- | --- | --- |
| Vault Context | \`lib/vault-context.tsx\` | \`VaultProvider\` |
| Trainings & SOP Page | \`app/trainings-sop/page.tsx\` | \`TrainingsSopContent\` (Activity Tab) |
| Document Detail | \`app/trainings-sop/[id]/TrainingsSopDetailClient.tsx\` | \`TrainingsSopDetailClient\` |

Impacts Property Managers, Compliance Officers, and Regional Managers. Downstream views include the CSV export used by auditors.

### FE Doc - Before
Current state of the implementation:
Previously, there was an \`activityLog\` array tracking actions like document creation and approval. The feed was a simple list UI (\`<ul>\`), and human acknowledgments of compliance documents did not populate the activity log. Document label additions/removals and document linkings were not tracked. There was no CSV export.

### FE Doc - After
Full production requirements broken into numbered subsections. Include:
1. **Data Model & Logging Updates:**
   - Extend \`VaultProvider\`'s \`addWorkforceAck\` to log a "Workforce acknowledgment" action to \`activityLog\`.
   - Add activity logging for adding/removing document labels.
   - Add activity logging for linking/unlinking related documents.
2. **UI Changes (Activity Tab):**
   - Refactor the Activity feed from a list format into a structured table containing: Date, Action, User, Document, Type, Scope.
   - Introduce filters for Activity Action, Date Range, and a Text Search input.
   - Display a badge for Scope (Company, Owner, Property) for related documents in the table.
3. **Export Functionality:**
   - Add an "Export CSV" button that generates and downloads a CSV of the currently filtered \`activityLog\` with columns: Date, Action, Performed By, Document, Details.

### FE Doc - NOT Included
- True e-signatures (re-authentication prompts with passwords/PINs) for document approvals or acknowledgments (system logged approvals are legally sufficient for now).
- Automated recertification or tracking of expiring compliance training (only tracking of the document's \`nextReviewDate\` exists).

### FE Doc - New Permissions
None are needed. The Activity Tab relies on the user's existing vault visibility permissions.

### FE Doc - Settings
The \`activityLog\` state is persisted via local storage (\`janet-poc-vault-activity\`). No core type shape changes were strictly necessary to \`VaultActivityEntry\`, but how it is populated was expanded.

### FE Doc - FAQs
1. **Can an auditor see who acknowledged an SOP?**
   Yes, workforce acknowledgments now push an entry into the Activity Feed with the user's name, action, and timestamp.
2. **Can the activity feed be filtered to just show approvals?**
   Yes, there is an "Action" filter dropdown.
3. **Does the CSV export respect the filters?**
   Yes, the export will only include rows that match the currently applied text search and dropdown filters.

### Acceptance Criteria
- [ ] Users can navigate to the Activity Tab on the Trainings & SOP page.
- [ ] The Activity Feed displays as a structured data table with columns for Date, Action, User, Document, Type, and Scope.
- [ ] When a user acknowledges a document, an entry is added to the Activity Feed.
- [ ] When labels are added or removed, or documents are linked/unlinked, the actions appear in the feed.
- [ ] The feed can be filtered by Action type, Date range, and keyword search.
- [ ] Clicking "Export CSV" downloads a properly formatted CSV file containing the currently filtered log data.`,
      additional_fields: {
        components: [{ name: "OXP-Web" }]
      }
    }
  }
};

// Initialize protocol by sending init request first
const initReq = {
  jsonrpc: "2.0",
  id: 0,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0.0" }
  }
};

let initialized = false;

mcpServer.stdout.on('data', (data) => {
  const responses = data.toString().split('\n').filter(Boolean);
  for (const raw of responses) {
    const res = JSON.parse(raw);
    console.log("RECV:", res);
    
    if (res.id === 0) {
      // Send initialized notification
      mcpServer.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + '\n');
      // Send actual request
      mcpServer.stdin.write(JSON.stringify(req) + '\n');
    }
    
    if (res.id === 1) {
      mcpServer.kill();
      process.exit(0);
    }
  }
});

mcpServer.stdin.write(JSON.stringify(initReq) + '\n');
