import {createAnthropicModel, isAnthropicDirectSlug} from "./anthropicModel.js";
import {createDirectModel, isDirectProviderSlug} from "./directModel.js";
import {createGatewayModel} from "./gatewayModel.js";
import {Model} from "./model.js";

// Resolve a judge/user model without the Vercel AI Gateway when possible:
//   - "anthropic/<model-id>" raw slugs  -> Anthropic API directly.
//   - models.json slugs whose provider has a direct path (openai, deepseek,
//     anthropic) -> that provider's API directly, reusing the slug's config.
//   - anything else                      -> the gateway (legacy fallback).
export function createJudgeOrUserModel(
  modelsJsonPath: string,
  modelSlug: string
): Model {
  if (isAnthropicDirectSlug(modelSlug)) {
    return createAnthropicModel(modelSlug);
  }
  if (isDirectProviderSlug(modelsJsonPath, modelSlug)) {
    return createDirectModel(modelsJsonPath, modelSlug);
  }
  return createGatewayModel(modelsJsonPath, modelSlug);
}
