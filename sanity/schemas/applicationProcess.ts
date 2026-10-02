import { defineField, defineType } from "sanity"

export const applicationProcess = defineType({
  name: "applicationProcess",
  title: "Application Process",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Process Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "steps",
      title: "Application Steps",
      type: "array",
      of: [{ type: "string" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "documents",
      title: "Required Documents",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "selectionStages",
      title: "Selection Stages",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "stageName", title: "Stage Name", type: "string" },
            { name: "description", title: "Stage Description", type: "text" },
          ],
        },
      ],
    }),
    defineField({
      name: "estimatedEffort",
      title: "Estimated Preparation Effort",
      type: "string",
      description: "e.g. '15-20 hours over 2 weeks'",
    }),
  ],
})
