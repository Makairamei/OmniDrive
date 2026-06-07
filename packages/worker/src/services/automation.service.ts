import type { RuleCondition } from '../types/automation';

export interface AutomationFile {
  [key: string]: unknown;
}

export function evaluateCondition(file: AutomationFile, conditions: RuleCondition[]): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  return conditions.every(cond => {
    const rawFieldValue = file[cond.field];
    const value = rawFieldValue != null ? String(rawFieldValue).toLowerCase() : '';
    const target = cond.value != null ? String(cond.value).toLowerCase() : '';
    
    switch (cond.operator) {
      case 'endswith': return value.endsWith(target);
      case 'contains': return value.includes(target);
      case 'equals': return value === target;
      default: return false;
    }
  });
}
