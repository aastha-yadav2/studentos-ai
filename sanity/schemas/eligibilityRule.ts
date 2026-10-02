import { defineField, defineType } from "sanity"

export const eligibilityRule = defineType({
  name: "eligibilityRule",
  title: "Eligibility Rule",
  type: "document",
  fields: [
    defineField({
      name: "ruleType",
      title: "Rule Type",
      type: "string",
      options: {
        list: [
          { title: "Academic Status / Degree", value: "academic" },
          { title: "Age Criterion", value: "age" },
          { title: "Location / Residency", value: "location" },
          { title: "Prerequisite Skills", value: "skills" },
          { title: "Membership / Affiliation", value: "affiliation" },
          { title: "General Eligibility", value: "general" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Rule Description",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "required",
      title: "Mandatory Blocker Flag",
      type: "boolean",
      description: "If true, failing this rule makes student strictly NOT ELIGIBLE.",
      initialValue: true,
    }),
    defineField({
      name: "degree",
      title: "Allowed Degrees",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "year",
      title: "Allowed Academic Years / Semesters",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "location",
      title: "Allowed Locations",
      type: "string",
    }),
    defineField({
      name: "skills",
      title: "Required Skill References",
      type: "array",
      of: [{ type: "reference", to: [{ type: "skill" }] }],
    }),
  ],
})
