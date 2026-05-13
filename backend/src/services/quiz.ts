/**
 * Servicio de cálculo de nivel de pádel
 * 
 * Basado en respuestas a un quiz de 8 preguntas, calcula el nivel de juego del usuario.
 * La puntuación va de 0 a 24 (8 preguntas x 3 puntos máximo por pregunta).
 * El nivel resultante va de 0 a 6 según las franjas establecidas.
 * 
 * Niveles:
 * - 0: Sin experiencia (0-3 puntos)
 * - 1: Principiante (4-7 puntos)
 * - 2: Intermedio bajo (8-11 puntos)
 * - 3: Intermedio (12-15 puntos)
 * - 4: Avanzado (16-19 puntos)
 * - 5: Muy avanzado (20-23 puntos)
 * - 6: Profesional (24+ puntos)
 */

/**
 * Calcula el nivel de pádel del usuario basado en respuestas del quiz
 * 
 * @param answers - Array de números (0-3) representando las respuestas a cada pregunta
 * @returns Objeto con score (puntuación total 0-24) y level (nivel 0-6)
 * 
 * Ejemplo:
 * const result = calculateSkill([2, 2, 1, 2, 2, 1, 2, 2]);
 * // result = { score: 14, level: 3 }
 */
export function calculateSkill(answers: number[]) {
  // Sanitizar respuestas: asegurar que están en rango 0-3
  const safeAnswers = answers.map((value) => {
    if (Number.isNaN(value) || value < 0) return 0;
    if (value > 3) return 3;
    return Math.floor(value);
  });

  // Sumar todas las respuestas para obtener score
  const score = safeAnswers.reduce((acc, value) => acc + value, 0);

  // Mapear score a nivel (0-6)
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
