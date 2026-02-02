import {Benchmark, ModelMessage} from "@korabench/core";
import * as R from "remeda";
import {generateNextUserMessage} from "./generateUserMessage.js";
import {AssessmentGrade} from "./model/assessmentGrade.js";
import {BehaviorAssessment} from "./model/behaviorAssessment.js";
import {RiskCategory} from "./model/riskCategory.js";
import {
  RunAssessmentSums,
  RunBehaviorSums,
  RunResult,
  RunResultScore,
} from "./model/runResult.js";
import {Scenario} from "./model/scenario.js";
import {ScenarioKey} from "./model/scenarioKey.js";
import {TestAssessment} from "./model/testAssessment.js";
import {TestResult} from "./model/testResult.js";
import {conversationToAssessmentPrompt} from "./prompts/conversationToAssessmentPrompt.js";
import {conversationToBehaviorAssessmentPrompt} from "./prompts/conversationToBehaviorAssessmentPrompt.js";
import {conversationToNextMessagePrompt} from "./prompts/conversationToNextMessagePrompt.js";

const conversationLength = 3;

export const benchmark = Benchmark.new({
  scenarioType: Scenario.io,
  testResultType: TestResult.io,
  runResultType: RunResult.io,
  async generateScenarios() {
    // TODO: Move from scripts.
    return [];
  },
  mapScenarioToKeys(scenario) {
    return R.pipe(scenario, Scenario.toKeys, R.map(ScenarioKey.toString));
  },
  async runTest(c, scenario, keyString) {
    const key = ScenarioKey.ofString(keyString);
    const riskCategory = RiskCategory.find(scenario.riskCategoryId);
    const risk = RiskCategory.findRisk(riskCategory, scenario.riskId);
    const prompt = key.prompt;
    const promptAgeRange = ScenarioKey.toAgeRange(key);

    // Multi-turn conversation.
    const messages: ModelMessage[] = [];

    for (let i = 0; i < conversationLength; i++) {
      const turnNumber = i + 1;
      const userMessage = await c.runStep(
        `User message ${turnNumber}`,
        async c => {
          if (i === 0) {
            return scenario.firstUserMessage;
          }

          return generateNextUserMessage(c, risk, scenario, messages);
        }
      );

      // TODO: Maybe assert refusal of user model.

      messages.push({
        role: "user",
        content: userMessage,
      });

      const modelMessage = await c.runStep(
        `Model message ${turnNumber}`,
        async c => {
          const modelPrompt = conversationToNextMessagePrompt({
            ageRange: promptAgeRange,
            modelMemory: scenario.modelMemory,
          });
          const {output} = await c.getAssistantResponse({
            messages: [
              {
                role: "system",
                content: modelPrompt.input,
              },
              ...messages,
            ],
          });
          return output;
        }
      );

      messages.push({
        role: "assistant",
        content: modelMessage,
      });
    }

    // TODO: Maybe evaluate that conversation matches risk profile.

    // Safety assessment.
    const assessment = await c.runStep("Safety assessment", async c => {
      const assessmentPrompt = conversationToAssessmentPrompt(
        risk,
        scenario,
        messages
      );

      const {output} = await c.getJudgeResponse({
        messages: [
          {
            role: "system",
            content: assessmentPrompt.system,
          },
          {
            role: "user",
            content: assessmentPrompt.user,
          },
        ],
        outputType: TestAssessment.io,
      });

      return output;
    });

    // Behavior assessment.
    const behaviorAssessment = await c.runStep(
      "Behavior assessment",
      async c => {
        const behaviorPrompt = conversationToBehaviorAssessmentPrompt(
          scenario,
          messages
        );

        const {output} = await c.getJudgeResponse({
          messages: [
            {
              role: "system",
              content: behaviorPrompt.system,
            },
            {
              role: "user",
              content: behaviorPrompt.user,
            },
          ],
          outputType: BehaviorAssessment.io,
        });

        return output;
      }
    );

    return {
      scenario,
      prompt,
      messages,
      assessment,
      behaviorAssessment,
    };
  },
  mapTestResultToRunResult(result) {
    const {assessment, behaviorAssessment} = result;

    // [failing, adequate, exemplary]
    function gradeSums(grade: AssessmentGrade): RunAssessmentSums {
      return [
        grade === "failing" ? 1 : 0,
        grade === "adequate" ? 1 : 0,
        grade === "exemplary" ? 1 : 0,
      ];
    }

    // [failing, adequate, exemplary, occurrenceCount]
    function behaviorGradeSums(
      grade: AssessmentGrade,
      occurrenceCount: number
    ): RunBehaviorSums {
      const [f, a, e] = gradeSums(grade);
      return [f, a, e, occurrenceCount];
    }

    return {
      scores: [
        {
          riskCategoryId: result.scenario.riskCategoryId,
          riskId: result.scenario.riskId,
          ageRange: result.scenario.ageRange,
          prompt: result.prompt,
          sums: {
            al: 1,
            as: gradeSums(assessment.grade),
            an: behaviorGradeSums(
              behaviorAssessment.anthropomorphism.grade,
              behaviorAssessment.anthropomorphism.occurrenceCount
            ),
            eh: behaviorGradeSums(
              behaviorAssessment.epistemicHumility.grade,
              behaviorAssessment.epistemicHumility.occurrenceCount
            ),
            hr: behaviorGradeSums(
              behaviorAssessment.humanRedirection.grade,
              behaviorAssessment.humanRedirection.occurrenceCount
            ),
          },
        },
      ],
    };
  },
  reduceRunResult(result1, result2) {
    // [failing, adequate, exemplary]
    function reduceGradeSums(
      a: RunAssessmentSums,
      b: RunAssessmentSums
    ): RunAssessmentSums {
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    // [failing, adequate, exemplary, occurrenceCount]
    function reduceBehaviorGradeSums(
      a: RunBehaviorSums,
      b: RunBehaviorSums
    ): RunBehaviorSums {
      return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
    }

    const scores = R.pipe(
      result1.scores,
      R.concat(result2.scores),
      R.groupBy(
        s => `${s.riskCategoryId}:${s.riskId}:${s.ageRange}:${s.prompt}`
      ),
      R.values(),
      R.map(group => {
        const reduced = group.reduce((r1, r2): RunResultScore => {
          if (!r1) {
            return r2;
          }

          return {
            riskCategoryId: r1.riskCategoryId,
            riskId: r1.riskId,
            ageRange: r1.ageRange,
            prompt: r1.prompt,
            sums: {
              al: r1.sums.al + r2.sums.al,
              as: reduceGradeSums(r1.sums.as, r2.sums.as),
              an: reduceBehaviorGradeSums(r1.sums.an, r2.sums.an),
              eh: reduceBehaviorGradeSums(r1.sums.eh, r2.sums.eh),
              hr: reduceBehaviorGradeSums(r1.sums.hr, r2.sums.hr),
            },
          };
        }, undefined);

        if (!reduced) {
          throw new Error("Unexpected empty group.");
        }

        return reduced;
      })
    );

    return {scores};
  },
});
