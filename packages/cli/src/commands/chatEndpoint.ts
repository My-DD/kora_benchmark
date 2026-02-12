import {AgeRange} from "@korabench/benchmark";

type Age = number;

export function ageRangeToAge(ageRange: AgeRange): Age {
  switch (ageRange) {
    case "7to9":
      return 8;
    case "10to12":
      return 11;
    case "13to17":
      return 15;
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries: number = 5
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return response;
      }

      const body = await response.text();
      if (attempt === maxRetries) {
        throw new Error(
          `HTTP ${response.status} after ${maxRetries + 1} attempts: ${body}`
        );
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }

    const delay = Math.min(1000 * 2 ** attempt, 30_000);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  throw new Error("Unreachable");
}

export async function restoreChatEndpointMemory(
  baseUrl: string,
  sessionId: string,
  age: Age,
  modelMemory: string
): Promise<void> {
  const url = `${baseUrl.replace(/\/+$/, "")}/restore_session_memory`;

  await fetchWithRetry(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      session_id: sessionId,
      messages: [
        {role: "user", content: modelMemory},
        {role: "assistant", content: "I'll keep that in mind."},
      ],
      age,
    }),
  });
}

export async function getChatEndpointResponse(
  baseUrl: string,
  sessionId: string,
  age: Age,
  prompt: string
): Promise<string> {
  const base = baseUrl.replace(/\/+$/, "");
  const url = `${base}/query_chat_langchain_mem?session_id=${encodeURIComponent(sessionId)}`;

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({prompt, age}),
  });

  const data = (await response.json()) as {response: string};
  return data.response;
}
