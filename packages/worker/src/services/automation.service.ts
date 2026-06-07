import type { RuleCondition } from '../types/automation';

export function evaluateCondition(file: any, conditions: RuleCondition[]): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  return conditions.every(cond => {
    const value = file[cond.field]?.toLowerCase() || '';
    const target = cond.value.toLowerCase();
    
    switch (cond.operator) {
      case 'endswith': return value.endsWith(target);
      case 'contains': return value.includes(target);
      case 'equals': return value === target;
      default: return false;
    }
  });
}
