# Enterprise Nation Lunch + Learn — Presenter Script

**Event:** How to use AI to turn business data into useful answers  
**Date:** Wednesday 8 July 2026  
**Speaker:** Harinath Selvaraj, Founder, Granola Consulting  
**Format:** ~45 minutes (30 min content + 10 min live demo + 5 min Q&A)  
**Audience:** Small business owners and operators — practical, non-technical, action-oriented

**Deck file:** `enterprise-nation-ai-data-lunch-learn-2026-07-08.pptx` (Enterprise Nation template, 6 slides)

---

## Before you start

- [ ] Add your Enterprise Nation profile handle on **slide 1** (replace placeholder if needed).
- [ ] Optional: add a screenshot or logo on **slide 2** in the image placeholder (e.g. messy spreadsheet vs clean dashboard).
- [ ] Have a **demo dataset** ready (anonymised sales CSV or sample CRM export).
- [ ] Test screen share, audio, and any tool you’ll demo (HoneyGold, Metabase, Looker Studio, or similar).
- [ ] Pin the chat link and your EN profile in the webinar chat at start.

---

## Slide 1 — Title (~2 min)

**On screen:** Title, your name, Granola Consulting, EN branding.

**Say:**

> Good afternoon everyone, and thanks to Enterprise Nation for hosting this Lunch and Learn.
>
> I’m Harinath Selvaraj, founder of Granola Consulting. I help small and growing businesses use AI in practical ways — especially around data and reporting, without needing a full data team.
>
> For context: I’ve spent over 15 years in data science and analytics, including six years leading global data science at Hertz. Today my focus is making that kind of capability accessible to SMEs — the businesses that actually run the economy but rarely have a dedicated analyst on payroll.
>
> Today’s session: **how to use AI to turn the business data you already have into useful answers** — charts, KPIs, and next steps you can act on this week.
>
> Drop questions in the chat as we go; I’ll leave time at the end. If you want to connect afterwards, you’ll find me on the Enterprise Nation platform.

**Transition:** Let’s start with a problem most of you will recognise.

---

## Slide 2 — Why reporting feels hard (~6 min)

**On screen:** Four bullet points on data silos and delayed answers.

**Say:**

> Raise your hand — or type in the chat — if this sounds familiar: you *know* the answer to a business question is somewhere in your systems, but getting it takes longer than making the decision itself.
>
> Most small businesses are already collecting useful data:
> - Spreadsheets for orders or stock
> - A CRM for leads and customers
> - Website analytics
> - Accounting software for costs and cash
>
> The problem usually isn’t “we need more data.” It’s that everything lives in **silos**. Sales doesn’t match finance. Marketing can’t see what actually converted. And the “single view” only appears at **month-end** when someone finally has time to pull it together.
>
> Hiring a data analyst or building a data warehouse feels unrealistic when you’re running the business day to day. So reporting becomes a **reactive fire drill** instead of a weekly habit.
>
> What you need isn’t a bigger IT project. You need a **faster path from question → chart → decision** — and that’s where AI-assisted reporting has changed the game in the last couple of years.

**Optional audience poll (chat):** “What’s your biggest reporting pain — siloed data, slow answers, or not knowing which tool to use?”

**Transition:** Here’s the mindset shift in one line.

---

## Slide 3 — Quote (~1 min)

**On screen:** Data-rich, insight-poor quote.

**Say:**

> I like to say many small businesses are **data-rich but insight-poor**.
>
> The numbers are there. The invoices, the clicks, the pipeline — it’s all real. What’s missing is the **straight answer** when you need it: Which product line actually made money last quarter? Where did leads drop off? Can we afford to hire in September?
>
> AI doesn’t magically fix bad data. But it can dramatically shorten the path from those questions to a visual answer you trust enough to act on.

**Transition:** So what actually changes in practice? Let’s compare the old workflow to what’s possible now.

---

## Slide 4 — Old way vs AI-assisted reporting (~8 min)

**On screen:** Two columns — “The old way” / “With AI-assisted reporting”.

**Say:**

**The old way**

> Traditionally you’d export CSVs from three systems, stitch them in Excel, maybe ask a freelancer to write SQL, and wait. Dashboards were often built for one question — and by the time they’re ready, you’re asking something else.
>
> Decisions slip. You rely on gut feel not because you don’t care about data, but because data takes too long.

**With AI-assisted reporting**

> Today you can connect a dataset — or even upload a clean spreadsheet — and **ask in plain English**: “Which products sold best last quarter?” or “Show me revenue by region month on month.”
>
> The tool proposes a chart, a table, or a KPI. You refine: “Break that down by online vs in-store.” Minutes, not days.
>
> Some tools also draft a **short narrative** — “Revenue up 12% driven by Product A in the Midlands” — that you can paste into an email or board pack. Always **you** approve it; AI speeds the draft, you own the message.
>
> Important: this isn’t about replacing your judgment. It’s about removing the busywork between you and the number.

**Ground rules (say clearly):**

> Three habits that keep this safe:
> 1. **Spot-check** — if the chart says revenue doubled, sanity-check against your accounts.
> 2. **Start aggregated** — don’t throw raw customer PII at a public chatbot on day one.
> 3. **Human in the loop** — anything external (customers, investors, regulators) gets your review.

**Transition:** Let me show you what this looks like live, then we’ll talk about how to start on Monday.

---

## Live demo (~10 min)

**Not a separate slide — share screen.**

**Suggested flow (adapt to your tool of choice):**

1. **Show the dataset** (10–20 rows is enough). Name columns clearly: `order_date`, `product`, `revenue`, `channel`.
2. **Build or open one dashboard** with 3–5 charts: revenue trend, top products, channel split.
3. **Ask one plain-English question** live, e.g. “What was our best month last year and which product drove it?”
4. **Show a narrative or summary** if your tool supports it — and edit one sentence to show you’re in control.
5. **Deliberate mistake** (optional): ask something ambiguous, show how you refine the question — teaches prompt craft.

**Demo script lines:**

> I’m not going to pretend every answer is perfect first time. Watch what I do when it’s wrong — I narrow the question, I check the date range, I compare to a pivot table I already trust.
>
> That’s the skill: **treat AI like a fast junior analyst**, not an oracle.

**If demo fails:** Have 2–3 screenshots as backup. Narrate the same steps over static images.

**Transition:** You don’t need everything I showed on day one. Here’s a practical path.

---

## Slide 5 — Three steps to get started (~8 min)

**On screen:** Three columns — dataset, dashboard, ask safely.

**Say:**

**Step 1 — One trusted dataset**

> Don’t boil the ocean. Pick **one** source you already reconcile — weekly sales export, CRM pipeline, or Xero/QuickBooks summary.
>
> Spend an hour on **column names** and dates. `2026-07-01` beats `01/07/26`. Consistent product names beat “Widget” vs “widget”. You’ll thank yourself every Monday.

**Step 2 — A simple dashboard**

> Five to seven metrics you’d want every Monday morning:
> - Revenue (or cash in)
> - Gross margin or unit economics if you have it
> - New leads / orders
> - Conversion or repeat rate
> - One cost line you watch (ads, stock, payroll)
>
> A single screen beats a 40-tab spreadsheet. You can add sophistication later.

**Step 3 — Ask questions safely**

> Layer AI on top once the dashboard is stable. Start with **aggregated** questions. Redact or exclude personal data you don’t need for the analysis.
>
> Agree internally: **no customer-facing or compliance-facing text goes out without a human read.**

**Tools (keep neutral, ~2 min):**

> You’ve got options at every budget:
> - **Free / low-cost:** Google Looker Studio, Metabase open source, Excel + Copilot, ChatGPT with Code Interpreter for ad-hoc CSVs (mind data sensitivity).
> - **SMB analytics + AI:** HoneyGold (what we build at Granola), Power BI with Copilot, Zoho Analytics, etc.
> - **When to pay:** When you need scheduled reports, multiple users, database connections, or audit trails — not because “AI” is on the brochure.
>
> Rule of thumb: **free is fine for learning; paid when the report runs the business every week.**

**Transition:** Quick recap, then I’ll take questions.

---

## Slide 6 — Thank you / CTA (~2 min)

**On screen:** Enterprise Nation thank-you slide.

**Say:**

> To recap:
> - You already have more data than you think.
> - AI shortens the path from question to chart — you still verify and decide.
> - Start with one dataset, one dashboard, safe questions.
>
> If you’d like help mapping this to your stack, connect with me on **Enterprise Nation** — I’m happy to point you at a sensible first step even if you never buy anything from us.
>
> Join Enterprise Nation free if you’re not already — discovery calls, groups, and recordings are linked on screen.
>
> Thanks for your time — what questions do you have?

---

## Q&A — prompt bank (~5 min)

Use if the room is quiet:

| Question | Short answer |
|----------|----------------|
| “Is my data safe in ChatGPT?” | Use business tiers, don’t upload unnecessary PII, prefer tools with clear data processing terms; aggregate when possible. |
| “Do I need clean data first?” | Clean *enough* — consistent dates and names on one table gets you surprisingly far. |
| “Will AI replace my accountant?” | No — it helps you ask better questions before you talk to them. |
| “What if we’re only on Excel?” | Perfect starting point; Copilot or export-to-CSV into a BI tool is a valid path. |
| “How long until we see value?” | One good Monday dashboard in a week if you pick a narrow scope. |

---

## Optional extra slides (duplicate template slides if you want more depth)

If Enterprise Nation allows a longer deck, duplicate **slide 2** or **slide 5** for:

| Topic | Suggested title | Bullets |
|-------|-----------------|--------|
| Speaker credibility | About Granola | Practical AI for SMEs; HoneyGold analytics; Dublin-based |
| Tool comparison | Picking your first tool | Connectors, cost, AI Q&A, who maintains it |
| Governance | Staying safe | Data minimisation, review workflow, what not to automate |
| Next 7 days | Your homework | Pick dataset → list 5 KPIs → one trial question |

---

## Timing cheat sheet

| Segment | Minutes |
|---------|---------|
| Intro (slide 1) | 2 |
| Problem (slide 2) | 6 |
| Quote (slide 3) | 1 |
| Before / after (slide 4) | 8 |
| Live demo | 10 |
| Getting started (slide 5) | 8 |
| Close (slide 6) | 2 |
| Q&A | 5+ |
| **Total** | **~42** |

---

## Post-session follow-up (for you)

- Share EN recording link when available.
- Offer one-line CTA: EN message or granola consulting contact / HoneyGold trial if appropriate.
- Note which demo questions landed — reuse for the next webinar.
