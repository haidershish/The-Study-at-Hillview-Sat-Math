import type { Question } from '../types';

export const sampleQuestions: Question[] = [
  {
    id: 'alg-001', domain: 'Algebra', skill: 'Systems of linear equations', difficulty: 1,
    prompt: 'The graphs of y = 2x + 1 and y = −x + 7 intersect at (a, b). What is the value of a?',
    type: 'multiple-choice',
    choices: [{ id: 'A', text: '1' }, { id: 'B', text: '2' }, { id: 'C', text: '3' }, { id: 'D', text: '4' }],
    answer: 'B', explanation: 'Set the expressions equal: 2x + 1 = −x + 7. Then 3x = 6, so x = 2.',
    calculatorTip: 'Graph y=2x+1 and y=-x+7. Select their intersection.'
  },
  {
    id: 'adv-001', domain: 'Advanced Math', skill: 'Quadratic functions', difficulty: 2,
    prompt: 'For the function f(x) = x² − 6x + 5, what is the minimum value of f(x)?',
    type: 'multiple-choice',
    choices: [{ id: 'A', text: '−5' }, { id: 'B', text: '−4' }, { id: 'C', text: '4' }, { id: 'D', text: '5' }],
    answer: 'B', explanation: 'The vertex occurs at x = 3. Substitution gives f(3) = 9 − 18 + 5 = −4.',
    calculatorTip: 'Graph y=x^2-6x+5 and inspect the vertex.'
  },
  {
    id: 'psda-001', domain: 'Problem-Solving and Data Analysis', skill: 'Combinations and probability', difficulty: 2,
    prompt: 'A committee of 2 students is selected at random from 5 students. How many different committees are possible?',
    type: 'student-produced-response', answer: '10',
    explanation: 'Order does not matter, so use 5C2 = 5!/(2!3!) = 10.',
    calculatorTip: 'Enter nCr(5,2) or combinations(5,2).'
  },
  {
    id: 'geo-001', domain: 'Geometry and Trigonometry', skill: 'Circles', difficulty: 1,
    prompt: 'A circle has radius 6. What is its area, in square units?',
    type: 'multiple-choice',
    choices: [{ id: 'A', text: '6π' }, { id: 'B', text: '12π' }, { id: 'C', text: '36π' }, { id: 'D', text: '72π' }],
    answer: 'C', explanation: 'A = πr² = π(6)² = 36π.'
  },
  {
    id: 'psda-002', domain: 'Problem-Solving and Data Analysis', skill: 'Sequences', difficulty: 2,
    prompt: 'An arithmetic sequence has first term 7 and common difference 4. What is its 20th term?',
    type: 'student-produced-response', answer: '83',
    explanation: 'a₂₀ = 7 + (20 − 1)(4) = 83.',
    calculatorTip: 'Enter 7+(20-1)*4.'
  }
];
