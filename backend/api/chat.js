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
  const questionPlan = quick
    ? `  Q1: Behavioral (STAR format)\n  Q2: Technical or situational\n  Q3: Motivation / culture fit`
    : `  Q1: Behavioral (STAR format)\n  Q2: Behavioral (STAR format)\n  Q3: Technical or situational\n  Q4: Technical or situational\n  Q5: Motivation / culture fit\n  Q6: Closing question`;

  const companyExtra = COMPANY_INSTRUCTIONS[ctx.companyMode] || "";

  return `
You are Alex, a professional AI interviewer conducting a mock job interview.

## Candidate context
- Role: ${ctx.role || "Software Engineer"}
- Company: ${ctx.company || "a top tech company"}
- Experience: ${ctx.yearsOfExperience || "3-5"} years
- Interview type: ${ctx.interviewType || "mixed"}
- Job description: ${ctx.jobDescription || "Not provided"}
${quick ? "- Mode: QUICK 5-minute practice (3 questions only)" : ""}${companyExtra}

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
