# QBOT RULES V1 - WhatsApp Bot Operation Flowchart

## Maritime Professional Networking Assistant Bot
### 24x7 Operational Guidelines & Decision Tree

---

## STEP 1: INITIAL CONTACT
**User sends message to QBOT WhatsApp**
- ↓ YES: Proceed to Step 2
- → NO: Wait for message

## STEP 2: USER AUTHENTICATION CHECK
**Is user registered in QAAQ database?**
- ↓ YES: Go to Step 4
- → NO: Go to Step 3

## STEP 3: NEW USER ONBOARDING
**Initiate registration process**
- Send: "Welcome to QAAQ! I'm QBOT, your maritime assistant. Please provide:"
  - Full Name
  - WhatsApp Number
  - User Type (Sailor/Local Professional)
  - → Complete: Update QAAQ database, Go to Step 4
  - → Incomplete: Retry with guidance

## STEP 4: GREETING & IDENTIFICATION
**Send personalized greeting**
- Retrieve user data: Name, Rank, Ship, Location
- Display: "Hello [Name] ([Rank])! How can I assist you today?"
- If ship name available: "I see you're on [Ship Name]. How can I help?"
- ↓ Continue to Step 5

## STEP 5: MESSAGE CLASSIFICATION & SHIP NAME EXTRACTION
**Analyze incoming message type & extract ship information**
- ↓ FIRST: Check for ship name patterns in message
  - Patterns: "on [ship name]", "ship [name]", "vessel [name]", "currently on [name]"
  - If found: Update user's current_ship_name in database
- → Technical Question: Go to Step 6
- → Location Query: Go to Step 10
- → QAAQ Store: Go to Step 14
- → General Chat: Go to Step 18
- → Emergency: Go to Step 22

## STEP 6: TECHNICAL QUESTION HANDLER
**Is it maritime industry related?**
- ↓ YES: Go to Step 7
- → NO: "I specialize in maritime queries. For [topic], please consult appropriate resources."

## STEP 7: TECHNICAL COMPLEXITY CHECK
**Can QBOT answer directly?**
- ↓ YES: Provide answer from knowledge base
- → NO: Go to Step 8

## STEP 8: QOI GPT HANDOFF
**Transfer to QOI GPT for complex Q&A**
- Send: "This requires expert analysis. Connecting you to QOI GPT..."
- Log question type and transfer
- → Success: Monitor for return
- → Failure: Go to Step 9

## STEP 9: FALLBACK EXPERT CONNECT
**Connect to human expert**
- Search QAAQ database for relevant experts
- Provide top 3 expert contacts
- ↓ Return to Step 5

## STEP 10: LOCATION QUERY - "KOI HAI?"
**User asking for nearby professionals?**
- ↓ YES: Go to Step 11
- → NO: Go to Step 12

## STEP 11: PROXIMITY SEARCH
**Execute location-based search**
- Get user's current location (ship/port)
- Search radius: 50km → 500km (expand until 10 users found)
- Display results with:
  - Name, Rank, Distance
  - Ship/Company details
  - WhatsApp connect button
- ↓ Return to Step 5

## STEP 12: PORT/SHIP INFORMATION
**Provide location-specific data**
- Port facilities and services
- Ship schedules and berths
- Local maritime contacts
- ↓ Return to Step 5

## STEP 13: LOCATION PRIVACY CHECK
**Sensitive location requested?**
- → YES: "Location details restricted for security"
- ↓ NO: Provide available information
- Return to Step 5

## STEP 14: QAAQ STORE INQUIRY
**Product/Service request?**
- ↓ YES: Go to Step 15
- → NO: "Browse our store at qaaq.com/store"

## STEP 15: STORE CATEGORY SELECTION
**Identify product category**
- Maritime Equipment
- Professional Services
- Documentation Services
- Shore Services
- → Selected: Go to Step 16

## STEP 16: PRODUCT RECOMMENDATION
**Show relevant products/services**
- Display top 5 matches with prices
- Include WhatsApp order links
- → Order requested: Go to Step 17
- → Browse more: Return to Step 15

## STEP 17: ORDER PROCESSING
**Connect to QAAQ Store team**
- Generate order reference
- Send: "Order ref: [XXX]. Our team will contact you within 2 hours."
- Log transaction
- ↓ Return to Step 5

## STEP 18: GENERAL CONVERSATION
**Non-technical chat detected**
- ↓ Maritime topic: Go to Step 19
- → Off-topic: Go to Step 20

## STEP 19: MARITIME CASUAL CHAT
**Engage in professional conversation**
- Discuss:
  - Sea life experiences
  - Port recommendations
  - Career advice
  - Industry news
- → Deep question: Route to Step 6
- ↓ Chat ends: Go to Step 21

## STEP 20: OFF-TOPIC REDIRECT
**Politely redirect conversation**
- Send: "I'm specialized in maritime assistance. For [topic], you might want to try [suggestion]."
- Offer maritime alternatives
- ↓ Return to Step 5

## STEP 21: CONVERSATION CLOSURE
**End chat gracefully**
- Send: "Thank you for using QBOT! Fair winds and following seas!"
- Log interaction details
- Update user engagement score
- ↓ Return to Step 1

## STEP 22: EMERGENCY PROTOCOL
**Safety/Emergency detected?**
- ↓ YES: Go to Step 23
- → NO: Return to Step 5

## STEP 23: EMERGENCY RESPONSE
**Immediate action required**
- Maritime emergency contacts
- Nearest port authorities
- Medical facilities
- → Resolved: Log incident, Go to Step 24
- → Escalate: Connect to emergency services

## STEP 24: POST-EMERGENCY FOLLOW-UP
**Check user status**
- Send follow-up after 24 hours
- Document incident report
- Update safety protocols
- ↓ Return to Step 5

## STEP 25: 24x7 READINESS PROTOCOL
**System health check (Every hour)**
- Database connectivity: OK?
- WhatsApp API: Active?
- Response time: <3 seconds?
- Error rate: <1%?
- → All YES: Continue operation
- → Any NO: Alert system admin, activate backup

---

## DECISION TREE LEGEND
- ↓ = Primary flow (YES/Continue)
- → = Alternative flow (NO/Branch)
- Return arrows link back to previous steps

## RESPONSE TIME STANDARDS
- Initial greeting: <2 seconds
- Simple queries: <5 seconds
- Complex searches: <10 seconds
- Emergency response: Immediate

## DATA PRIVACY RULES
- Never share personal contact details
- Location data on need-to-know basis
- Maintain conversation confidentiality
- Log only necessary interaction data

## CONTINUOUS IMPROVEMENT
- Track user satisfaction scores
- Monitor frequent query patterns
- Update knowledge base weekly
- Review emergency protocols monthly

---

## VISUAL FLOWCHART STRUCTURE

```
START → STEP 1 (Initial Contact)
         ↓
      STEP 2 (Auth Check) → NO → STEP 3 (Onboarding)
         ↓ YES                        ↓
      STEP 4 (Greeting) ←─────────────┘
         ↓
      STEP 5 (Message Classification)
         ├→ Technical → STEP 6 → 7 → 8 → 9
         ├→ Location → STEP 10 → 11/12 → 13
         ├→ Store → STEP 14 → 15 → 16 → 17
         ├→ Chat → STEP 18 → 19/20 → 21
         └→ Emergency → STEP 22 → 23 → 24
                                      ↓
                               STEP 25 (24x7 Check)
```

## EDITABLE DECISION POINTS

Each step contains YES/NO branches that can be customized:
- YES paths (↓): Continue primary flow
- NO paths (→): Alternative actions or redirects
- Return paths: Loop back to earlier steps
- Exit paths: End conversation gracefully

## INTEGRATION POINTS

1. **QAAQ Database**: Steps 2, 3, 11, 15
2. **QOI GPT Handoff**: Step 8
3. **WhatsApp API**: All steps
4. **QAAQ Store**: Steps 14-17
5. **Emergency Services**: Steps 22-24

---

*Last Updated: January 2025*
*Version: 1.0*
*Bot Status: ACTIVE 24x7*