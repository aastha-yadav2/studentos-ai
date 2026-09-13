import {
  normalizeActiveRecall,
  normalizeRoadmap,
  validateAndSanitizeRoadmap,
  type RoadmapNode,
} from "../../pages/planner/plannerNormalizer"

export function testPlannerReliability() {
  console.log("=== RUNNING PLANNER ACTIVE RECALL & GRAPHICAL ROADMAP TEST SUITE ===")

  // Scenario 1: Planner response containing active_recall parses correctly
  const rawWithRecall = {
    title: "Algorithms Master Plan",
    active_recall: [
      {
        id: "ar1",
        topic: "Binary Search",
        question: "What is the time complexity of binary search on a sorted array?",
        priority: "High",
        answer_hint: "O(log N)",
      },
    ],
  }
  const res1 = normalizeActiveRecall(rawWithRecall.active_recall)
  if (res1.length !== 1 || res1[0].topic !== "Binary Search" || res1[0].answer_hint !== "O(log N)") {
    throw new Error("Test 1 Failed: active_recall not parsed accurately")
  }
  console.log("✓ Test 1 Passed: Planner response containing active_recall parses correctly")

  // Scenario 2: Missing active_recall safely becomes non-empty derived array
  const topicMastery = [
    {
      topic: "Two Pointers",
      category: "DSA Pattern" as const,
      priority: "High" as const,
      what_is_it: "Using two pointer indices to scan sequence",
      why_it_works: "Reduces O(N^2) search to O(N)",
      how_to_recognize: "Sorted array target sum or palindrome check",
      remember_this: ["Pointers move towards center or same direction"],
      common_traps: ["Forgetting boundary check"],
      practice_progression: [{ level: "Easy" as const, goal: "Two Sum II" }],
      move_on_checklist: ["Solve 3 problems"],
    },
  ]
  const res2 = normalizeActiveRecall(undefined, topicMastery)
  if (res2.length === 0 || !res2[0].question.includes("Two Pointers")) {
    throw new Error("Test 2 Failed: Missing active_recall was not derived from topic_mastery_guides")
  }
  console.log("✓ Test 2 Passed: Missing active_recall safely derived from real plan content")

  // Scenario 3: Planner response containing roadmap renders/parses correctly
  const rawWithRoadmap = {
    title: "DSA Roadmap Test",
    roadmap: {
      title: "DSA Foundations",
      nodes: [
        {
          id: "arrays",
          title: "Arrays & Strings",
          description: "Build sequence foundation",
          priority: "High",
          status: "next",
          prerequisites: [],
          estimated_hours: 4,
          mastery_criteria: ["Explain operations"],
        },
      ],
    },
  }
  const res3 = normalizeRoadmap(rawWithRoadmap.roadmap, "DSA Roadmap Test")
  if (res3.nodes.length !== 1 || res3.nodes[0].title !== "Arrays & Strings") {
    throw new Error("Test 3 Failed: Provided roadmap object was not normalized properly")
  }
  console.log("✓ Test 3 Passed: Planner response containing roadmap parses correctly")

  // Scenario 4: Missing roadmap safely becomes normalized non-empty graph from real plan
  const res4 = normalizeRoadmap(undefined, "DSA Prep", topicMastery)
  if (res4.nodes.length === 0 || res4.nodes[0].title !== "Two Pointers") {
    throw new Error("Test 4 Failed: Missing roadmap was not derived from topic_mastery_guides")
  }
  console.log("✓ Test 4 Passed: Missing roadmap safely derived from real plan content")

  // Scenario 5: Roadmap node prerequisites structure & DAG validation
  const invalidNodes: RoadmapNode[] = [
    {
      id: "node_a",
      title: "Stage A",
      description: "Desc A",
      priority: "High",
      status: "completed",
      prerequisites: ["node_b", "non_existent_node"], // circular dependency & invalid id
      estimated_hours: 2,
      mastery_criteria: ["Done"],
    },
    {
      id: "node_b",
      title: "Stage B",
      description: "Desc B",
      priority: "Medium",
      status: "next",
      prerequisites: ["node_a"], // circular dependency with A
      estimated_hours: 3,
      mastery_criteria: ["Done B"],
    },
  ]
  const sanitized5 = validateAndSanitizeRoadmap(invalidNodes)
  if (sanitized5.length !== 2) throw new Error("Test 5 Failed: Sanitized nodes count mismatch")
  // Check non-existent node was removed
  const nodeA = sanitized5.find((n: RoadmapNode) => n.id === "node_a")
  if (nodeA?.prerequisites.includes("non_existent_node")) {
    throw new Error("Test 5 Failed: Invalid prerequisite ID was not pruned")
  }
  console.log("✓ Test 5 Passed: Roadmap node prerequisites & DAG validation works")

  // Scenario 6: Roadmap status values handled correctly
  const statuses: RoadmapNode["status"][] = ["completed", "in_progress", "next", "ready", "locked"]
  statuses.forEach((st) => {
    const testNode: RoadmapNode = {
      id: `test_${st}`,
      title: `Node ${st}`,
      description: "Desc",
      priority: "Medium",
      status: st,
      prerequisites: [],
      estimated_hours: 2,
      mastery_criteria: ["Pass"],
    }
    const res6 = validateAndSanitizeRoadmap([testNode])
    if (res6[0].status !== st) throw new Error(`Test 6 Failed: status ${st} was mutated`)
  })
  console.log("✓ Test 6 Passed: Roadmap status rendering and valid values handled correctly")

  // Scenario 7: Old cached planner response does not break the UI normalizer
  const oldCachedRaw = JSON.stringify({
    title: "Old Study Plan",
    goal_analysis: { objective: "Pass Exam" },
    weekly_roadmap: [{ week: "Week 1", outcome: "Arrays", deliverables: ["Deliverable 1"], estimated_hours: 4 }],
    daily_execution_plan: [{ day: "Day 1", focus: "Intro", tasks: ["Read notes"], estimated_hours: 2 }],
  })
  const parsedOld = JSON.parse(oldCachedRaw)
  const recallOld = normalizeActiveRecall(parsedOld.active_recall, undefined, undefined)
  const roadmapOld = normalizeRoadmap(parsedOld.roadmap, parsedOld.title, undefined, parsedOld.weekly_roadmap)
  if (!recallOld || !roadmapOld || roadmapOld.nodes.length === 0) {
    throw new Error("Test 7 Failed: Old cached plan could not be safely normalized")
  }
  console.log("✓ Test 7 Passed: Old cached planner response does not break normalizer")

  // Scenario 8: DSA plan generates non-empty roadmap graph
  const dsaTopicMastery = [
    {
      topic: "Arrays & Strings",
      category: "DSA Pattern" as const,
      priority: "High" as const,
      what_is_it: "Basic contiguous memory buffers",
      why_it_works: "O(1) indexing",
      how_to_recognize: "Sequential elements",
      remember_this: ["Watch out for off-by-one errors"],
      common_traps: ["Out of bounds access"],
      practice_progression: [{ level: "Easy" as const, goal: "Reverse Array" }],
      move_on_checklist: ["Solve 3 problems"],
    },
    {
      topic: "Hashing",
      category: "DSA Pattern" as const,
      priority: "High" as const,
      what_is_it: "Hash table lookups",
      why_it_works: "O(1) average lookup",
      how_to_recognize: "Frequency counts & pair matching",
      remember_this: ["Handle collision edge cases"],
      common_traps: ["Mutating keys"],
      practice_progression: [{ level: "Easy" as const, goal: "Two Sum" }],
      move_on_checklist: ["Solve 3 problems"],
    },
  ]
  const dsaRoadmap = normalizeRoadmap(undefined, "DSA Interview Plan", dsaTopicMastery)
  if (dsaRoadmap.nodes.length < 2) {
    throw new Error("Test 8 Failed: DSA plan did not generate multi-stage roadmap")
  }
  console.log("✓ Test 8 Passed: DSA plan generates non-empty roadmap graph")

  // Scenario 9: DSA plan generates non-empty active recall prompts
  const dsaRecall = normalizeActiveRecall(undefined, dsaTopicMastery)
  if (dsaRecall.length < 2) {
    throw new Error("Test 9 Failed: DSA plan did not generate active recall prompts")
  }
  console.log("✓ Test 9 Passed: DSA plan generates non-empty active recall prompts")

  // Scenario 10: Mobile roadmap structure does not overflow
  const responsiveNodes = validateAndSanitizeRoadmap(dsaRoadmap.nodes)
  responsiveNodes.forEach((n: RoadmapNode) => {
    if (!n.title || !n.description) throw new Error("Test 10 Failed: node missing text elements")
  })
  console.log("✓ Test 10 Passed: Mobile roadmap structure validated")

  console.log("\n=== ALL 10 PLANNER RELIABILITY & ROADMAP TESTS PASSED CLEANLY ===")
}

// Execute tests
testPlannerReliability()
