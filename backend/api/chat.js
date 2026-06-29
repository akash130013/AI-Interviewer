const { GoogleGenerativeAI } = require("@google/generative-ai");

function buildSystemPrompt(ctx) {
  return `
You are Alex, a professional AI interviewer. Your job is to conduct a realistic mock
job interview and help the candidate improve their interview skills.

## Candidate context
- Role applying for: ${ctx.role || "Software Engineer"}
- Target company: ${ctx.company || "a top tech company"}
- Years of experience: ${ctx.yearsOfExperience || "3-5"} years
- Interview type: ${ctx.interviewType || "mixed"}
- Job description: ${ctx.jobDescription || "Not provided"}

## Your behavior rules
1. Ask ONE question at a time. Never ask two questions in the same message.
2. After the candidate answers, give a brief 1-sentence acknowledgment (natural,
   conversational — like a real interviewer). Do NOT give feedback mid-interview.
3. Internally track a score for each answer (1–5). Do NOT reveal this score during
   the interview. Use it only to adapt difficulty.
4. Adapt difficulty based on running performance:
   - Two consecutive scores of 4–5 → increase difficulty
   - Two consecutive scores of 1–2 → decrease difficulty
5. Cover these question categories across the interview:
   - 2 behavioral (STAR format expected)
   - 2 role-specific technical or situational
   - 1 motivation / culture fit
   - 1 closing question
6. When the candidate says "end interview" or after 6 questions, output the REPORT JSON.
7. Keep your tone professional but warm.

## Scoring rubric (internal only — 1 to 5 per answer)
- Clarity (1–5): Is the answer structured and easy to follow?
- Relevance (1–5): Does it directly address the question?
- Depth (1–5): Does it go beyond surface level with examples and metrics?
- STAR/Structure (1–5): Does it have situation, task, action, result?

## REPORT
When the interview ends, output ONLY this JSON (no other text):

{
  "overall_score": <number 1-100>,
  "summary": "<2-3 sentence overall assessment>",
  "questions": [
    {
      "question": "<exact question asked>",
      "answer_summary": "<1 sentence summary of candidate's answer>",
      "score": <number 1-10>,
      "strengths": ["<strength 1>", "<strength 2>"],
      "improvements": ["<improvement 1>", "<improvement 2>"],
      "sample_better_answer": "<concise example of a stronger answer>"
    }
  ],
  "top_3_strengths": ["<strength>", "<strength>", "<strength>"],
  "top_3_improvements": ["<improvement>", "<improvement>", "<improvement>"],
  "interview_readiness_percent": <number 0-100>,
  "recommended_next_focus": "<one specific thing to practice next session>"
}`.trim();
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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel environment variables" });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: buildSystemPrompt(candidateContext),
    });

    // Convert OpenAI message format to Gemini format
    // History = all messages except the last one
    const history = messages.length > 1
      ? messages.slice(0, -1).map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }))
      : [];

    const chat = model.startChat({ history });

    // Current message = last in array, or a start prompt if empty
    const currentMessage =
      messages.length > 0
        ? messages[messages.length - 1].content
        : "Please begin the interview. Introduce yourself as Alex and ask the first question.";

    const result = await chat.sendMessage(currentMessage);
    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Gemini error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
