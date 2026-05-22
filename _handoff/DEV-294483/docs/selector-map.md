# Selector Map — DEV-294483: Post Recurring Charges

| Element name | Selector | Source |
|---|---|---|
| Post Recurring Charges (roster row) | `text: "Post Recurring Charges"` | agents-context.tsx line ~33 (agent id 33) |
| L3 badge in flyout | `text: "L3 · Processing at Scale"` | l3-agent-flyout.tsx line 484 |
| Flyout agent name heading | `role: heading, name: "Post Recurring Charges"` | l3-agent-flyout.tsx line 482 `<h1>` |
| Watch Agent Walkthrough button | `text: "Watch Agent Walkthrough"` | l3-agent-flyout.tsx line 530 |
| Navigate to Accounting link | `text: "Navigate to Accounting in Entrata"` | l3-agent-flyout.tsx line 542 (dynamic from config.module) |
| Property Configuration heading | `text: "Property Configuration"` | l3-agent-flyout.tsx line 549 `<h3>` |
| Search input | `selector: "input[placeholder='Search properties…']"` | l3-agent-flyout.tsx line 561 |
| Harvest Peak Capital (property row) | `text: "Harvest Peak Capital"` | l3-agent-flyout.tsx line 364 (L3_PROPERTIES[0]) |
| Configure button (first) | `text: "Configure"` | l3-agent-flyout.tsx line 616 |
| Turn on all button | `text: "Turn on all"` | l3-agent-flyout.tsx line 652 |
| All Properties heading | `text: "All Properties"` | l3-agent-flyout.tsx line 638 |
| Turn on confirmation dialog title | `text: "Turn on Post Recurring Charges?"` | l3-agent-flyout.tsx line 661 |
| No, cancel button | `text: "No, cancel"` | l3-agent-flyout.tsx line 667 |
| Back to all properties link | `text: "Back to all properties"` | l3-agent-flyout.tsx line 758 |
| Property name heading (detail) | `text: "Harvest Peak Capital"` | l3-agent-flyout.tsx line 763 |
| Recurring Charge Posting group | `text: "Recurring Charge Posting"` | l3-agent-flyout.tsx line 56 (config) |
| Auto post day label | `text: "What day do you want charges to auto post each month?"` | l3-agent-flyout.tsx line 63 |
| Day select dropdown | `selector: "select"` | l3-agent-flyout.tsx line 929-937 (SettingFieldRenderer) |
| Derived Settings heading | `text: "Derived Settings (auto-configured)"` | l3-agent-flyout.tsx line 867 `<h4>` |
| Post charges through day value | `text: "31"` | l3-agent-flyout.tsx line 873 |
| Save Changes button | `text: "Save Changes"` | l3-agent-flyout.tsx line 777 |
| Agent/Manual toggle | `selector: "button.rounded-full"` | l3-agent-flyout.tsx line 803-815 |
