import { desc } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { advisoriesTable, db } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(advisoriesTable)
    .orderBy(desc(advisoriesTable.createdAt))
    .limit(100);
  const severityCounts = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
  for (const row of rows) severityCounts[row.severity] += 1;
  const toApiAdvisory = (row: (typeof rows)[number]) => ({
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
  });
  const recent = rows.slice(0, 6).map(toApiAdvisory);
  const summary = {
    totalAdvisories: rows.length,
    highRiskCount: severityCounts.High + severityCounts.Critical,
    cropCount: new Set(rows.map((row) => row.cropName)).size,
    latestAdvisory: rows[0] ? toApiAdvisory(rows[0]) : null,
    recentAdvisories: recent,
    severityCounts,
  };
  res.json(GetDashboardSummaryResponse.parse(summary));
});

export default router;
