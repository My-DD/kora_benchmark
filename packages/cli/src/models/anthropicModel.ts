import {createAnthropic} from "@ai-sdk/anthropic";
import {ModelRequest, TypedModelRequest} from "@korabench/core";
import {toJsonSchema} from "@valibot/to-json-schema";
import {generateText, jsonSchema, Output} from "ai";
import * as v from "valibot";
import {createLogRetryHandler, RetryOptions, withRetry} from "../retry.js";
import {Model} from "./model.js";

//
// Direct Anthropic provider.
//
// Bypasses the Vercel AI Gateway and calls the Anthropic API directly using the
// ANTHROPIC_API_KEY environment variable. This mirrors how the judge and user
// models were run before the gateway was introduced. Slugs that start with
// "anthropic/" are routed here; the part after the prefix is the Anthropic
// model id (e.g. "anthropic/claude-sonnet-4.5" -> "claude-sonnet-4.5").
//

const ANTHROPIC_PREFIX = "anthropic/";

const defaultMaxTokens = 4000;

const defaultRetryOptions: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

export function isAnthropicDirectSlug(modelSlug: string): boolean {
  return modelSlug.startsWith(ANTHROPIC_PREFIX);
}

export function createAnthropicModel(modelSlug: string): Model {
  if (!process.env["ANTHROPIC_API_KEY"]) {
    throw new Error(
      `Direct Anthropic model "${modelSlug}" requires the ANTHROPIC_API_KEY environment variable.`
    );
  }

  const modelId = modelSlug.slice(ANTHROPIC_PREFIX.length);
  if (!modelId) {
    throw new Error(
      `Invalid Anthropic model slug "${modelSlug}". Expected "anthropic/<model-id>".`
    );
  }

  const anthropic = createAnthropic();
  const model = anthropic(modelId);
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    onRetry: createLogRetryHandler(modelId),
  };

  return {
    async getTextResponse(request: ModelRequest): Promise<string> {
      const result = await withRetry(
        () =>
          generateText({
            model,
            system: request.messages.find(m => m.role === "system")?.content,
            messages: request.messages
              .filter(m => m.role !== "system")
              .map(m => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            maxOutputTokens: request.maxTokens ?? defaultMaxTokens,
            temperature: request.temperature,
            maxRetries: 0,
          }),
        retryOptions
      );

      return result.text;
    },

    async getStructuredResponse<T>(request: TypedModelRequest<T>): Promise<T> {
      const outputSchema = toJsonSchema(request.outputType);

      return withRetry(async () => {
        const result = await generateText({
          model,
          system: request.messages.find(m => m.role === "system")?.content,
          messages: request.messages
            .filter(m => m.role !== "system")
            .map(m => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          output: Output.object({schema: jsonSchema(outputSchema)}),
          maxOutputTokens: request.maxTokens ?? defaultMaxTokens,
          temperature: request.temperature,
          maxRetries: 0,
        });

        return v.parse(request.outputType, result.output);
      }, retryOptions);
    },
  };
}
