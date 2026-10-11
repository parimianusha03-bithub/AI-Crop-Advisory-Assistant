import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const severityLevelEnum = pgEnum("severity_level", [
  "Low",
  "Moderate",
  "High",
  "Critical",
]);

export const userRoleEnum = pgEnum("user_role", [
  "farmer",
  "agronomist",
  "admin",
]);

export type AdvisoryDiagnosis = {
  diagnosisSummary: string;
  identifiedIssue: string;
  confidenceScore: number;
  severityLevel: "Low" | "Moderate" | "High" | "Critical";
  organicTreatments: string[];
  chemicalTreatments: string[];
  preventiveMeasures: string[];
  estimatedYieldImpact: string;
};

export const advisoriesTable = pgTable("advisories", {
  id: uuid("id").primaryKey().defaultRandom(),
  cropName: varchar("crop_name", { length: 100 }).notNull(),
  growthStage: varchar("growth_stage", { length: 40 }).notNull(),
  soilPh: real("soil_ph").notNull(),
  nitrogen: integer("nitrogen").notNull(),
  phosphorus: integer("phosphorus").notNull(),
  potassium: integer("potassium").notNull(),
  temperatureC: real("temperature_c").notNull(),
  humidityPercent: real("humidity_percent").notNull(),
  rainfallMm: real("rainfall_mm"),
  symptomDescription: text("symptom_description").notNull(),
  region: varchar("region", { length: 120 }),
  diagnosis: jsonb("diagnosis").$type<AdvisoryDiagnosis>().notNull(),
  severity: severityLevelEnum("severity").notNull().default("Moderate"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAdvisorySchema = createInsertSchema(advisoriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAdvisory = z.infer<typeof insertAdvisorySchema>;
export type Advisory = typeof advisoriesTable.$inferSelect;

export const farmProfileTable = pgTable("farm_profile", {
  id: text("id").primaryKey().default("default"),
  fullName: varchar("full_name", { length: 120 }).notNull().default("Farm manager"),
  region: varchar("region", { length: 120 }).notNull().default("Central Valley"),
  role: userRoleEnum("role").notNull().default("farmer"),
  primaryCrops: text("primary_crops").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertFarmProfileSchema = createInsertSchema(farmProfileTable).omit({
  updatedAt: true,
});
export type InsertFarmProfile = z.infer<typeof insertFarmProfileSchema>;
export type FarmProfile = typeof farmProfileTable.$inferSelect;
