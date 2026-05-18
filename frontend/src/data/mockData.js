// ============================================================
// HearMeRead — Mock Data (Temporary)
// DELETE all mock exports after backend is ready.
//
// Passage types:
//   "a1_g1"           — Assessment 1 Gawain 1  (sentences)
//   "a1_g2_words"     — Assessment 1 Gawain 2  (words)     ← scorers 0–6
//   "a1_g2_sentences" — Assessment 1 Gawain 2  (sentences) ← scorers 7–10
//   "a2_story"        — Assessment 2            (story)    ← student picks
//
// Question format (matches AddPassagePage):
//   { id, question, answer (hint for teacher), options: ["Correct","Wrong","N/A"] }
// ============================================================

export const MOCK_STUDENTS = [
  {
    id: 1,
    lrn: "100234567890",
    first_name: "Maria",
    last_name: "Santos",
    grade_level: 2,
    section: "Sampaguita",
    teacher: "Mrs. Charina Largoza",
    sex: "female",
    reading_profile: "Developing Reader",
    latest_accuracy: 91,
    latest_wpm: 88,
    session_count: 3,
    trend: 92,
  },
  {
    id: 2,
    lrn: "100234567891",
    first_name: "Juan",
    last_name: "Dela Cruz",
    grade_level: 2,
    section: "Sampaguita",
    teacher: "Mrs. Charina Largoza",
    sex: "male",
    reading_profile: "Transitioning Reader",
    latest_accuracy: 74,
    latest_wpm: 55,
    session_count: 2,
    trend: 78,
  },
  {
    id: 3,
    lrn: "100234567892",
    first_name: "Ana",
    last_name: "Reyes",
    grade_level: 2,
    section: "Rosal",
    teacher: "Mrs. Charina Largoza",
    sex: "female",
    reading_profile: "Transitioning Reader",
    latest_accuracy: 83,
    latest_wpm: 72,
    session_count: 4,
    trend: 85,
  },
  {
    id: 4,
    lrn: "100234567893",
    first_name: "Carlo",
    last_name: "Mendoza",
    grade_level: 2,
    section: "Rosal",
    teacher: "Mrs. Charina Largoza",
    sex: "male",
    reading_profile: "High Emerging Reader",
    latest_accuracy: 96,
    latest_wpm: 102,
    session_count: 5,
    trend: 97,
  },
  {
    id: 5,
    lrn: "100234567894",
    first_name: "Sofia",
    last_name: "Garcia",
    grade_level: 2,
    section: "Sampaguita",
    teacher: "Mrs. Charina Largoza",
    sex: "female",
    reading_profile: "Developing Reader",
    latest_accuracy: 88,
    latest_wpm: 79,
    session_count: 2,
    trend: 90,
  },
];

export const MOCK_PASSAGES = [

  // ════════════════════════════════════════════════════════════
  // FILIPINO
  // ════════════════════════════════════════════════════════════

  // Assessment 1 Gawain 1 — Sentences
  {
    id: 101,
    passage_type: "a1_g1",
    title: "Pagbabasa ng mga Pangungusap",
    language: "filipino",
    grade_level: 2,
    word_count: 10,
    is_archived: false,
    content:
      "1. Kumakain ang bata.\n" +
      "2. Tumatakbo ang aso sa lansangan.\n" +
      "3. Mabait si Nanay sa lahat.\n" +
      "4. Masaya ang mga bata sa klase.\n" +
      "5. Naglalaro sila sa bakuran.\n" +
      "6. Mainit ang araw ngayon.\n" +
      "7. Malaki at maganda ang bahay nila.\n" +
      "8. Mabilis tumakbo si Pedro.\n" +
      "9. Umiyak nang malakas ang sanggol.\n" +
      "10. Nagpunta sa palengke si Nanay kanina.",
    questions: [],
  },

  // Assessment 1 Gawain 2 — Words (0–6 scorers)
  {
    id: 102,
    passage_type: "a1_g2_words",
    title: "Pagbabasa ng mga Salita",
    language: "filipino",
    grade_level: 2,
    word_count: 10,
    is_archived: false,
    content:
      "bata\naso\nbahay\nkumain\ntakbo\naraw\ngabi\npaaralan\nguro\npamilya",
    questions: [],
  },

  // Assessment 1 Gawain 2 — Sentences (7–10 scorers)
  {
    id: 103,
    passage_type: "a1_g2_sentences",
    title: "Pagbabasa ng mga Pangungusap (Bahagi 2)",
    language: "filipino",
    grade_level: 2,
    word_count: 10,
    is_archived: false,
    content:
      "1. Ang bata ay nagbabasa ng libro sa umaga.\n" +
      "2. Pumunta si Ana sa tindahan kahapon.\n" +
      "3. Masipag si Carlo sa pag-aaral araw-araw.\n" +
      "4. Kumain ng mangga ang masayang bata.\n" +
      "5. Malungkot si Pedro dahil nawala ang kanyang laruan.\n" +
      "6. Tumawid sa kalsada nang maingat at dahan-dahan.\n" +
      "7. Nag-aral ang mga bata nang mabuti sa klase.\n" +
      "8. Natulog nang maaga si Sofia kagabi.\n" +
      "9. Naghugas ng kamay si Juan bago kumain.\n" +
      "10. Kumanta ang titser para sa masasayang bata.",
    questions: [],
  },

  // Assessment 2 — Stories (student picks)
  {
    id: 1,
    passage_type: "a2_story",
    title: "Ang Pagong at ang Matsing",
    language: "filipino",
    grade_level: 2,
    word_count: 120,
    is_archived: false,
    assessment_type: 1,
    content:
      "Noong unang panahon, may isang pagong at isang matsing na magkaibigan. " +
      "Isang araw, nagpasya silang magtanim ng saging. Nagtrabaho nang husto ang pagong, " +
      "ngunit tamad ang matsing. Nang lumaki na ang puno ng saging, sinabi ng matsing na " +
      "kanya ang bunga dahil siya ang nagtanim ng itaas. Ngunit alam ng lahat na ang " +
      "pagong ang tunay na nagtatrabaho. Sa huli, nakita ng mga hayop ang katotohanan " +
      "at pinarusahan ang tamad na matsing. Ang aral ng kwento ay ang kasipagan at " +
      "katapatan ay palaging nagtatagumpay.",
    questions: [
      {
        id: 1,
        question: "Sino ang mga pangunahing tauhan sa kwento?",
        answer: "Ang pagong at ang matsing",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 2,
        question: "Ano ang ginawa ng pagong at matsing isang araw?",
        answer: "Nagtanim sila ng saging",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 3,
        question: "Sino ang tunay na nagtatrabaho sa pagtatanin?",
        answer: "Ang pagong",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 4,
        question: "Ano ang nangyari sa tamad na matsing?",
        answer: "Siya ay pinarusahan",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 5,
        question: "Ano ang aral ng kwento?",
        answer: "Ang kasipagan at katapatan ay palaging nagtatagumpay",
        options: ["Correct", "Wrong", "N/A"],
      },
    ],
  },
  {
    id: 2,
    passage_type: "a2_story",
    title: "Si Pedro at ang Mahiwagang Bato",
    language: "filipino",
    grade_level: 2,
    word_count: 110,
    is_archived: false,
    assessment_type: 1,
    content:
      "Si Pedro ay isang masipag na batang nakatira sa isang maliit na nayon. " +
      "Isang umaga, habang nagtatrabaho siya sa bukid, nakahanap siya ng isang " +
      "makintab na bato. Kinuha niya ito at dinala sa bahay. Sinabi ng kanyang lola " +
      "na ang batong iyon ay may kapangyarihan — nagbibigay ito ng swerte sa " +
      "mga taong may mabuting puso. Mula noon, naging masaya at masagana ang " +
      "buhay ni Pedro at ng kanyang pamilya. Natutunan niya na ang tunay na " +
      "yaman ay nasa kasipagan at pagmamahal sa kapamilya.",
    questions: [
      {
        id: 1,
        question: "Saan nakatira si Pedro?",
        answer: "Sa isang maliit na nayon",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 2,
        question: "Ano ang nahanap ni Pedro sa bukid?",
        answer: "Isang makintab na bato",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 3,
        question: "Ayon sa lola, ano ang kapangyarihan ng bato?",
        answer: "Nagbibigay ito ng swerte sa mga taong may mabuting puso",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 4,
        question: "Ano ang natutunan ni Pedro?",
        answer: "Ang tunay na yaman ay nasa kasipagan at pagmamahal sa kapamilya",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 5,
        question: "Paano naging masaya ang buhay ni Pedro?",
        answer: "Naging masaya at masagana pagkatapos makita ang bato",
        options: ["Correct", "Wrong", "N/A"],
      },
    ],
  },
  {
    id: 5,
    passage_type: "a2_story",
    title: "Ang Aking Paaralan",
    language: "filipino",
    grade_level: 2,
    word_count: 95,
    is_archived: false,
    content:
      "Mahal ko ang aking paaralan. Dito ako natututo ng maraming bagay kasama " +
      "ang aking mga kaibigan at guro. Tuwing umaga, pumupunta ako sa klase nang " +
      "masaya at handa. Natututo kami ng pagbabasa, pagsulat, at matematika. " +
      "Ang aming guro ay napakabait at palaging handang tumulong sa amin. " +
      "Sa aming paaralan, natutunan ko na ang edukasyon ay isang mahalagang " +
      "bagay sa buhay. Pangarap ko na maging magaling na mag-aaral para " +
      "makatulong sa aking pamilya at bansa.",
    questions: [
      {
        id: 1,
        question: "Ano ang nararamdaman ng bata tungkol sa kanyang paaralan?",
        answer: "Mahal niya ang kanyang paaralan",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 2,
        question: "Ano-ano ang natutunan ng bata sa paaralan?",
        answer: "Pagbabasa, pagsulat, at matematika",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 3,
        question: "Paano ang guro ng bata?",
        answer: "Napakabait at handang tumulong",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 4,
        question: "Ano ang pangarap ng bata?",
        answer: "Maging magaling na mag-aaral para makatulong sa pamilya at bansa",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 5,
        question: "Ayon sa bata, ano ang isang mahalagang bagay sa buhay?",
        answer: "Edukasyon",
        options: ["Correct", "Wrong", "N/A"],
      },
    ],
  },

  // ════════════════════════════════════════════════════════════
  // ENGLISH
  // ════════════════════════════════════════════════════════════

  // Assessment 1 Gawain 1 — Sentences
  {
    id: 201,
    passage_type: "a1_g1",
    title: "Reading Sentences",
    language: "english",
    grade_level: 2,
    word_count: 10,
    is_archived: false,
    content:
      "1. The cat is sleeping.\n" +
      "2. She runs to school every day.\n" +
      "3. My mother cooks delicious food.\n" +
      "4. The children are playing outside.\n" +
      "5. He reads a book every night.\n" +
      "6. The sun is bright and warm today.\n" +
      "7. We love going to the park.\n" +
      "8. The dog barks at the mailman.\n" +
      "9. She wrote a letter to her friend.\n" +
      "10. The birds sing in the morning.",
    questions: [],
  },

  // Assessment 1 Gawain 2 — Words (0–6 scorers)
  {
    id: 202,
    passage_type: "a1_g2_words",
    title: "Reading Words",
    language: "english",
    grade_level: 2,
    word_count: 10,
    is_archived: false,
    content: "cat\nrun\nhouse\nbook\nsun\ntree\nbird\nschool\nfriend\nwater",
    questions: [],
  },

  // Assessment 1 Gawain 2 — Sentences (7–10 scorers)
  {
    id: 203,
    passage_type: "a1_g2_sentences",
    title: "Reading Sentences (Part 2)",
    language: "english",
    grade_level: 2,
    word_count: 10,
    is_archived: false,
    content:
      "1. The little girl reads her favorite book every morning.\n" +
      "2. He went to the store with his mother yesterday.\n" +
      "3. The students are studying hard in class today.\n" +
      "4. She ate a sweet mango after lunch.\n" +
      "5. The boy was sad because he lost his toy.\n" +
      "6. Always cross the street carefully and slowly.\n" +
      "7. The children learned many things at school.\n" +
      "8. She slept early last night.\n" +
      "9. He washed his hands before eating lunch.\n" +
      "10. The teacher sang a song for the happy children.",
    questions: [],
  },

  // Assessment 2 — Stories (student picks)
  {
    id: 3,
    passage_type: "a2_story",
    title: "The Helpful Little Star",
    language: "english",
    grade_level: 2,
    word_count: 115,
    is_archived: false,
    assessment_type: 2,
    content:
      "Once upon a time, there was a little star who lived high up in the sky. " +
      "Every night, the star would shine as brightly as it could to help travelers " +
      "find their way home. One stormy night, the clouds covered all the other stars, " +
      "but the little star kept shining through. A lost fisherman saw the light and " +
      "followed it safely back to shore. The next morning, the fisherman looked up " +
      "at the sky and said thank you to the brave little star. From that day on, " +
      "the little star shone the brightest of all, because kindness always comes back.",
    questions: [
      {
        id: 1,
        question: "Where did the little star live?",
        answer: "High up in the sky",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 2,
        question: "What did the little star do every night?",
        answer: "It shone as brightly as it could to help travelers find their way home",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 3,
        question: "Who did the little star help one stormy night?",
        answer: "A lost fisherman",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 4,
        question: "What happened to the little star after helping the fisherman?",
        answer: "It shone the brightest of all",
        options: ["Correct", "Wrong", "N/A"],
      },
      {
        id: 5,
        question: "What is the lesson of the story?",
        answer: "Kindness always comes back",
        options: ["Correct", "Wrong", "N/A"],
      },
    ],
  },
  {
    id: 4,
    passage_type: "a2_story",
    title: "The Mango Tree",
    language: "english",
    grade_level: 2,
    word_count: 108,
    is_archived: false,
    assessment_type: 2,
    content:
      "In a small village, there was a big mango tree that gave shade to everyone. " +
      "Children played under it every afternoon after school. Birds built their nests " +
      "in its branches. An old man sat beneath it to rest. When the dry season came, " +
      "the tree gave its sweet fruits to the hungry villagers. The children watered it " +
      "and cared for its roots. The tree grew stronger each year because the people " +
      "loved it. The villagers learned that when you take care of nature, nature takes " +
      "care of you.",
  },
  {
    id: 5,
    title: "Ang Aking Paaralan",
    language: "filipino",
    grade_level: 2,
    word_count: 95,
    is_archived: false,
    assessment_type: 2,
    content:
      "Mahal ko ang aking paaralan. Dito ako natututo ng maraming bagay kasama " +
      "ang aking mga kaibigan at guro. Tuwing umaga, pumupunta ako sa klase nang " +
      "masaya at handa. Natututo kami ng pagbabasa, pagsulat, at matematika. " +
      "Ang aming guro ay napakabait at palaging handang tumulong sa amin. " +
      "Sa aming paaralan, natutunan ko na ang edukasyon ay isang mahalagang " +
      "bagay sa buhay. Pangarap ko na maging magaling na mag-aaral para " +
      "makatulong sa aking pamilya at bansa.",
  },
];
