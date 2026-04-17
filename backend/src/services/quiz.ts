export function calculateSkill(answers: number[]) {
  const safeAnswers = answers.map((value) => {
    if (Number.isNaN(value) || value < 0) return 0;
    if (value > 3) return 3;
    return Math.floor(value);
  });

  const score = safeAnswers.reduce((acc, value) => acc + value, 0);

  let level = 0;
  if (score <= 3) level = 0;
  else if (score <= 7) level = 1;
  else if (score <= 11) level = 2;
  else if (score <= 15) level = 3;
  else if (score <= 19) level = 4;
  else if (score <= 23) level = 5;
  else level = 6;

  return { score, level };
}
