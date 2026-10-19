import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVenueQuestionMessage, getPendingVisitQuestions, visitPlanProgress } from '../src/visit-plan.ts';

const venue = { name: 'Illustrative community center', address: 'Example Road, RI', source: 'https://rampapproved.com/accessible-locations/' };
test('all general questions are pending for a new visit', () => {
  assert.equal(getPendingVisitQuestions([]).length,4);
  assert.deepEqual(visitPlanProgress([]),{ complete:0,total:4 });
});
test('marking a question removes only that question from shared prompt', () => {
  const text=buildVenueQuestionMessage(venue,['entry']);
  assert.doesNotMatch(text,/• Confirm entrance/);
  assert.match(text,/• Confirm restroom/);
  assert.match(text,/Illustrative community center/);
  assert.match(text,/rampapproved.com/);
});
test('sharing a fully checked list never leaks item states', () => {
  const message=buildVenueQuestionMessage(venue,['entry','restroom','parking','contact']);
  assert.match(message,/conditions have recently changed/);
  assert.doesNotMatch(message,/• Confirm/);
});
test('progress ignores duplicate and invalid stored IDs', () => {
  assert.deepEqual(visitPlanProgress(['entry','entry','madeup']),{complete:1,total:4});
});
test('share text uses only public venue fields and generic questions', () => {
  const output=buildVenueQuestionMessage(venue,[]);
  assert.ok(output.includes(venue.address));
  assert.ok(output.includes(venue.source));
  assert.ok(!output.toLowerCase().includes('diagnos'));
});
