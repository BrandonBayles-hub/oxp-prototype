**PLEASE REVIEW THE FOLLOWING NOTICE CAREFULLY**

**THIS TEMPLATE WAS CREATED BY A GENERAL PURPOSE LARGE LANGUAGE MODEL FOR INFORMATIONAL PURPOSES ONLY AND IS NOT LEGAL ADVICE. This template is intended to serve as a starting point for organizations developing their own standard operating procedures and should not be relied upon as a substitute for consultation with qualified legal counsel. This template may not address all legal requirements applicable to your organization. Use of this template is at your own risk. Entrata shall not be liable for any damages, losses, or other consequences arising from its use or adaptation.**

**Before using or adapting this template, you should conduct a thorough review of your organization's practices and policies, assess all applicable legal and regulatory requirements, and consult with legal counsel to ensure compliance with all relevant laws. This template should be customized to accurately reflect your organization's actual practices. While brackets are included for ease of reference, that does not mean that is the only portion of this template that should be revised.**

# **Maintenance Request Triage & Dispatch**

**\[Company Name\]**

**Effective Date: \[Date\]**

## **1\. Purpose**

This SOP defines the procedures for receiving, triaging, dispatching, and completing maintenance requests. It ensures consistent response times, proper prioritization, thorough documentation, and compliance with habitability obligations. This is the primary operational SOP for the Maintenance AI agent and maintenance staff.

## **2\. Scope & Applicability**

Applies to: All maintenance staff, maintenance supervisors, property managers, AI agents handling maintenance requests, and approved vendors.

Properties: All managed properties.

Regulatory framework:

* State habitability requirements (implied warranty of habitability)  
* HUD physical standards (for HUD-assisted properties)  
* Local building and housing codes  
* Fair Housing Act (no discriminatory delay or denial of maintenance)  
* Lease obligations for maintenance and repair

## **3\. Request Channels**

Residents can submit maintenance requests through:

* Entrata resident portal (preferred — creates work order automatically)  
* AI agent (chat, SMS, voice) — agent creates the work order in Entrata  
* Phone call to the leasing/management office  
* In-person at the leasing office  
  Email (if configured)

All requests made in person, regardless of channel, must result in a work order created in Entrata within 15 minutes of receipt during business hours.

## **4\. Triage — Priority Classification**

Every maintenance request is classified into one of four priority levels:

### **4.1 Emergency (Response: 30 minutes)**

Definition: Conditions that pose an immediate threat to life, health, safety, or significant property damage.

Examples:

* Fire or fire damage  
* Gas leak or gas odor  
* Flooding or active major water leak  
* Sewage backup  
* No heat (when outdoor temperature is below 50°F / 10°C)  
* No electricity (entire unit)  
* Carbon monoxide detector alarm  
* Structural damage (collapse, severe cracking)  
* Broken exterior door lock (security breach)

Response:

1. If life-threatening: instruct the resident to call 911 first  
2. Maintenance on-call responds within 30 minutes  
3. Notify the property manager immediately  
4. Document all actions with timestamps

### **4.2 Urgent (Response: 4 hours)**

Definition: Conditions that significantly affect livability or could escalate if not addressed quickly.

Examples:

* No hot water  
* HVAC failure (non-emergency temperature conditions)  
* Refrigerator not working (food safety)  
* Toilet not working (only toilet in unit)  
* Active but contained leak  
* Broken window (non-ground floor)  
* Pest infestation (e.g., bed bugs — follow pest protocol)

Response:

1. Acknowledge within 15 minutes  
2. Maintenance or vendor responds within 4 business hours  
3. If cannot resolve same day, provide timeline and interim solution (e.g., portable heater, temporary fridge)

### **4.3 Routine (Response: 48 hours)**

Definition: Standard maintenance issues that do not affect health, safety, or essential livability.

Examples:

* Leaking faucet (not active flooding)  
* Running toilet  
* Garbage disposal not working  
* Dishwasher issue  
* Light fixture out (non-safety)  
* Cabinet or drawer broken  
* Caulking or grout repair  
* Blinds or screen replacement

Response:

1. Acknowledge within 15 minutes during business hours  
2. Complete within 48 business hours  
3. Schedule with resident and confirm appointment

### **4.4 Scheduled / Preventive**

Definition: Planned maintenance, inspections, or preventive tasks.

Examples:

* HVAC filter replacement (quarterly)  
* Smoke detector battery replacement (semi-annual)  
* Annual unit inspection  
* Pest prevention treatment (scheduled)  
* Gutter cleaning, landscaping

Response:

1. Schedule per the maintenance calendar  
2. Notify residents at least 48 hours in advance for unit-entry items  
3. Follow state-law notice requirements for entry (typically 24–48 hours written notice)

## **5\. Work Order Creation**

### **5.1 Required Information**

Every work order must include:

| Field | Required | Source |
| ----- | ----- | ----- |
| Resident name and unit | Yes | Entrata / resident identification |
| Contact number and preferred contact method | Yes | Entrata / Resident |
| Description of the issue | Yes | Resident (AI agent captures) |
| Location within unit (room, specific area) | Yes | Resident |
| Permission to enter if resident is absent | Yes | Resident |
| Priority classification | Yes | Triage (AI,I or staff, or settings) |
| Photos (if provided by resident) | Recommended | Resident |
| Date and time reported | Auto | System |
| Work order number | Auto | Entrata |

### **5.2 AI Agent Work Order Creation**

The Maintenance AI agent:

1. Gathers the required information conversationally  
2. Classifies priority based on the keywords and descriptions in Section 4  
3. Creates the work order in Entrata via the entrata/work\_orders/create tool  
4. Confirms the work order number and expected response time with the resident  
5. For emergency or urgent requests: escalates to the maintenance supervisor immediately after creating the work order

## **6\. Dispatch**

### **6.1 Assignment**

1. Maintenance supervisor reviews incoming work orders (or receives automated notifications for emergency/urgent)  
2. Assigns to the appropriate maintenance technician based on:  
   * Skill match (plumbing, electrical, HVAC, general)  
   * Availability and current workload  
   * Property location  
3. For specialized work (e.g., HVAC, plumbing, electrical panel, pest control): assign to an approved vendor  
4. Vendor assignments require supervisor approval

### **6.2 Scheduling**

1. For routine work orders: schedule with the resident (confirm date, time window, and entry permission)  
2. Provide the resident with a 4-hour arrival window (e.g., 8am–12pm or 1pm–5pm)  
3. Send a confirmation (via Entrata notification, email, or AI agent)  
4. Send a reminder 24 hours before the scheduled appointment

## **7\. Completion and Follow-Up**

### **7.1 Completing the Work Order**

1. Technician or vendor arrives, performs the repair, and documents the work:  
   * What was done  
   * Parts used (with cost if applicable)  
   * Time spent  
   * Before/after photos (for significant repairs)  
2. Update the work order status in Entrata to "Completed"  
3. If the issue cannot be resolved in one visit, update the status to "In Progress" with notes and a follow-up date

### **7.2 Resident Confirmation**

Within 24 hours of completion:

1. Contact the resident to confirm the issue is resolved  
2. Ask if there are any follow-up concerns  
3. If the resident reports the issue is not resolved, reopen the work order and escalate to the maintenance supervisor  
4. Document the follow-up in Entrata

### **7.3 Unresolved or Recurring Issues**

If a work order is reopened or the same issue recurs within 30 days:

1. Escalate to the maintenance supervisor  
2. Assess whether a different approach, vendor, or more significant repair is needed  
3. Document the pattern in Entrata for tracking

## **8\. Unit Entry and Access**

### **8.1 Notice Requirements**

* State law governs notice requirements for unit entry (typically 24–48 hours written notice for non-emergency entry)  
* Emergency: No notice required for genuine emergencies (threat to life, health, safety, or property)  
* Resident-requested: When the resident initiated the request and confirmed entry permission, the work order documentation serves as consent

### **8.2 Entry Protocol**

1. Knock and announce before entering, even with notice or permission  
2. If the resident is home, confirm before proceeding  
3. If the resident is absent (with permission), leave a door hanger or notification indicating entry was made, work performed, and any follow-up needed  
4. Never enter a unit without proper authorization and documentation

## **9\. Vendor Management**

* Only approved vendors may be used for maintenance and repair work  
* Vendor approval requires: valid license, insurance (general liability and workers' comp), and executed vendor agreement  
* Vendor performance is tracked: response time, quality, cost, and resident feedback  
* Vendor invoices are matched to work orders in Entrata before payment

## **10\. Fair Housing Compliance**

Maintenance must be provided consistently regardless of the resident's protected class:

* Same response times for all residents in the same priority category  
* No favoritism or delay based on personal characteristics  
* Accommodation requests (e.g., specific scheduling needs, disability-related modifications) handled per SOP-009  
* Document response times and completion for audit and reporting

## **11\. KPIs**

| Metric | Target |
| ----- | ----- |
| Emergency response within 30 minutes | 100% |
| Urgent response within 4 hours | ≥ 95% |
| Routine first response within 15 minutes | ≥ 95% |
| Routine completion within 48 hours | ≥ 85% |
| Resident satisfaction (post-completion survey) | ≥ 4.0 / 5.0 |
| Work orders reopened within 30 days | ≤ 10% |
| Average days to complete (routine) | ≤ 2 days |

## **12\. Related Documents**

* SOP-001: Fair Housing Compliance  
* SOP-004: Move-In / Move-Out Procedures  
* SOP-009: Reasonable Accommodation Requests  
* Emergency maintenance contact list (property-specific)  
* Approved vendor list  
* State-specific entry notice requirements

## **13\. Revision History**

| Version | Date | Author | Changes |
| ----- | ----- | ----- | ----- |
| 1.0 | 2026-03-11 | \[Author\] | Initial draft |

