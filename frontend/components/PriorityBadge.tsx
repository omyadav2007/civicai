import React from 'react';
import { ComplaintPriority } from '@/types';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface Props {
  priority: ComplaintPriority;
}

export default function PriorityBadge({ priority }: Props) {
  const configs: Record<
    ComplaintPriority,
    { label: string; bg: string; text: string; border: string; icon: any }
  > = {
    LOW: {
      label: 'Low Priority',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: Info,
    },
    MEDIUM: {
      label: 'Medium Priority',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: AlertTriangle,
    },
    HIGH: {
      label: 'High Priority',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: AlertCircle,
    },
  };

  const config = configs[priority] || configs.MEDIUM;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
