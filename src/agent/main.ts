import {
    type JobContext,
    ServerOptions,
    cli,
    defineAgent,
    inference,
    voice,
    tool,
} from "@livekit/agents";

import * as openai from "@livekit/agents-plugin-openai";
import * as google from "@livekit/agents-plugin-google";

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import {
    CLASSROOM_ITEMS,
    showLearningItem,
} from "./classroom.js";

import {
    clearLearningBoard,
} from "./hardware-client.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

process.env.LIVEKIT_URL ??= process.env.NEXT_PUBLIC_LIVEKIT_URL;


/* ============================================================
   KITE LLM PROVIDER
   ============================================================ */

function createLLM() {
    const provider =
        (process.env.KITE_LLM_PROVIDER || "openrouter")
            .trim()
            .toLowerCase();

    if (provider === "gemini") {
        console.log("[KITE] Using Gemini LLM provider");

        return new google.LLM({
            model:
                process.env.GEMINI_MODEL ||
                "gemini-2.0-flash",

            apiKey:
                process.env.GEMINI_API_KEY ||
                process.env.GOOGLE_API_KEY,

            toolChoice: "auto",
        });
    }

    console.log("[KITE] Using OpenRouter LLM provider");

    return new openai.LLM({
        model:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-4o-mini",

        apiKey:
            process.env.OPENROUTER_API_KEY,

        baseURL:
            "https://openrouter.ai/api/v1",

        toolChoice: "auto",

        strictToolSchema: true,
    });
}


/* ============================================================
   CURRICULUM
   ============================================================ */

type CurriculumCategory =
    | "fruits"
    | "vegetables"
    | "shapes"
    | "numbers";


const CURRICULUM: Record<
    CurriculumCategory,
    string[]
> = {
    fruits: [
        "pineapple",
        "banana",
        "orange",
        "mango",
    ],

    vegetables: [
        "onion",
        "tomato",
        "potato",
        "cucumber",
    ],

    shapes: [
        "circle",
        "square",
        "rectangle",
        "triangle",
    ],

    numbers: [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
    ],
};


/* ============================================================
   CATEGORY DISPLAY NAMES
   ============================================================ */

const CATEGORY_NAMES: Record<
    CurriculumCategory,
    string
> = {
    fruits: "fruits",
    vegetables: "vegetables",
    shapes: "shapes",
    numbers: "numbers",
};


/* ============================================================
   LESSON STATE
   ============================================================ */

type LessonState = {
    active: boolean;
    category: CurriculumCategory | null;
    index: number;
    currentItem: string | null;
};


function createLessonState(): LessonState {
    return {
        active: false,
        category: null,
        index: -1,
        currentItem: null,
    };
}


/* ============================================================
   CATEGORY VALIDATION
   ============================================================ */

function isCurriculumCategory(
    value: unknown,
): value is CurriculumCategory {

    return (
        value === "fruits" ||
        value === "vegetables" ||
        value === "shapes" ||
        value === "numbers"
    );
}


/* ============================================================
   GET CURRENT ITEM
   ============================================================ */

function getCurrentItem(
    state: LessonState,
): string | null {

    if (
        !state.active ||
        !state.category ||
        state.index < 0
    ) {
        return null;
    }

    return (
        CURRICULUM[state.category][state.index] ||
        null
    );
}


/* ============================================================
   HARDWARE ACTIVATION
   ============================================================

   THIS IS THE IMPORTANT PART.

   The LLM does NOT choose the item.

   CODE chooses the current curriculum item.

   Therefore:

   fruits lesson
       index 0
       ↓
   pineapple

   vegetables lesson
       index 0
       ↓
   onion

   etc.
   ============================================================ */

async function activateCurrentItem(
    state: LessonState,
): Promise<string> {

    const category = state.category;

    if (!category) {
        throw new Error(
            "Cannot activate classroom item without category.",
        );
    }

    const item = getCurrentItem(state);

    if (!item) {
        throw new Error(
            "Cannot activate classroom item without current item.",
        );
    }

    console.log(
        `[KITE LESSON] Activating ${category}/${item}`,
    );

    /*
     * THIS CALL IS DETERMINISTIC.
     *
     * The LLM is not deciding which item to activate.
     */
    const command = await showLearningItem(
        category,
        item,
    );

    state.currentItem = command.item;

    console.log(
        `[KITE HARDWARE] ACTIVE -> ${command.category}/${command.item}`,
    );

    return (
        command.fact ||
        `This learning item is ${command.item}.`
    );
}


/* ============================================================
   START LESSON
   ============================================================ */

async function startLesson(
    state: LessonState,
    category: CurriculumCategory,
): Promise<{
    category: CurriculumCategory;
    item: string;
    fact: string;
    position: number;
    total: number;
}> {

    console.log(
        `[KITE LESSON] Starting ${category}`,
    );

    /*
     * Always clear the previous physical state first.
     */
    try {
        await clearLearningBoard();
    } catch (error) {
        console.warn(
            "[KITE HARDWARE] Clear before lesson failed:",
            error,
        );
    }


    /*
     * Reset lesson state.
     */
    state.active = true;
    state.category = category;
    state.index = 0;
    state.currentItem = null;


    /*
     * IMPORTANT:
     *
     * Code chooses the first item.
     * Code activates the first item.
     *
     * The LLM cannot skip this step.
     */
    const fact =
        await activateCurrentItem(state);


    const item =
        getCurrentItem(state)!;


    return {
        category,
        item,
        fact,
        position: 1,
        total: CURRICULUM[category].length,
    };
}


/* ============================================================
   ADVANCE LESSON
   ============================================================ */

async function advanceLesson(
    state: LessonState,
): Promise<{
    done: boolean;
    category: CurriculumCategory | null;
    item: string | null;
    fact: string | null;
    position: number;
    total: number;
}> {

    if (
        !state.active ||
        !state.category
    ) {
        return {
            done: true,
            category: null,
            item: null,
            fact: null,
            position: 0,
            total: 0,
        };
    }


    const category =
        state.category;

    const total =
        CURRICULUM[category].length;


    /*
     * Move to next item.
     */
    state.index += 1;


    /*
     * Lesson complete.
     */
    if (state.index >= total) {

        console.log(
            `[KITE LESSON] ${category} completed.`,
        );

        state.active = false;
        state.currentItem = null;

        try {
            await clearLearningBoard();
        } catch (error) {
            console.warn(
                "[KITE HARDWARE] Final clear failed:",
                error,
            );
        }

        return {
            done: true,
            category,
            item: null,
            fact: null,
            position: total,
            total,
        };
    }


    /*
     * Activate the NEXT item.
     *
     * Again, CODE controls this.
     */
    const fact =
        await activateCurrentItem(state);

    const item =
        getCurrentItem(state)!;


    return {
        done: false,
        category,
        item,
        fact,
        position: state.index + 1,
        total,
    };
}


/* ============================================================
   STOP LESSON
   ============================================================ */

async function stopLesson(
    state: LessonState,
): Promise<void> {

    console.log(
        "[KITE LESSON] Stopping lesson.",
    );

    state.active = false;
    state.category = null;
    state.index = -1;
    state.currentItem = null;


    try {
        await clearLearningBoard();
    } catch (error) {
        console.warn(
            "[KITE HARDWARE] Clear failed:",
            error,
        );
    }
}


/* ============================================================
   TEACHER INSTRUCTIONS
   ============================================================ */

const instructions = `
You are KITE — a warm, intelligent, cheerful Indian female preschool teacher.

You teach children approximately 3-8 years old:
Anganwadi, Balvatika, Nursery, LKG, UKG and early primary.

You are NOT a generic chatbot.
You are NOT a robotic assistant.
You are a warm Indian school teacher.

============================================================
PERSONALITY
============================================================

Warm, caring, cheerful, patient, encouraging, playful,
confident, gentle, expressive and teacher-like.

Use natural phrases such as:

"आप"
"आपको"
"आपने"
"चलिए"
"बहुत बढ़िया"
"शाबाश"
"एकदम सही"
"Excellent!"
"Nice!"
"वाह!"

Do not constantly say:
"बच्चे", "बेटा", "बेबी", "लिटिल वन".

============================================================
LANGUAGE
============================================================

Primary language:

SIMPLE NATURAL HINDI

Naturally mix easy English words.

Example:

"आज हम colours सीखेंगे.
यह red colour है.
Red मतलब लाल."

Do not force Hinglish into every sentence.

Do not use formal textbook Hindi.

Do not sound like a newsreader.

============================================================
WORDS NEVER TO USE
============================================================

Never mention:

AI
API
software
system
processing
server
database
tool
function
prompt
model
algorithm
ESP32
LED
LiveKit
OpenRouter
Gemini
hardware
network
internet

These are internal implementation details.

============================================================
VERY IMPORTANT TOOL RULE
============================================================

The classroom is controlled by the lesson system.

You MUST NOT invent classroom activation.

You MUST NOT say that an item is activated unless the
lesson tool has returned the item.

When a curriculum lesson starts, use startCurriculumLesson.

When the child has completed the current item and it is time
to continue, use advanceCurriculumLesson.

Do NOT manually choose the next curriculum item.

The lesson system chooses the correct item.

============================================================
PHYSICAL CURRICULUM
============================================================

FRUITS:

pineapple
Banana
Orange
Mango

VEGETABLES:

Onion
Tomato
Potato
Cucumber

SHAPES:

Circle
Square
Rectangle
Triangle

NUMBERS:

1
2
3
4
5
6
7
8
9
10

Never teach unsupported physical curriculum items.

Examples:

Cherry
Pinepineapple
Cauliflower
Hexagon

must NOT be activated.

============================================================
CURRICULUM TEACHING LOOP
============================================================

For fruits, vegetables, shapes and numbers:

1. The lesson system activates the current item.

2. Introduce the item.

3. Say the English name and Hindi meaning.

4. Give ONE short fact using the exact fact returned
   by the lesson system.

5. Ask the child to repeat.

6. WAIT for the child.

7. Praise the child.

8. Advance to the next item.

Keep every item short.

Do not give long explanations.

============================================================
IMPORTANT
============================================================

When startCurriculumLesson returns:

category
item
fact

you MUST teach THAT item.

Do not teach another item.

Do not skip the item.

Do not invent a different fact.

When advanceCurriculumLesson returns another item,
teach that returned item.

============================================================
EXAMPLE
============================================================

Tool returns:

category = fruits
item = pineapple
fact = "pineapple can be red or green and tastes sweet and crisp."

You say naturally:

"pineapple मतलब सेब.

सेब लाल या हरा हो सकता है और खाने में मीठा और कुरकुरा
लगता है.

अब मेरे साथ बोलिए — pineapple."

Then WAIT.

After the child responds:

"शाबाश!"

Then advance the lesson.

============================================================
SILENCE
============================================================

If the child is silent:

"कोई बात नहीं.
मैं बोलती हूँ, आप मेरे साथ बोलिए."

Then repeat the current word.

Do not shame the child.

============================================================
WRONG ANSWERS
============================================================

Never say:

"गलत"
"Wrong"
"आपको नहीं आता"

Instead say:

"बहुत अच्छा प्रयास."
"लगभग सही."
"एक छोटा सा hint दूँ?"
"चलो साथ में सोचते हैं."

============================================================
LESSON COMPLETION
============================================================

When the lesson system reports done:

For fruits:

"वाह! हमने सारे fruits सीख लिए."

For vegetables:

"वाह! हमने सारी vegetables सीख लीं."

For shapes:

"वाह! हमने सारे shapes सीख लिए."

For numbers:

"वाह! बहुत बढ़िया! हमने One से Ten तक सीख लिया."

Then ask:

"अब आप क्या सीखना चाहेंगे?"

WAIT.

Do not automatically restart.

============================================================
SUBJECT CHANGE
============================================================

If the child changes completely to:

story
rhyme
general conversation
another subject

stop the current curriculum lesson.

Call clearClassroom before changing away from a physical
curriculum lesson.

============================================================
STORIES
============================================================

Stories are slower and reflective.

Do not activate physical curriculum items for stories.

When the child asks:

"Story sunao"
"कहानी सुनाओ"

say:

"ज़रूर! आपको कहानी सुननी है?"

WAIT.

If yes:

"बहुत अच्छा. चलिए एक मज़ेदार कहानी सुनते हैं."

Use the fixed stories supplied by the application.

Ask ONE reflection question at a time.

============================================================
RHYMES
============================================================

You may tell short ORIGINAL rhymes in simple Hindi.

Do not reproduce copyrighted modern songs or poems.

After a rhyme:

"अब मेरे साथ एक line बोलेंगे?"

WAIT.

============================================================
QUIZ
============================================================

Treat quizzes as games.

Say:

"चलो एक छोटा सा guessing game खेलते हैं."

One question at a time.

WAIT.

React.

Praise.

Continue.

============================================================
GENERAL CONVERSATION
============================================================

Hello:

"Hello! आपसे मिलकर बहुत अच्छा लगा."

How are you?

"मैं बहुत अच्छी हूँ. आप कैसे हैं?"

Keep unrelated questions brief and child-friendly.

============================================================
SAFETY
============================================================

Never encourage dangerous experiments,
electricity, fire, weapons, harmful chemicals,
unsafe climbing or unsafe internet behavior.

Never ask for:

home address
phone number
password
exact location
private family information

============================================================
FINAL PRINCIPLE
============================================================

Teacher speaks briefly.

Child thinks.

Child speaks.

Teacher listens.

Teacher reacts.

Teacher encourages.

Child learns.

Next discovery.

Never turn the lesson into a long lecture.

The child should feel:

"Teacher mujhse baat kar rahi hain."

not:

"AI mujhe information de raha hai."
`;


/* ============================================================
   AGENT
   ============================================================ */

export default defineAgent({

    entry: async (ctx: JobContext) => {

        console.log(
            "[KITE] Starting agent session...",
        );


        /*
         * Lesson state belongs to the application.
         *
         * The LLM does not own this state.
         */
        const lessonState =
            createLessonState();


        /* ====================================================
           SESSION
           ==================================================== */

        const session =
            new voice.AgentSession({

                stt: new inference.STT({
                    model: "deepgram/nova-3",
                    language: "multi",
                }),

                llm: createLLM(),

                tts: new inference.TTS({
                    model:
                        "inworld/inworld-tts-2",

                    voice:
                        process.env.KITE_TTS_VOICE ||
                        "Priya",

                    language: "hi",
                }),

                turnHandling: {
                    turnDetection:
                        new inference.TurnDetector(),
                },
            });


        /* ====================================================
           START SESSION
           ==================================================== */

        await session.start({

            agent: voice.Agent.create({

                instructions,

                tools: {

                    /* ========================================
                       START CURRICULUM LESSON
                       ======================================== */

                    startCurriculumLesson: tool({

                        description: `
MANDATORY LESSON START ACTION.

Use this when the child chooses:
fruits, vegetables, shapes or numbers.

This tool starts the lesson and activates the FIRST
physical curriculum item automatically.

You MUST NOT choose the first item yourself.

The lesson engine will choose it.

Do not call this for stories, rhymes or general topics.
                        `.trim(),

                        parameters: {

                            type: "object",

                            properties: {

                                category: {
                                    type: "string",

                                    enum: [
                                        "fruits",
                                        "vegetables",
                                        "shapes",
                                        "numbers",
                                    ],
                                },

                            },

                            required: [
                                "category",
                            ],

                            additionalProperties: false,
                        },


                        execute: async ({
                            category,
                        }: {
                            category: CurriculumCategory;
                        }) => {

                            console.log(
                                `[KITE TOOL] startCurriculumLesson(${category})`,
                            );


                            if (
                                !isCurriculumCategory(
                                    category,
                                )
                            ) {
                                throw new Error(
                                    `Unsupported curriculum category: ${category}`,
                                );
                            }


                            /*
                             * HARD GUARANTEE:
                             *
                             * startLesson()
                             *
                             * -> resets state
                             * -> clears board
                             * -> selects item #1
                             * -> calls showLearningItem()
                             */
                            const result =
                                await startLesson(
                                    lessonState,
                                    category,
                                );


                            return JSON.stringify({

                                type:
                                    "lesson_started",

                                category:
                                    result.category,

                                item:
                                    result.item,

                                fact:
                                    result.fact,

                                position:
                                    result.position,

                                total:
                                    result.total,

                                instruction:
                                    "Teach ONLY this returned item.",
                            });
                        },
                    }),


                    /* ========================================
                       ADVANCE CURRICULUM LESSON
                       ======================================== */

                    advanceCurriculumLesson: tool({

                        description: `
ADVANCE THE CURRENT CURRICULUM LESSON.

Use this after the child has responded to the current
curriculum item and the current teaching loop is complete.

The lesson engine automatically selects and physically
activates the NEXT item.

NEVER choose the next item yourself.

Do not use this during stories or unrelated conversation.
                        `.trim(),

                        parameters: {

                            type: "object",

                            properties: {},

                            additionalProperties: false,
                        },


                        execute: async () => {

                            console.log(
                                "[KITE TOOL] advanceCurriculumLesson()",
                            );


                            /*
                             * HARD GUARANTEE:
                             *
                             * Code increments the index.
                             *
                             * Code selects the next item.
                             *
                             * Code calls showLearningItem().
                             */
                            const result =
                                await advanceLesson(
                                    lessonState,
                                );


                            return JSON.stringify({

                                type:
                                    result.done
                                        ? "lesson_completed"
                                        : "lesson_advanced",

                                category:
                                    result.category,

                                item:
                                    result.item,

                                fact:
                                    result.fact,

                                position:
                                    result.position,

                                total:
                                    result.total,

                                instruction:
                                    result.done
                                        ? "Celebrate completion and ask what the child wants to learn next."
                                        : "Teach ONLY the returned item.",
                            });
                        },
                    }),


                    /* ========================================
                       CLEAR CLASSROOM
                       ======================================== */

                    clearClassroom: tool({

                        description: `
CLEAR THE PHYSICAL CLASSROOM.

Use when leaving a physical curriculum lesson for a
different subject such as a story or rhyme.

Do not mention technical details to the child.
                        `.trim(),

                        parameters: {

                            type: "object",

                            properties: {},

                            additionalProperties: false,
                        },


                        execute: async () => {

                            console.log(
                                "[KITE TOOL] clearClassroom()",
                            );


                            await stopLesson(
                                lessonState,
                            );


                            return JSON.stringify({

                                type:
                                    "classroom_cleared",

                                status:
                                    "cleared",
                            });
                        },
                    }),
                },
            }),

            room: ctx.room,
        });


        /* ====================================================
           CONNECT
           ==================================================== */

        await ctx.connect();


        /* ====================================================
           INITIAL GREETING
           ==================================================== */

        await session.generateReply({

            instructions: `

Greet the child exactly in this style.

Say:

"Hello! Main Kite hoon.

Aaj hum saath mein kuch mazedaar aur naya seekhenge.

Aap batayiye, aaj kya seekhna hai?

Fruits, vegetables, colours, shapes, numbers, story ya rhyme?"

Then STOP.

WAIT for the child.

Do NOT start a lesson yet.

Do NOT activate anything yet.

`,
        });
    },
});


/* ============================================================
   SERVER
   ============================================================ */

cli.runApp(

    new ServerOptions({

        agent:
            fileURLToPath(import.meta.url),

        agentName:
            "kite-agent",
    }),
);