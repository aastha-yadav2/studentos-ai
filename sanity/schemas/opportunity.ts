import { defineField, defineType } from "sanity"

export const opportunity = defineType({
  name: "opportunity",
  title: "Opportunity Knowledge",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug / Canonical Identifier",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "organization",
      title: "Organization",
      type: "reference",
      to: [{ type: "organization" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "type",
      title: "Opportunity Type",
      type: "string",
      options: {
        list: [
          { title: "Hackathon", value: "hackathon" },
          { title: "Internship", value: "internship" },
          { title: "Job", value: "job" },
          { title: "Fellowship", value: "fellowship" },
          { title: "Grant", value: "grant" },
          { title: "Competition", value: "competition" },
          { title: "Ambassador", value: "ambassador" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Comprehensive Description",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "eligibility",
      title: "Structured Eligibility Rules",
      type: "array",
      of: [{ type: "reference", to: [{ type: "eligibilityRule" }] }],
    }),
    defineField({
      name: "requiredSkills",
      title: "Required Technical & Soft Skills",
      type: "array",
      of: [{ type: "reference", to: [{ type: "skill" }] }],
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
    }),
    defineField({
      name: "remote",
      title: "Remote Allowed",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "deadline",
      title: "Application Deadline",
      type: "datetime",
    }),
    defineField({
      name: "applicationOpenDate",
      title: "Application Open Date",
      type: "datetime",
    }),
    defineField({
      name: "eventStartDate",
      title: "Event / Program Start Date",
      type: "datetime",
    }),
    defineField({
      name: "eventEndDate",
      title: "Event / Program End Date",
      type: "datetime",
    }),
    defineField({
      name: "teamSizeMin",
      title: "Min Team Size",
      type: "number",
    }),
    defineField({
      name: "teamSizeMax",
      title: "Max Team Size",
      type: "number",
    }),
    defineField({
      name: "stipendPrize",
      title: "Stipend / Prize Amount",
      type: "string",
    }),
    defineField({
      name: "applicationProcess",
      title: "Application Process & Workflow",
      type: "reference",
      to: [{ type: "applicationProcess" }],
    }),
    defineField({
      name: "resources",
      title: "Curated Preparation Resources",
      type: "array",
      of: [{ type: "reference", to: [{ type: "resource" }] }],
    }),
    defineField({
      name: "source",
      title: "Verification Source",
      type: "reference",
      to: [{ type: "source" }],
    }),
    defineField({
      name: "verificationState",
      title: "Verification State",
      type: "string",
      options: {
        list: [
          { title: "Verified", value: "verified" },
          { title: "Pending", value: "pending" },
          { title: "Deprecated", value: "deprecated" },
        ],
      },
      initialValue: "verified",
    }),
    defineField({
      name: "lastVerifiedAt",
      title: "Last Verified Timestamp",
      type: "datetime",
    }),
    defineField({
      name: "officialUrl",
      title: "Official Program URL",
      type: "url",
    }),
    defineField({
      name: "applicationUrl",
      title: "Direct Application URL",
      type: "url",
    }),
    defineField({
      name: "knowledgeBaseNotes",
      title: "Internal Knowledge Base Notes",
      type: "text",
    }),
  ],
})
