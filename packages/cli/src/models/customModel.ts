import {Scenario} from "@korabench/benchmark";
import {v4 as uuid} from "uuid";
import {
  ageRangeToAge,
  getChatEndpointResponse,
  restoreChatEndpointMemory,
} from "../commands/chatEndpoint.js";
import {Model} from "./model.js";

function getBaseUrl(modelSlug: string): string {
  const baseUrl = process.env["MYDD_ENDPOINT_URL"];
  if (!baseUrl) {
    throw new Error(
      `Custom model "${modelSlug}" requires the MYDD_ENDPOINT_URL environment variable.`
    );
  }
  return baseUrl;
}

export async function createCustomModel(
  modelSlug: string,
  scenario: Scenario
): Promise<Model> {
  const baseUrl = getBaseUrl(modelSlug);
  const sessionId = `${uuid()}_${uuid()}`;
  const age = ageRangeToAge(scenario.seed.ageRange);

  if (scenario.modelMemory) {
    await restoreChatEndpointMemory(
      baseUrl,
      sessionId,
      age,
      scenario.modelMemory
    );
  }

  return {
    async getTextResponse(request) {
      const lastUserMessage = [...request.messages]
        .reverse()
        .find(m => m.role === "user");
      if (!lastUserMessage) {
        throw new Error("No user message found in request messages");
      }

      return getChatEndpointResponse(
        baseUrl,
        sessionId,
        age,
        lastUserMessage.content
      );
    },

    async getStructuredResponse() {
      throw new Error(
        `Custom model "${modelSlug}" does not support structured responses.`
      );
    },
  };
}
