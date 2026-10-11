import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetProfileResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from "@workspace/api-zod";
import { db, farmProfileTable } from "@workspace/db";

const router: IRouter = Router();
const profileId = "default";

async function getOrCreateProfile() {
  const [existing] = await db
    .select()
    .from(farmProfileTable)
    .where(eq(farmProfileTable.id, profileId))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(farmProfileTable)
    .values({ id: profileId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [afterConflict] = await db
    .select()
    .from(farmProfileTable)
    .where(eq(farmProfileTable.id, profileId))
    .limit(1);
  if (!afterConflict) throw new Error("Could not initialize farm profile");
  return afterConflict;
}

const toApiProfile = (profile: Awaited<ReturnType<typeof getOrCreateProfile>>) => ({
  fullName: profile.fullName,
  region: profile.region,
  role: profile.role,
  primaryCrops: profile.primaryCrops,
});

router.get("/profile", async (_req, res): Promise<void> => {
  const profile = await getOrCreateProfile();
  res.json(GetProfileResponse.parse(toApiProfile(profile)));
});

router.put("/profile", async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db
    .insert(farmProfileTable)
    .values({ id: profileId, ...parsed.data })
    .onConflictDoUpdate({
      target: farmProfileTable.id,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();
  res.json(UpdateProfileResponse.parse(toApiProfile(profile)));
});

export default router;
