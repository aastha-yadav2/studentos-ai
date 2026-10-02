import { defineConfig } from "sanity"
import { opportunity } from "./schemas/opportunity"
import { organization } from "./schemas/organization"
import { skill } from "./schemas/skill"
import { eligibilityRule } from "./schemas/eligibilityRule"
import { applicationProcess } from "./schemas/applicationProcess"
import { resource } from "./schemas/resource"
import { source } from "./schemas/source"

export default defineConfig({
  name: "studentos-ai-studio",
  title: "StudentOS AI Opportunity Knowledge Studio",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "p2hu7iqp",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",

  schema: {
    types: [
      opportunity,
      organization,
      skill,
      eligibilityRule,
      applicationProcess,
      resource,
      source,
    ],
  },
})
