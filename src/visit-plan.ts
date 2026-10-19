import { VISIT_QUESTIONS } from './directory.ts';
import type { Place, VisitQuestionId } from './directory.ts';

/** A generic public venue-question template; it never includes private user data. */
export function getPendingVisitQuestions(completed: readonly VisitQuestionId[]): string[] {
  const finished = new Set(completed);
  return VISIT_QUESTIONS.filter(question => !finished.has(question.id))
    .map(question => question.title);
}
export function visitPlanProgress(completed: readonly VisitQuestionId[]): { complete: number; total: number } {
  const valid = new Set(VISIT_QUESTIONS.map(question => question.id));
  const done = new Set(completed.filter(id => valid.has(id)));
  return { complete: done.size, total: VISIT_QUESTIONS.length };
}
/**
 * Share only public business details and unanswered general questions.
 * Never share private checklist state, diagnoses or stored user information.
 */
export function buildVenueQuestionMessage(
  place: Pick<Place, 'name' | 'address' | 'source'>,
  completed: readonly VisitQuestionId[],
): string {
  const pending = getPendingVisitQuestions(completed);
  const questionSection = pending.length
    ? 'Before visiting, I would like to confirm:\n' + pending.map(q => '• ' + q).join('\n')
    : 'I have checked my standard visit questions. Please let me know if accessibility conditions have recently changed.';
  return [
    'Accessibility visit questions for ' + place.name,
    place.address,
    '',
    questionSection,
    '',
    'Public directory reference: ' + place.source,
    'Accessibility information can change. Please confirm details directly with the venue.',
  ].join('\n');
}
