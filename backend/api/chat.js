const { OpenAI } = require("openai");

const COMPANY_INSTRUCTIONS = {
  Amazon: `\n## Amazon-specific focus\nAll questions must be rooted in Amazon's 14 Leadership Principles (e.g. Customer Obsession, Ownership, Bias for Action, Earn Trust). Expect STAR-format answers and probe for scale, impact, and ownership. Reject vague answers with a follow-up.`,
  Google: `\n## Google-specific focus\nEmphasize Googleyness (ambiguity tolerance, collaboration, impact at scale). Include at least one structured problem-solving question. Probe for data-driven thinking and cross-functional influence.`,
  Microsoft: `\n## Microsoft-specific focus\nEmphasize Growth Mindset (learning from failure, curiosity, inclusion). Include questions about collaboration across teams and delivering impact through others.`,
  "TCS / Infosys": `\n## TCS/Infosys-specific focus\nMix HR questions (career goals, strengths, teamwork) with technical questions about project experience, tech stack, and process adherence. Keep language straightforward.`,
};

function buildSystemPrompt(ctx) {
  const quick = ctx.quickMode === true;
  const questionCount = quick ? 3 : 6;
  const interviewType = ctx.interviewType || "mixed";
  const skills = Array.isArray(ctx.skills) && ctx.skills.length > 0
    ? ctx.skills
    : null;
  const skillsList = skills ? skills.join(", ") : null;

  // Build question plan based on interview type
  let questionPlan;
  if (quick) {
    if (interviewType === "technical" && skillsList) {
      questionPlan = `  Q1: Deep technical question on ${skillsList}\n  Q2: Deep technical question on ${skillsList}\n  Q3: Motivation / culture fit`;
    } else if (interviewType === "behavioral") {
      questionPlan = `  Q1: Behavioral (STAR format)\n  Q2: Behavioral (STAR format)\n  Q3: Motivation / culture fit`;
    } else {
      questionPlan = `  Q1: Behavioral (STAR format)\n  Q2: ${skillsList ? `Deep technical question on ${skillsList}` : "Situational / role-specific question"}\n  Q3: Motivation / culture fit`;
    }
  } else if (interviewType === "technical") {
    if (skillsList) {
      questionPlan = `  Q1: Deep technical question on ${skillsList}\n  Q2: Deep technical question on ${skillsList}\n  Q3: Deep technical question on ${skillsList} (harder — go deeper, ask about internals, edge cases, or trade-offs)\n  Q4: Deep technical question on ${skillsList} (hardest — architecture, debugging scenario, or design decision)\n  Q5: Behavioral — how they handled a technical challenge on the job\n  Q6: Closing question`;
    } else {
      questionPlan = `  Q1: Technical role knowledge question\n  Q2: Technical role knowledge question\n  Q3: Technical role knowledge question (harder)\n  Q4: Technical role knowledge question (hardest)\n  Q5: Behavioral — how they handled a technical challenge\n  Q6: Closing question`;
    }
  } else if (interviewType === "behavioral") {
    questionPlan = `  Q1: Behavioral (STAR format) — leadership or ownership\n  Q2: Behavioral (STAR format) — conflict or teamwork\n  Q3: Behavioral (STAR format) — failure or learning\n  Q4: Behavioral (STAR format) — initiative or impact\n  Q5: Motivation / culture fit\n  Q6: Closing question`;
  } else {
    // mixed
    if (skillsList) {
      questionPlan = `  Q1: Behavioral (STAR format)\n  Q2: Deep technical question on ${skillsList}\n  Q3: Behavioral (STAR format)\n  Q4: Deep technical question on ${skillsList} (harder)\n  Q5: Motivation / culture fit\n  Q6: Closing question`;
    } else {
      questionPlan = `  Q1: Behavioral (STAR format)\n  Q2: Situational / role-specific question\n  Q3: Behavioral (STAR format)\n  Q4: Situational / role-specific question\n  Q5: Motivation / culture fit\n  Q6: Closing question`;
    }
  }

  const companyExtra = COMPANY_INSTRUCTIONS[ctx.companyMode] || "";

  // Build technical depth instructions if skills are present
  const technicalInstructions = (interviewType !== "behavioral" && skillsList) ? `
## HOW TO ASK TECHNICAL QUESTIONS — READ CAREFULLY
The candidate selected these skills: ${skillsList}
Your technical questions MUST test real knowledge of these specific technologies.

Ask questions like a senior engineer would in a real interview:
- Concept questions: "What is the difference between X and Y?", "Explain how X works under the hood"
- Code reasoning: "What does this code do?", "What is wrong with this pattern?"
- Debugging: "Why might this cause a memory leak / race condition / performance issue?"
- Trade-offs: "When would you use X over Y?", "What are the downsides of X?"
- Internals: "How does X handle Y internally?", "What happens when you call X?"

EXAMPLES (use these as a style guide, do NOT copy verbatim):
${skillsList.includes("JavaScript") || skillsList.includes("JS") ? `
JavaScript examples:
- "What is the difference between var, let, and const? When would you use each?"
- "Explain how the JavaScript event loop works."
- "What is a closure and give a real-world use case."
- "What is the difference between == and ===?"
- "What does 'this' refer to in an arrow function vs a regular function?"
- "How does Promise.all differ from Promise.allSettled?"` : ""}
${skillsList.includes("React") ? `
React examples:
- "What is the difference between useEffect and useLayoutEffect?"
- "When does React re-render a component? How can you prevent unnecessary re-renders?"
- "Explain the difference between controlled and uncontrolled components."
- "What problem does useCallback solve?"
- "How does React's reconciliation algorithm work?"` : ""}
${skillsList.includes("Node.js") || skillsList.includes("Node") ? `
Node.js examples:
- "How does Node.js handle concurrency if it is single-threaded?"
- "What is the difference between process.nextTick and setImmediate?"
- "When would you use a stream instead of reading a file into memory?"
- "How do you prevent callback hell?"` : ""}
${skillsList.includes("Python") ? `
Python examples:
- "What is the GIL and how does it affect multi-threading in Python?"
- "Explain list comprehensions vs generator expressions."
- "What is the difference between @staticmethod and @classmethod?"
- "How does Python manage memory?"` : ""}
${skillsList.includes("SQL") || skillsList.includes("PostgreSQL") || skillsList.includes("MySQL") ? `
SQL examples:
- "What is the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN?"
- "When would you use a CTE instead of a subquery?"
- "What is an index and when can it slow things down?"
- "Explain ACID properties in a database."` : ""}
${skillsList.includes("System Design") ? `
System Design examples:
- "How would you design a URL shortener?"
- "What is the CAP theorem and what does it mean for distributed systems?"
- "Explain horizontal vs vertical scaling."
- "How would you implement rate limiting?"` : ""}

Do NOT ask behavioral or situational questions when a technical question is scheduled. Ask a REAL technical question that tests whether the candidate actually knows the technology.` : "";

  return `
You are Alex, a professional AI interviewer conducting a mock job interview.

## Candidate context
- Role: ${ctx.role || "Software Engineer"}
- Company: ${ctx.company || "a top tech company"}
- Experience: ${ctx.yearsOfExperience || "3-5"} years
- Interview type: ${interviewType}
- Skills to test: ${skillsList || "Not specified — ask general role questions"}
- Job description: ${ctx.jobDescription || "Not provided"}
${quick ? "- Mode: QUICK 5-minute practice (3 questions only)" : ""}${companyExtra}
${technicalInstructions}

## STRICT RULES — follow these exactly

RULE 1 — ONE question per message. Never ask two questions at once.

RULE 2 — NO feedback mid-interview. After each answer, write ONE short transition
sentence only (max 8 words, e.g. "Got it, let's continue." / "Thanks for sharing.").
Then immediately ask your next question. You must NEVER say things like:
"Great answer", "That's a strong example", "Good job", "That's correct",
"You did well", or anything that evaluates the answer.

RULE 3 — Ask exactly ${questionCount} questions in this order:
${questionPlan}
You MUST stop after question ${questionCount}. Do NOT ask a ${questionCount + 1}th question under any circumstances.

RULE 4 — Adapt difficulty based on internal scores (1–5 per answer, never shown):
  Two consecutive 4–5 → increase difficulty
  Two consecutive 1–2 → decrease difficulty

RULE 5 — CRITICAL: After the ${questionCount}th answer OR if the candidate says "end interview":
  Your response must be ONLY the JSON object below.
  Do NOT write any text before or after the JSON.
  Do NOT wrap it in markdown or code blocks.
  Start your response with { and end with }.

RULE 6 — TOPIC CHANGE ON "I DON'T KNOW": If the candidate says they don't know,
  have no idea, haven't worked with, or are unfamiliar with the topic of your question,
  do NOT ask a follow-up or related question on that same topic.
  Move immediately to the next planned question category.
  Give it an internal score of 2 and continue.

## REPORT FORMAT (output ONLY this, nothing else, when interview ends)
{"overall_score":<1-100>,"summary":"<2-3 sentence assessment>","questions":[{"question":"<exact question>","answer_summary":"<1 sentence>","score":<1-10>,"strengths":["<s1>","<s2>"],"improvements":["<i1>","<i2>"],"sample_better_answer":"<example>"}],"top_3_strengths":["<s>","<s>","<s>"],"top_3_improvements":["<i>","<i>","<i>"],"interview_readiness_percent":<0-100>,"recommended_next_focus":"<one thing>"}`.trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { messages, candidateContext } = req.body;

  if (!messages || !candidateContext) {
    return res.status(400).json({ error: "Missing messages or candidateContext" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not set in Vercel environment variables" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const questionLimit = candidateContext.quickMode === true ? 3 : 6;
    const aiQuestionCount = messages.filter((m) => m.role === "assistant").length;
    const lastMessageIsUser = messages.length > 0 && messages[messages.length - 1].role === "user";

    // Build system prompt — append a hard override when question limit is reached
    let systemContent = buildSystemPrompt(candidateContext);
    if (aiQuestionCount >= questionLimit && lastMessageIsUser) {
      systemContent += `\n\nOVERRIDE: You have already asked ${aiQuestionCount} questions which meets the ${questionLimit}-question limit. The interview is OVER. Do NOT ask another question. Output the JSON report immediately. Your entire response must be only the JSON object starting with {.`;
    }

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    let reply = completion.choices[0].message.content;

    // If the reply contains a report, strip ALL surrounding text and return clean JSON
    if (reply.includes('"overall_score"')) {
      // Remove markdown code fences
      reply = reply.replace(/```(?:json)?\n?/g, "").trim();
      // Extract the JSON object
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.overall_score !== undefined) {
            reply = JSON.stringify(parsed); // Return clean minified JSON
          }
        } catch (_) {}
      }
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Groq error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
