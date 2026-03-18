const MODULES = [
  {
    slug: 'sea-moss-101',
    title: 'Sea Moss 101',
    summary: 'Understand sourcing, quality markers, and a realistic daily routine.',
    description:
      'A practical starter path for learning what sea moss is, how sourcing changes quality, and how to build a routine that fits your week.',
    category: 'Foundations',
    difficulty: 'Beginner',
    themeGradient: 'from-emerald-500 to-green-600',
    tags: ['sea moss', 'foundations', 'nutrition'],
    sections: [
      {
        id: 'origins-and-quality',
        title: 'Origins And Quality',
        order: 1,
        lessons: [
          {
            id: 'where-sea-moss-grows',
            title: 'Where Sea Moss Grows',
            order: 1,
            durationSec: 300,
            isPreview: true,
            previewText: 'Where sea moss grows and how location impacts mineral density.',
            content: {
              paragraphs: [
                'Wildcrafted sea moss usually grows on rocky coastlines where ocean currents move nutrients quickly through shallow beds.',
                'Growing region matters because water quality, salinity, and harvesting methods all influence final texture and nutrient profile.',
                'You should expect slight variation between batches, and that variation is normal for whole-food marine ingredients.'
              ],
              keyTakeaways: [
                'Source transparency is more valuable than generic marketing claims.',
                'Regional variation is expected in real food products.',
                'Consistent quality starts with consistent harvesting standards.'
              ],
              actionSteps: [
                'Check the label for harvest region.',
                'Ask whether the product is raw or heavily processed.',
                'Track how your body responds over two weeks.'
              ]
            }
          },
          {
            id: 'quality-markers-that-matter',
            title: 'Quality Markers That Matter',
            order: 2,
            durationSec: 360,
            isPreview: false,
            previewText: 'How to read labels and identify over-processed blends.',
            content: {
              paragraphs: [
                'Quality labels should include origin, ingredient list clarity, and storage guidance that matches the product format.',
                'A short ingredient list is usually easier to verify than blends with many fillers or sweeteners.',
                'When products hide sourcing details, your confidence in consistency drops.'
              ],
              keyTakeaways: [
                'Prioritize traceability over hype language.',
                'Avoid products that bury core ingredient percentages.',
                'Choose formats you can store and use consistently.'
              ],
              actionSteps: [
                'Compare two product labels side by side.',
                'Highlight unknown ingredients and research them.',
                'Keep only one starter product for your first month.'
              ]
            }
          }
        ]
      },
      {
        id: 'daily-routine',
        title: 'Daily Routine Setup',
        order: 2,
        lessons: [
          {
            id: 'timing-and-serving-cadence',
            title: 'Timing And Serving Cadence',
            order: 1,
            durationSec: 420,
            isPreview: false,
            previewText: 'Simple serving cadence for mornings, workouts, and recovery windows.',
            content: {
              paragraphs: [
                'Most people benefit from a small, repeatable intake window instead of large servings on random days.',
                'Pairing your routine with hydration and meals can improve comfort while reducing digestive friction.',
                'A consistent cadence makes it easier to evaluate benefits objectively.'
              ],
              keyTakeaways: [
                'Consistency beats intensity.',
                'Hydration and timing matter as much as quantity.',
                'Use one routine for at least two weeks before changing.'
              ],
              actionSteps: [
                'Pick a default daily time.',
                'Set a reminder for 14 days.',
                'Note energy and digestion markers in a simple log.'
              ]
            }
          },
          {
            id: 'building-a-sustainable-plan',
            title: 'Building A Sustainable Plan',
            order: 2,
            durationSec: 300,
            isPreview: false,
            previewText: 'Build a schedule that survives busy days and travel weeks.',
            content: {
              paragraphs: [
                'A sustainable plan uses defaults instead of perfect days. If a routine breaks under stress, it is not durable enough.',
                'Linking your intake to existing habits makes adherence easier than relying on motivation alone.',
                'Review your plan weekly and make one change at a time.'
              ],
              keyTakeaways: [
                'Design for real life, not ideal routines.',
                'Habit stacking improves adherence.',
                'Small adjustments compound over time.'
              ],
              actionSteps: [
                'Attach intake to breakfast or post-workout.',
                'Create a fallback plan for missed days.',
                'Review and adjust once every Sunday.'
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: 'minerals-science',
    title: 'The Science Of 92 Minerals',
    summary: 'Break down the mineral profile and understand practical balance.',
    description:
      'A practical science module on mineral diversity, electrolyte balance, and how to think about supplementation without over-stacking.',
    category: 'Science',
    difficulty: 'Intermediate',
    themeGradient: 'from-blue-500 to-cyan-600',
    tags: ['minerals', 'science', 'electrolytes'],
    sections: [
      {
        id: 'mineral-foundation',
        title: 'Mineral Foundation',
        order: 1,
        lessons: [
          {
            id: 'mineral-profile-basics',
            title: 'Mineral Profile Basics',
            order: 1,
            durationSec: 420,
            isPreview: true,
            previewText: 'A practical breakdown of mineral diversity and why balance matters.',
            content: {
              paragraphs: [
                'Minerals work in systems, not isolation. Ratios and co-factors often matter more than isolated high-dose intake.',
                'When people talk about broad mineral profiles, the key value is usually resilience and nutritional coverage.',
                'You should combine mineral-rich foods with hydration and overall diet quality for best outcomes.'
              ],
              keyTakeaways: [
                'Balance matters more than one nutrient headline.',
                'Mineral synergy supports performance and recovery.',
                'Diet quality still drives long-term outcomes.'
              ],
              actionSteps: [
                'Audit your hydration habits this week.',
                'Track sodium and potassium intake from food.',
                'Avoid changing multiple supplements at once.'
              ]
            }
          },
          {
            id: 'electrolyte-interplay',
            title: 'Electrolyte Interplay',
            order: 2,
            durationSec: 360,
            isPreview: false,
            previewText: 'How hydration, sodium, and potassium interplay with mineral intake.',
            content: {
              paragraphs: [
                'Electrolyte status shifts during heat, exercise, and low-carb phases, so intake should be contextual.',
                'Hydration without electrolyte balance can still leave you feeling flat or cramp-prone.',
                'Simple tracking helps identify whether your issue is fluid intake, sodium intake, or both.'
              ],
              keyTakeaways: [
                'Hydration and electrolytes are paired systems.',
                'Context changes needs day to day.',
                'Track before over-correcting.'
              ],
              actionSteps: [
                'Use a hydration baseline for one week.',
                'Adjust sodium gradually if needed.',
                'Re-check sleep, stress, and meal timing as confounders.'
              ]
            }
          }
        ]
      },
      {
        id: 'safe-supplement-strategy',
        title: 'Safe Supplement Strategy',
        order: 2,
        lessons: [
          {
            id: 'avoiding-overlap',
            title: 'Avoiding Supplement Overlap',
            order: 1,
            durationSec: 330,
            isPreview: false,
            previewText: 'What to watch for when combining mineral-rich products and supplements.',
            content: {
              paragraphs: [
                'Stacking products with overlapping micronutrients can create unnecessary excess without improving outcomes.',
                'A simple inventory of your current stack prevents accidental duplication.',
                'Prioritize symptom tracking and lab guidance over trend-driven combinations.'
              ],
              keyTakeaways: [
                'More products does not always mean better results.',
                'Inventory your stack before adding anything new.',
                'Use objective feedback where possible.'
              ],
              actionSteps: [
                'List all daily supplements in one note.',
                'Flag overlapping nutrient categories.',
                'Pause one overlapping item and reassess.'
              ]
            }
          },
          {
            id: 'evidence-based-adjustments',
            title: 'Evidence-Based Adjustments',
            order: 2,
            durationSec: 360,
            isPreview: false,
            previewText: 'Use small evidence-based adjustments instead of aggressive stack changes.',
            content: {
              paragraphs: [
                'Adjustments work best in small increments with enough time to observe outcomes.',
                'The same protocol can affect people differently because of baseline diet, activity, and sleep quality.',
                'Use one-variable changes to preserve signal quality in your tracking.'
              ],
              keyTakeaways: [
                'One-variable tests produce clearer insights.',
                'Context determines response.',
                'Measurement beats assumptions.'
              ],
              actionSteps: [
                'Choose one metric to track this week.',
                'Change only one protocol variable.',
                'Review results every seven days.'
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: 'thyroid-support',
    title: 'Thyroid Support And Iodine',
    summary: 'Understand iodine context, boundaries, and sustainable thyroid support habits.',
    description:
      'Learn how iodine contributes to thyroid function, what over-stacking risks look like, and how to make thoughtful routine decisions.',
    category: 'Health Benefits',
    difficulty: 'Intermediate',
    themeGradient: 'from-rose-500 to-red-600',
    tags: ['thyroid', 'iodine', 'metabolism'],
    sections: [
      {
        id: 'iodine-foundations',
        title: 'Iodine Foundations',
        order: 1,
        lessons: [
          {
            id: 'iodine-role-in-thyroid',
            title: 'Iodine Role In Thyroid Function',
            order: 1,
            durationSec: 330,
            isPreview: true,
            previewText: 'How iodine supports healthy thyroid rhythm and metabolism.',
            content: {
              paragraphs: [
                'Iodine contributes to thyroid hormone production, which influences energy regulation and metabolic rhythm.',
                'The goal is adequate intake, not aggressive intake. More is not always better.',
                'Consistency and context matter more than one-off high-dose strategies.'
              ],
              keyTakeaways: [
                'Adequacy beats excess for long-term support.',
                'Routine consistency matters.',
                'Metabolic changes should be observed over time.'
              ],
              actionSteps: [
                'Track your iodine sources for one week.',
                'Avoid stacking multiple high-iodine products suddenly.',
                'Monitor energy and recovery patterns.'
              ]
            }
          },
          {
            id: 'iodine-boundaries',
            title: 'Iodine Boundaries And Overlap',
            order: 2,
            durationSec: 300,
            isPreview: false,
            previewText: 'When to avoid over-stacking iodine across multiple products.',
            content: {
              paragraphs: [
                'Common overlap happens when multivitamins, sea vegetables, and specialty blends all include iodine.',
                'Overlapping stacks can blur what is helping and what may be causing discomfort.',
                'Use a structured inventory before introducing another iodine source.'
              ],
              keyTakeaways: [
                'Stack awareness reduces avoidable risk.',
                'Keep intake decisions transparent and trackable.',
                'Adjust slowly and deliberately.'
              ],
              actionSteps: [
                'Review all labels in your current stack.',
                'Remove duplicate iodine sources for two weeks.',
                'Reintroduce only if needed with clear goals.'
              ]
            }
          }
        ]
      },
      {
        id: 'provider-conversations',
        title: 'Provider Conversations',
        order: 2,
        lessons: [
          {
            id: 'questions-for-your-provider',
            title: 'Questions For Your Provider',
            order: 1,
            durationSec: 270,
            isPreview: false,
            previewText: 'Questions to ask before introducing thyroid-focused routines.',
            content: {
              paragraphs: [
                'A clear provider conversation starts with your goals, current intake, and any symptom timeline.',
                'Bring your existing supplement list and recent changes to improve decision quality.',
                'Clarify what outcomes to monitor and when to reassess.'
              ],
              keyTakeaways: [
                'Preparation improves appointment outcomes.',
                'Context is critical for safe guidance.',
                'Set review checkpoints in advance.'
              ],
              actionSteps: [
                'Create a one-page supplement summary.',
                'List your top three questions in advance.',
                'Set a follow-up check date.'
              ]
            }
          },
          {
            id: 'decision-framework',
            title: 'Thyroid Decision Framework',
            order: 2,
            durationSec: 300,
            isPreview: false,
            previewText: 'A repeatable framework for making thyroid-support decisions safely.',
            content: {
              paragraphs: [
                'Use a simple framework: baseline, change one variable, track outcomes, then decide.',
                'This prevents reactive changes driven by short-term noise.',
                'Consistency in logging gives you higher confidence in your decisions.'
              ],
              keyTakeaways: [
                'Frameworks reduce guesswork.',
                'One-variable testing protects signal quality.',
                'Time horizon matters for endocrine-related changes.'
              ],
              actionSteps: [
                'Record your baseline this week.',
                'Pick one adjustment only.',
                'Review outcomes after 14 days.'
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: 'immunity-boost',
    title: 'Immunity And Immune Response',
    summary: 'Build immune resilience habits with realistic daily behavior pairings.',
    description:
      'Understand how polysaccharides and minerals support immune resilience and how to pair nutrition with repeatable habits.',
    category: 'Health Benefits',
    difficulty: 'Beginner',
    themeGradient: 'from-indigo-500 to-purple-600',
    tags: ['immunity', 'recovery', 'wellness'],
    sections: [
      {
        id: 'immune-mechanisms',
        title: 'Immune Mechanisms',
        order: 1,
        lessons: [
          {
            id: 'polysaccharides-and-resilience',
            title: 'Polysaccharides And Resilience',
            order: 1,
            durationSec: 300,
            isPreview: true,
            previewText: 'How polysaccharides may support immune resilience and recovery windows.',
            content: {
              paragraphs: [
                'Immune support is usually cumulative and lifestyle-dependent, not an instant switch.',
                'Polysaccharide-rich foods can support broader nutritional resilience when used consistently.',
                'Sleep, hydration, and stress load still set the baseline for immune performance.'
              ],
              keyTakeaways: [
                'Immune outcomes are multi-factor.',
                'Nutrition supports, but does not replace, fundamentals.',
                'Consistency drives meaningful change.'
              ],
              actionSteps: [
                'Track sleep and hydration with your intake routine.',
                'Use the same intake window daily.',
                'Review weekly rather than daily for trends.'
              ]
            }
          },
          {
            id: 'immune-routine-pairings',
            title: 'Immune Routine Pairings',
            order: 2,
            durationSec: 330,
            isPreview: false,
            previewText: 'Daily behavior pairings that amplify immune-support outcomes.',
            content: {
              paragraphs: [
                'Pairing intake with hydration and movement can improve routine reliability and perceived benefits.',
                'The biggest gains often come from reducing inconsistent habits, not adding complexity.',
                'Anchor your protocol to one non-negotiable daily behavior.'
              ],
              keyTakeaways: [
                'Behavior pairing improves execution.',
                'Lower complexity usually improves adherence.',
                'Consistency creates momentum.'
              ],
              actionSteps: [
                'Choose one anchor behavior.',
                'Set a two-minute prep routine.',
                'Track completion streak for 14 days.'
              ]
            }
          }
        ]
      },
      {
        id: 'long-term-planning',
        title: 'Long-Term Planning',
        order: 2,
        lessons: [
          {
            id: 'avoid-short-term-spikes',
            title: 'Avoid Short-Term Spikes',
            order: 1,
            durationSec: 270,
            isPreview: false,
            previewText: 'Build a sustainable routine instead of short-term spikes.',
            content: {
              paragraphs: [
                'Short bursts are common but hard to sustain. A moderate baseline routine usually performs better over months.',
                'Plan for interruptions instead of assuming perfect continuity.',
                'A weekly reset ritual can restore consistency after disruptions.'
              ],
              keyTakeaways: [
                'Sustainability beats intensity.',
                'Plan for disruptions in advance.',
                'Weekly resets protect long-term consistency.'
              ],
              actionSteps: [
                'Define your minimum viable routine.',
                'Create a travel/weekend fallback.',
                'Use Sunday reset to prep the next week.'
              ]
            }
          },
          {
            id: 'progress-review-loop',
            title: 'Progress Review Loop',
            order: 2,
            durationSec: 300,
            isPreview: false,
            previewText: 'How to evaluate progress without overreacting to daily noise.',
            content: {
              paragraphs: [
                'Daily variability is normal, so evaluate in weekly blocks and note broader patterns.',
                'Define a small set of markers to avoid decision fatigue.',
                'Use trend review to decide whether to keep, adjust, or pause.'
              ],
              keyTakeaways: [
                'Weekly trend reviews are more reliable than daily reactions.',
                'Simple scorecards improve clarity.',
                'Decisions should be explicit and time-bound.'
              ],
              actionSteps: [
                'Pick three weekly markers.',
                'Score each marker 1-5.',
                'Document one planned adjustment per review.'
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: 'digestive-health',
    title: 'Digestive Health And Gut Wellness',
    summary: 'Use gradual ramping and hydration timing to improve digestive comfort.',
    description:
      'Learn practical strategies for introducing fiber-rich routines, supporting gut comfort, and reducing avoidable digestive friction.',
    category: 'Health Benefits',
    difficulty: 'Beginner',
    themeGradient: 'from-amber-500 to-orange-600',
    tags: ['digestion', 'gut health', 'routine'],
    sections: [
      {
        id: 'digestive-foundations',
        title: 'Digestive Foundations',
        order: 1,
        lessons: [
          {
            id: 'fiber-and-hydration-timing',
            title: 'Fiber And Hydration Timing',
            order: 1,
            durationSec: 300,
            isPreview: true,
            previewText: 'Fiber, prebiotic support, and hydration timing for better comfort.',
            content: {
              paragraphs: [
                'Fiber-rich routines generally work better when hydration is consistent and intake ramps gradually.',
                'Rapid changes in intake can increase temporary discomfort for some people.',
                'Pairing intake with meal timing helps many users tolerate changes better.'
              ],
              keyTakeaways: [
                'Hydration is part of digestive strategy, not separate from it.',
                'Gradual ramping improves tolerance.',
                'Meal pairing can smooth transitions.'
              ],
              actionSteps: [
                'Increase gradually over 7-10 days.',
                'Track hydration with each serving.',
                'Adjust timing if discomfort appears.'
              ]
            }
          },
          {
            id: 'ramp-protocol',
            title: 'Ramp Protocol For New Routines',
            order: 2,
            durationSec: 330,
            isPreview: false,
            previewText: 'How to ramp intake gradually and reduce digestive friction.',
            content: {
              paragraphs: [
                'A ramp protocol starts below your target intake and increases stepwise over several days.',
                'This gives your system time to adapt while preserving consistency.',
                'Do not stack major nutrition changes during the same adaptation window.'
              ],
              keyTakeaways: [
                'Stepwise increase improves adaptation.',
                'Avoid multi-variable changes during ramp.',
                'Consistency matters more than speed.'
              ],
              actionSteps: [
                'Define your week-one baseline.',
                'Increase every 2-3 days if tolerated.',
                'Pause escalation if symptoms rise.'
              ]
            }
          }
        ]
      },
      {
        id: 'adjustment-signals',
        title: 'Adjustment Signals',
        order: 2,
        lessons: [
          {
            id: 'reading-body-feedback',
            title: 'Reading Body Feedback',
            order: 1,
            durationSec: 270,
            isPreview: false,
            previewText: 'Recognize signals that your routine needs adjustment.',
            content: {
              paragraphs: [
                'Signal tracking helps you distinguish adaptation effects from protocol mismatch.',
                'Comfort trends over several days are usually more meaningful than single-day spikes.',
                'Use logs to make decisions calmly and avoid reactive overcorrection.'
              ],
              keyTakeaways: [
                'Trends matter more than one-off events.',
                'Logs improve decision quality.',
                'Calm adjustments reduce churn.'
              ],
              actionSteps: [
                'Use a 3-day rolling comfort score.',
                'Record meal and hydration context.',
                'Adjust one variable at a time.'
              ]
            }
          },
          {
            id: 'digestive-maintenance-plan',
            title: 'Digestive Maintenance Plan',
            order: 2,
            durationSec: 300,
            isPreview: false,
            previewText: 'Turn your short-term protocol into a durable maintenance plan.',
            content: {
              paragraphs: [
                'Maintenance planning means deciding your minimum baseline and your flexible range.',
                'This protects continuity during travel, stress, and schedule changes.',
                'A durable plan should feel easy to execute most days.'
              ],
              keyTakeaways: [
                'Minimum baselines prevent all-or-nothing cycles.',
                'Flexibility protects consistency.',
                'Ease of execution is part of good design.'
              ],
              actionSteps: [
                'Set a minimum baseline for busy days.',
                'Define your normal range for regular weeks.',
                'Review and refine monthly.'
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: 'skin-wellness',
    title: 'Skin Health And Collagen Support',
    summary: 'Connect hydration, mineral intake, and consistency to visible skin outcomes.',
    description:
      'Explore practical skin-support frameworks that combine hydration, mineral-dense nutrition, and realistic expectation setting.',
    category: 'Health Benefits',
    difficulty: 'Beginner',
    themeGradient: 'from-pink-500 to-rose-600',
    tags: ['skin', 'collagen', 'hydration'],
    sections: [
      {
        id: 'skin-foundations',
        title: 'Skin Foundations',
        order: 1,
        lessons: [
          {
            id: 'hydration-and-skin-texture',
            title: 'Hydration And Skin Texture',
            order: 1,
            durationSec: 300,
            isPreview: true,
            previewText: 'How hydration and mineral intake can influence skin texture.',
            content: {
              paragraphs: [
                'Hydration, sleep, and stress management often influence skin appearance as much as topical products.',
                'Nutrition protocols should be evaluated in combination with these basics.',
                'Visible changes usually follow consistency more than short bursts.'
              ],
              keyTakeaways: [
                'Skin outcomes are multi-factor.',
                'Hydration supports visible texture changes over time.',
                'Consistency is the primary lever.'
              ],
              actionSteps: [
                'Track hydration and sleep for two weeks.',
                'Use one nutrition protocol consistently.',
                'Reassess with photos under similar lighting.'
              ]
            }
          },
          {
            id: 'collagen-support-habits',
            title: 'Collagen-Support Habits',
            order: 2,
            durationSec: 330,
            isPreview: false,
            previewText: 'Pair nutrient-dense intake with collagen-support habits.',
            content: {
              paragraphs: [
                'Collagen-support outcomes depend on nutrition, protein adequacy, hydration, and recovery quality.',
                'Pairing habits reduces fragmentation and improves long-term execution.',
                'Use routines that are easy to keep during busy weeks.'
              ],
              keyTakeaways: [
                'Pairing habits improves adherence.',
                'Protein and hydration are core inputs.',
                'Simple routines sustain better than complex ones.'
              ],
              actionSteps: [
                'Define a morning hydration ritual.',
                'Confirm daily protein baseline.',
                'Bundle intake with one stable habit.'
              ]
            }
          }
        ]
      },
      {
        id: 'expectations-and-timeline',
        title: 'Expectations And Timeline',
        order: 2,
        lessons: [
          {
            id: 'realistic-timeline',
            title: 'Realistic Timeline For Changes',
            order: 1,
            durationSec: 270,
            isPreview: false,
            previewText: 'Set realistic timelines for noticing surface-level improvements.',
            content: {
              paragraphs: [
                'Skin changes are usually gradual. Expect trend shifts over weeks, not overnight transformations.',
                'Documenting baseline and checkpoints prevents false conclusions.',
                'Avoid changing multiple routines during your observation window.'
              ],
              keyTakeaways: [
                'Gradual progress is normal.',
                'Baseline tracking prevents bias.',
                'Single-variable testing improves insight.'
              ],
              actionSteps: [
                'Take baseline photos in consistent lighting.',
                'Set a two-week and four-week check.',
                'Keep routine changes minimal during observation.'
              ]
            }
          },
          {
            id: 'long-term-skin-routine',
            title: 'Long-Term Skin Routine Blueprint',
            order: 2,
            durationSec: 300,
            isPreview: false,
            previewText: 'Create a skin-support blueprint that remains stable through schedule shifts.',
            content: {
              paragraphs: [
                'Long-term routines should include minimum viable habits for busy weeks and full protocols for normal weeks.',
                'The objective is continuity across seasons and stress cycles.',
                'Review your plan monthly and simplify whenever adherence slips.'
              ],
              keyTakeaways: [
                'Continuity is the long-term multiplier.',
                'Flexible baselines protect routine stability.',
                'Simplification is a valid optimization.'
              ],
              actionSteps: [
                'Define your minimum viable skin-support routine.',
                'Keep a weekly completion score.',
                'Simplify one part of the routine each month.'
              ]
            }
          }
        ]
      }
    ]
  }
];

export const LEARNING_MODULE_SEED = MODULES;
