import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = 'C:/Users/User/Desktop/1_The Study at Hillview/1_Tools & Executable/2_PDF Questions Extractor';
const source = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'data/questions.json'), 'utf8'));

const answerKeys = {
  'rw-m1-common': [null, null, null, 'B', 'A', 'D', 'A', 'A', 'A', 'A', 'B', 'A', 'B', 'D', 'A', 'C', 'C', 'D', 'A', 'A', 'B', 'B', 'C', 'D', 'D', 'C', 'D', 'C'],
  'rw-m2-easier': [null, 'D', 'A', 'C', 'A', 'B', 'B', 'A', 'A', 'C', 'D', 'D', 'C', 'C', 'B', 'A', 'A', 'D', 'B', 'D', 'D', 'A', 'D', 'C', 'D', 'C', 'A', 'A'],
  'rw-m2-harder': [null, 'C', 'B', 'C', 'D', 'A', 'C', 'A', 'D', 'A', 'B', 'B', 'A', 'A', 'A', 'C', 'A', 'C', 'B', 'A', 'A', 'D', 'D', 'A', 'C', 'D', 'D', 'B'],
  'math-m1-common': [null, 'B', 'C', 'C', 'B', 'D', '0.6', 'D', '-4', 'A', 'B', 'A', 'A', 'D', 'A', '25', 'D', 'C', 'C', '40/41', '-2.5', '10', '2.4'],
  'math-m2-easier': [null, 'C', '32', 'B', 'C', 'A', 'B', '140', 'A', '44', 'D', 'D', 'B', '118', 'A', 'D', 'B', 'B', 'C', 'D', 'A', 'D', 'A'],
  'math-m2-harder': [null, 'A', 'A', '-120', 'B', 'C', 'D', 'B', 'B', '25', 'C', 'A', 'A', 'D', 'C', 'D', 'A', '12', 'C', 'B', '105', 'B', 'D'],
};

const rwSkills = {
  'rw-m1-common': ['', '', '', 'Purpose Questions', 'Purpose Questions', 'Dual Texts Questions', 'Retrieval Questions', 'Retrieval Questions', 'Main Idea Questions', 'Claims Questions', 'Charts Questions', 'Charts Questions', 'Charts Questions', 'Charts Questions', 'Conclusions', 'Pronouns', 'Who or What Are You Talking About?', 'Verb Forms in Complete Sentences', 'How to Connect Independent Clauses', 'Pronouns', 'Where Punctuation is Not Needed', 'Punctuation with Transitions', 'Transition Questions', 'Transition Questions', 'Transition Questions', 'Transition Questions', 'Rhetorical Synthesis Questions', 'Rhetorical Synthesis Questions'],
  'rw-m2-easier': ['', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Retrieval Questions', 'Claims Questions', 'Claims Questions', 'Claims Questions', 'Conclusions', 'Conclusions', 'Conclusions', 'Conclusions', 'Verb Forms in Complete Sentences', 'Pronouns and Apostrophes', 'Pronouns', 'How to Connect Independent Clauses', 'Question or Statement?', 'Verbs', 'Verb Forms in Complete Sentences', 'Transition Questions', 'Transition Questions', 'Transition Questions', 'Rhetorical Synthesis Questions'],
  'rw-m2-harder': ['', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Vocabulary Questions', 'Retrieval Questions', 'Claims Questions', 'Claims Questions', 'Claims Questions', 'Conclusions', 'Conclusions', 'Conclusions', 'Conclusions', 'Verbs', 'Who or What Are You Talking About?', 'Verbs', 'Who or What Are You Talking About?', 'Punctuation with Transitions', 'How to Connect Independent Clauses', 'Transition Questions', 'Transition Questions', 'Transition Questions', 'Rhetorical Synthesis Questions', 'Rhetorical Synthesis Questions'],
};

const mathSkills = {
  'math-m1-common': ['', 'What is a Frequency Table?', 'Equations of a Parabola', 'Write Your Own Equations', 'Triangles', 'Meaning In Context', 'Probability', 'What is Margin of Error?', 'Solving Quadratic Equations', 'Growth and Decay', 'Plug In the Answers (PITA)', 'Plug In the Answers (PITA)', 'Plug In the Answers (PITA)', 'Function Fundamentals', 'Solving Systems of Equations', 'Meaning In Context', 'Growth and Decay', 'Volume', 'Points of Intersection', 'Triangles', 'Equations of a Parabola', 'Parallel and Perpendicular Lines', 'Points of Intersection'],
  'math-m2-easier': ['', 'What is a Median?', 'Fundamentals of Digital SAT Algebra', 'Rectangles and Squares', 'Fundamentals of Digital SAT Algebra', 'Fundamentals of Digital SAT Algebra', 'Solving Rational Equations', 'Percentages', 'Rates', 'Solving for Expressions', 'Function Fundamentals', 'Function Fundamentals', 'Function Fundamentals', 'Lines and Angles', 'Equations of a Line', 'Rates', 'Write Your Own Equations', 'Function Fundamentals', 'Equations of a Parabola', 'Function Fundamentals', 'Function Fundamentals', 'Fundamentals of Digital SAT Algebra', 'Triangles'],
  'math-m2-harder': ['', 'Fundamentals of Digital SAT Algebra', 'Percentages', 'Solving for Expressions', 'Solving for Expressions', 'Meaning In Context', 'Ratios and Proportions', 'Plugging In Your Own Numbers', 'Solving Rational Equations', 'Equation of a Circle', 'Plug In the Answers (PITA)', 'Points of Intersection', 'Fundamentals of Digital SAT Algebra', 'Equations of a Parabola', 'Graphing Functions', 'Solving Quadratic Equations', 'Equations of a Line', 'Solving Systems of Equations', 'Triangles', 'Function Fundamentals', 'Averages', 'Plugging In Your Own Numbers', 'Triangles'],
};

const mathDomains = {
  'math-m1-common': ['Problem-Solving and Data Analysis', 'Advanced Math', 'Algebra', 'Geometry and Trigonometry', 'Problem-Solving and Data Analysis', 'Problem-Solving and Data Analysis', 'Problem-Solving and Data Analysis', 'Advanced Math', 'Advanced Math', 'Algebra', 'Algebra', 'Algebra', 'Advanced Math', 'Algebra', 'Problem-Solving and Data Analysis', 'Advanced Math', 'Geometry and Trigonometry', 'Advanced Math', 'Geometry and Trigonometry', 'Advanced Math', 'Geometry and Trigonometry', 'Advanced Math'],
  'math-m2-easier': ['Problem-Solving and Data Analysis', 'Algebra', 'Geometry and Trigonometry', 'Algebra', 'Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Problem-Solving and Data Analysis', 'Algebra', 'Advanced Math', 'Advanced Math', 'Advanced Math', 'Geometry and Trigonometry', 'Algebra', 'Problem-Solving and Data Analysis', 'Algebra', 'Advanced Math', 'Advanced Math', 'Advanced Math', 'Advanced Math', 'Algebra', 'Geometry and Trigonometry'],
  'math-m2-harder': ['Algebra', 'Problem-Solving and Data Analysis', 'Algebra', 'Algebra', 'Problem-Solving and Data Analysis', 'Problem-Solving and Data Analysis', 'Algebra', 'Advanced Math', 'Geometry and Trigonometry', 'Algebra', 'Advanced Math', 'Algebra', 'Advanced Math', 'Advanced Math', 'Advanced Math', 'Algebra', 'Algebra', 'Geometry and Trigonometry', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Algebra', 'Geometry and Trigonometry'],
};

function rwDomain(skill) {
  if (/Vocabulary|Purpose|Dual Texts/.test(skill)) return 'Craft and Structure';
  if (/Transition|Rhetorical/.test(skill)) return 'Expression of Ideas';
  if (/\bVerb|\bPronoun|\bPunctuation|\bClauses|Question or Statement|Who or What/.test(skill)) return 'Standard English Conventions';
  return 'Information and Ideas';
}

function questionFor(record) {
  const skills = record.section === 'reading_writing' ? rwSkills[record.module_id] : mathSkills[record.module_id];
  const skill = skills[record.question_number] || 'Imported Practice Test 2 question';
  const answer = answerKeys[record.module_id]?.[record.question_number];
  if (!answer) throw new Error(`Missing answer key for ${record.id}`);
  const domain = record.section === 'reading_writing' ? rwDomain(skill) : mathDomains[record.module_id][record.question_number - 1];
  const image = record.assets?.question_image;
  return {
    id: record.id,
    domain,
    skill,
    difficulty: record.module === 2 ? (record.route === 'easier' ? 1 : 3) : 2,
    prompt: record.content.text,
    type: record.response_type === 'student_produced_response' ? 'student-produced-response' : 'multiple-choice',
    choices: record.content.options?.map(option => ({ id: option.label, text: option.text })),
    answer,
    explanation: `Official diagnostic answer: ${answer}. Review the source figure and choices above; this item is from the publisher's Practice Test 2 diagnostic key.`,
    assets: image ? [{ id: 'question-image', type: 'figure', src: image.path, alt: `Practice Test 2 question image (${record.module_id} question ${record.question_number})`, width: image.width, height: image.height, sourcePage: record.source_regions?.[0]?.page }] : undefined,
    sourceType: 'Princeton Review Digital SAT Premium Prep 2025',
    sourcePage: record.source_regions?.[0]?.page,
    sourceQuestion: `${record.module_id} question ${record.question_number}`,
    needsReview: false,
    sourceNotes: 'Question image and extracted text were visually verified. Answer letter/value comes from the publisher diagnostic answer key.',
  };
}

const questions = source.map(questionFor);
const out = (name, value) => fs.writeFileSync(path.join(repo, name), `${JSON.stringify(value, null, 2)}\n`);
out('Questions Practice Test 2.json', questions);
out('Questions Practice Test 2 Math.json', questions.filter(question => !question.domain.includes('Ideas') && !question.domain.includes('Conventions') && question.domain !== 'Craft and Structure'));
out('Questions Practice Test 2 Reading and Writing.json', questions.filter(question => question.domain.includes('Ideas') || question.domain.includes('Conventions') || question.domain === 'Craft and Structure'));
for (const domain of ['Information and Ideas', 'Expression of Ideas', 'Standard English Conventions']) {
  const slug = domain.replaceAll(' ', '_');
  const domainQuestions = questions.filter(question => question.domain === domain && question.id.includes('-rw-'));
  out(`Questions RW ${slug}.json`, domainQuestions);
}
console.log(`Wrote ${questions.length} Practice Test 2 questions and ${questions.filter(q => q.domain.includes('Ideas') || q.domain.includes('Conventions')).length} supplemental R&W questions.`);
