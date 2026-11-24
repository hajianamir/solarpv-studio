import { z } from "zod";
import { validateOperationalStudy } from "./operationalStudy";
const BundleSchema = z
  .object({
    format: z.literal("solarpv_operational_project"),
    schemaVersion: z.literal("1"),
    project: z
      .object({
        format: z.literal("solarpv_project_envelope"),
        projectData: z.object({ operationalStudyId: z.string() }).passthrough(),
      })
      .passthrough(),
    study: z.unknown(),
  })
  .strict();
export function createOperationalProjectBundle(
  project: unknown,
  study: unknown,
) {
  const { document } = validateOperationalStudy(study);
  const bundle = BundleSchema.parse({
    format: "solarpv_operational_project",
    schemaVersion: "1",
    project,
    study: document,
  });
  if (bundle.project.projectData.operationalStudyId !== document.id)
    throw new Error("Project/archive identity mismatch");
  return bundle;
}
export function unpackOperationalProject(input: unknown) {
  if ((input as { format?: string })?.format !== "solarpv_operational_project")
    return { project: input, study: null };
  const bundle = BundleSchema.parse(input),
    { document } = validateOperationalStudy(bundle.study);
  if (bundle.project.projectData.operationalStudyId !== document.id)
    throw new Error("Project/archive identity mismatch");
  return { project: bundle.project, study: document };
}
