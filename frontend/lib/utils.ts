import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDepartment(dept?: string | null): string {
  if (!dept || dept === 'UNASSIGNED') return 'Unassigned';
  return dept
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatAssignmentMethod(method?: string | null): string {
  if (!method) return 'Automatic AI Assignment';
  switch (method) {
    case 'AI_AUTO':
      return 'Automatic AI Assignment (Gemini Vision)';
    case 'RULE_FALLBACK':
      return 'Rule-Based Fallback Assignment';
    case 'MANUAL':
      return 'Administrative Manual Override';
    default:
      return method;
  }
}

