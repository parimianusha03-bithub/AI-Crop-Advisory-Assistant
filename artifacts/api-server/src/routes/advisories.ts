import { GoogleGenAI, Type } from "@google/genai";
import {
  and,
  desc,
  eq,
  ilike,
  or,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  CreateAdvisoryBody,
  CreateAdvisoryResponse,
  DeleteAdvisoryParams,
  GetAdvisoryParams,
  GetAdvisoryResponse,
  ListAdvisoriesQueryParams,
  ListAdvisoriesResponse,
} from "@workspace/api-zod";
import { advisoriesTable, db } from "@workspace/db";

const router: IRouter = Router();

function toApiAdvisory(row: typeof advisoriesTable.$inferSelect) {
  return {
    id: row.id,
    cropName: row.cropName,
    growthStage: row.growthStage,
    soilPh: row.soilPh,
    nitrogen: row.nitrogen,
    phosphorus: row.phosphorus,
    potassium: row.potassium,
    temperatureC: row.temperatureC,
    humidityPercent: row.humidityPercent,
    rainfallMm: row.rainfallMm ?? undefined,
    symptomDescription: row.symptomDescription,
    region: row.region ?? undefined,
    diagnosis: row.diagnosis,
    createdAt: row.createdAt,
  };
}

const diagnosisSchema = {
  type: Type.OBJECT,
  properties: {
    diagnosisSummary: { type: Type.STRING },
    identifiedIssue: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
    severityLevel: {
      type: Type.STRING,
      enum: ["Low", "Moderate", "High", "Critical"],
    },
    organicTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
    chemicalTreatments: { type: Type.ARRAY, items: { type: Type.STRING } },
    preventiveMeasures: { type: Type.ARRAY, items: { type: Type.STRING } },
    estimatedYieldImpact: { type: Type.STRING },
  },
  required: [
    "diagnosisSummary",
    "identifiedIssue",
    "confidenceScore",
    "severityLevel",
    "organicTreatments",
    "chemicalTreatments",
    "preventiveMeasures",
    "estimatedYieldImpact",
  ],
};

const diagnosisValidator = z.object({
  diagnosisSummary: z.string().min(1),
  identifiedIssue: z.string().min(1),
  confidenceScore: z.number().min(0).max(100),
  severityLevel: z.enum(["Low", "Moderate", "High", "Critical"]),
  organicTreatments: z.array(z.string()),
  chemicalTreatments: z.array(z.string()),
  preventiveMeasures: z.array(z.string()),
  estimatedYieldImpact: z.string(),
});

router.get("/advisories", async (req, res): Promise<void> => {
  const parsed = ListAdvisoriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { cropName, severity, search } = parsed.data;
  const filters = [];
  if (cropName) filters.push(eq(advisoriesTable.cropName, cropName));
  if (severity) filters.push(eq(advisoriesTable.severity, severity));
  if (search) {
    const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(
      or(
        ilike(advisoriesTable.cropName, pattern),
        ilike(advisoriesTable.symptomDescription, pattern),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(advisoriesTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(advisoriesTable.createdAt))
    .limit(100);
  res.json(ListAdvisoriesResponse.parse(rows.map(toApiAdvisory)));
});

router.post("/advisories", async (req, res): Promise<void> => {
  const parsed = CreateAdvisoryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid advisory input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({
      error:
        "Gemini diagnosis is not configured. Add GEMINI_API_KEY in Replit Secrets and restart the app.",
    });
    return;
  }

  const input = parsed.data;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = [
    "You are a cautious crop health advisory assistant. Analyze the crop information and symptoms. Give practical, evidence-aware actions.",
    "Do not claim certainty from limited information. If the likely diagnosis is uncertain, say so and recommend confirmation by a local agronomist or extension worker.",
    "Chemical treatments must name only general active-ingredient classes or label-directed options; tell the farmer to follow local regulations and product labels, use PPE, and observe pre-harvest intervals.",
    "Return only JSON matching the required schema.",
    `Crop: ${input.cropName}`,
    `Growth stage: ${input.growthStage}`,
    `Region: ${input.region ?? "Not provided"}`,
    `Soil pH: ${input.soilPh}`,
    `Nutrients ppm — nitrogen: ${input.nitrogen}, phosphorus: ${input.phosphorus}, potassium: ${input.potassium}`,
    `Temperature: ${input.temperatureC} °C`,
    `Humidity: ${input.humidityPercent}%`,
    `Recent rainfall: ${input.rainfallMm ?? "Not provided"} mm`,
    `Observed symptoms: ${input.symptomDescription}`,
  ].join("\n");
  const base64 = input.imageBase64?.replace(/^data:image\/[^;]+;base64,/, "");
  const imageParts =
    base64 && input.imageMimeType
      ? [{ inlineData: { mimeType: input.imageMimeType, data: base64 } }]
      : [];

  let diagnosis: unknown;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: diagnosisSchema,
      },
    });
    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }
    diagnosis = JSON.parse(text);
  } catch (error) {
    req.log.error({ err: error }, "Gemini advisory generation failed");
    res.status(502).json({
      error:
        "The crop diagnosis could not be generated right now. Please check your Gemini API access and try again.",
    });
    return;
  }

  const diagnosisResult = diagnosisValidator.safeParse(diagnosis);
  if (!diagnosisResult.success) {
    req.log.error(
      { errors: diagnosisResult.error.message },
      "Gemini returned an invalid advisory",
    );
    res.status(502).json({ error: "Gemini returned an invalid advisory." });
    return;
  }

  const [saved] = await db
    .insert(advisoriesTable)
    .values({
      cropName: input.cropName,
      growthStage: input.growthStage,
      soilPh: input.soilPh,
      nitrogen: input.nitrogen,
      phosphorus: input.phosphorus,
      potassium: input.potassium,
      temperatureC: input.temperatureC,
      humidityPercent: input.humidityPercent,
      rainfallMm: input.rainfallMm ?? null,
      symptomDescription: input.symptomDescription,
      region: input.region ?? null,
      diagnosis: diagnosisResult.data,
      severity: diagnosisResult.data.severityLevel,
    })
    .returning();

  res.status(201).json(CreateAdvisoryResponse.parse(toApiAdvisory(saved)));
});

router.get("/advisories/:id", async (req, res): Promise<void> => {
  const params = GetAdvisoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(advisoriesTable)
    .where(eq(advisoriesTable.id, params.data.id))
    .limit(1);
  if (!row) {
    res.status(404).json({ error: "Advisory not found." });
    return;
  }
  res.json(GetAdvisoryResponse.parse(toApiAdvisory(row)));
});

router.delete("/advisories/:id", async (req, res): Promise<void> => {
  const params = DeleteAdvisoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db
    .delete(advisoriesTable)
    .where(eq(advisoriesTable.id, params.data.id))
    .returning({ id: advisoriesTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Advisory not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;
