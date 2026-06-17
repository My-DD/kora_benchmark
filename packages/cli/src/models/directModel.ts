import {createAnthropic} from "@ai-sdk/anthropic";
import {createDeepSeek} from "@ai-sdk/deepseek";
import {createOpenAI} from "@ai-sdk/openai";
import {ModelRequest, TypedModelRequest} from "@korabench/core";
import {toJsonSchema} from "@valibot/to-json-schema";
import {generateObject, generateText, jsonSchema, LanguageModel} from "ai";
import * as v from "valibot";
import {createLogRetryHandler, RetryOptions, withRetry} from "../retry.js";
import {Model} from "./model.js";
import {ModelConfig, resolveModelConfig} from "./modelConfig.js";

//
// Direct provider model.
//
// Replicates createGatewayModel's request behavior but calls each provider's
// API directly instead of going through the Vercel AI Gateway. The model slug
// is still resolved from models.json (so maxTokens, temperature, reasoning
// effort and other providerOptions are preserved); only the transport differs.
// The provider is chosen from the "<provider>/" prefix of config.model:
//
//   openai/gpt-5.2          -> OPENAI_API_KEY
//   deepseek/deepseek-v3.2  -> DEEPSEEK_API_KEY
//   anthropic/<model-id>    -> ANTHROPIC_API_KEY
//

const defaultRetryOptions: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
};

const directProviders = ["openai", "deepseek", "anthropic"] as const;
type DirectProvider = (typeof directProviders)[number];

const apiKeyEnvByProvider: Record<DirectProvider, string> = {
  openai: "OPENAI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

function getProvider(fullModel: string): string {
  const provider = fullModel.split("/")[0];
  if (!provider) {
    throw new Error(`Invalid model id "${fullModel}". Expected "<provider>/<model-id>".`);
  }
  return provider;
}

function isDirectProvider(provider: string): provider is DirectProvider {
  return (directProviders as readonly string[]).includes(provider);
}

// Whether a models.json slug can be served by a direct provider (vs. needing
// the gateway). Resolves the slug's config and inspects its provider prefix.
export function isDirectProviderSlug(
  modelsJsonPath: string,
  modelSlug: string
): boolean {
  return isDirectProvider(
    getProvider(resolveModelConfig(modelsJsonPath, modelSlug).model)
  );
}

function resolveLanguageModel(fullModel: string): LanguageModel {
  const provider = getProvider(fullModel);
  if (!isDirectProvider(provider)) {
    throw new Error(
      `Direct mode does not support provider "${provider}" (model "${fullModel}"). ` +
        `Supported: ${directProviders.join(", ")}.`
    );
  }

  const apiKeyEnv = apiKeyEnvByProvider[provider];
  if (!process.env[apiKeyEnv]) {
    throw new Error(
      `Direct model "${fullModel}" requires the ${apiKeyEnv} environment variable.`
    );
  }

  const modelId = fullModel.slice(provider.length + 1);
  switch (provider) {
    case "openai":
      return createOpenAI()(modelId);
    case "deepseek":
      return createDeepSeek()(modelId);
    case "anthropic":
      return createAnthropic()(modelId);
  }
}

// The Anthropic provider drops structured-output tool arguments in some
// configurations; ask for plain JSON and extract it instead. (Mirrors the
// gateway model's workaround.)
function extractJson(text: string): string {
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fenceMatch = withoutThink.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const start = withoutThink.indexOf("{");
  const end = withoutThink.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return withoutThink;
  return withoutThink.slice(start, end + 1);
}

function buildModel(config: ModelConfig): Model {
  const languageModel = resolveLanguageModel(config.model);
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    onRetry: createLogRetryHandler(config.model),
  };
  const providerOptions = config.providerOptions as
    | Record<string, Record<string, never>>
    | undefined;

  return {
    async getTextResponse(request: ModelRequest): Promise<string> {
      const result = await withRetry(
        () =>
          generateText({
            model: languageModel,
            system: request.messages.find(m => m.role === "system")?.content,
            messages: request.messages
              .filter(m => m.role !== "system")
              .map(m => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            maxOutputTokens: request.maxTokens ?? config.maxTokens,
            temperature: request.temperature ?? config.temperature,
            providerOptions,
            maxRetries: 0,
          }),
        retryOptions
      );

      return result.text;
    },

    async getStructuredResponse<T>(request: TypedModelRequest<T>): Promise<T> {
      const outputSchema = toJsonSchema(request.outputType);
      const maxTokens = request.maxTokens ?? config.maxTokens;
      const temperature = request.temperature ?? config.temperature;
      const systemMessage = request.messages.find(
        m => m.role === "system"
      )?.content;
      const userMessages = request.messages
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      if (config.model.startsWith("anthropic/")) {
        const schemaInstruction =
          "Respond with a single JSON object that strictly conforms to this JSON Schema. " +
          "Output JSON only — no prose, no code fences, no <think> tags.\n\n" +
          JSON.stringify(outputSchema);
        const combinedSystem = systemMessage
          ? `${systemMessage}\n\n${schemaInstruction}`
          : schemaInstruction;

        return withRetry(async () => {
          const result = await generateText({
            model: languageModel,
            system: combinedSystem,
            messages: userMessages,
            maxOutputTokens: maxTokens,
            temperature,
            providerOptions: providerOptions as any,
            maxRetries: 0,
          });

          const parsed = JSON.parse(extractJson(result.text));
          return v.parse(request.outputType, parsed);
        }, retryOptions);
      }

      return withRetry(async () => {
        const result = await generateObject({
          model: languageModel,
          system: systemMessage,
          messages: userMessages,
          schema: jsonSchema(outputSchema),
          maxOutputTokens: maxTokens,
          temperature,
          providerOptions: providerOptions as any,
          maxRetries: 0,
        });

        return v.parse(request.outputType, result.object);
      }, retryOptions);
    },
  };
}

export function createDirectModel(
  modelsJsonPath: string,
  modelSlug: string
): Model {
  return buildModel(resolveModelConfig(modelsJsonPath, modelSlug));
}
