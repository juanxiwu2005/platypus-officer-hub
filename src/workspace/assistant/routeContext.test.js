import { describe, expect, it } from 'vitest';
import { routeAssistantContext } from './routeContext';
describe('route-derived assistant selection', () => {
    it('knows a task on the first render of a deep link', () => expect(routeAssistantContext('/phase1/work/event', '?task=plan')).toEqual({ screen: 'work', workItemId: 'event', taskId: 'plan' }));
    it('does not attach an old query selection to another section', () => expect(routeAssistantContext('/phase1/tasks', '?task=plan')).toEqual({ screen: 'tasks' }));
    it('tolerates malformed routes and discards invalid query identifiers', () => expect(() => routeAssistantContext('/phase1/work/%ZZ', '?task=%3Cscript%3E')).not.toThrow());
});
