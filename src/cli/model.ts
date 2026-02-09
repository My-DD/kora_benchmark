import {ModelMessage} from "@korabench/core";
import {toJsonSchema} from "@valibot/to-json-schema";
import {gateway, generateText, jsonSchema, Output} from "ai";
import * as v from "valibot";
import {createLogRetryHandler, RetryOptions, withRetry} from "./retry.js";

export interface ModelOptions {
  maxTokens?: number;
  temperature?: number;
  retry?: RetryOptions;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

export async function getStructuredResponse<T>(
  modelSlug: string,
  messages: ModelMessage[],
  outputType: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
  options?: ModelOptions
): Promise<T> {
  const outputSchema = toJsonSchema(outputType);
  const maxTokens = options?.maxTokens ?? 4000;
  const retryOptions = {
    ...defaultRetryOptions,
    ...options?.retry,
    onRetry: options?.retry?.onRetry ?? createLogRetryHandler(modelSlug),
  };

  return withRetry(async () => {
    const result = await generateText({
      model: gateway(modelSlug),
      system: messages.find(m => m.role === "system")?.content,
      messages: messages
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      output: Output.object({schema: jsonSchema(outputSchema)}),
      maxOutputTokens: maxTokens,
      temperature: options?.temperature,
      maxRetries: 0, // Disable SDK retries; we handle it ourselves
    });

    // Validate inside retry so malformed responses are retried
    return v.parse(outputType, result.output);
  }, retryOptions);
}

export async function getTextResponse(
  modelSlug: string,
  messages: ModelMessage[],
  options?: ModelOptions
): Promise<string> {
  const maxTokens = options?.maxTokens ?? 4000;
  const retryOptions = {
    ...defaultRetryOptions,
    ...options?.retry,
    onRetry: options?.retry?.onRetry ?? createLogRetryHandler(modelSlug),
  };

  const result = await withRetry(
    () =>
      generateText({
        model: gateway(modelSlug),
        system: messages.find(m => m.role === "system")?.content,
        messages: messages
          .filter(m => m.role !== "system")
          .map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        maxOutputTokens: maxTokens,
        temperature: options?.temperature,
        maxRetries: 0, // Disable SDK retries; we handle it ourselves
      }),
    retryOptions
  );

  return result.text;
}
