import React from 'react';
import { ComplaintCategory } from '@/types';
import {
  AlertOctagon,
  Trash2,
  Droplets,
  Waves,
  Lightbulb,
  Car,
  HelpCircle,
} from 'lucide-react';

interface Props {
  category: ComplaintCategory;
}

export default function CategoryBadge({ category }: Props) {
  const configs: Record<
    ComplaintCategory,
    { label: string; icon: any; color: string }
  > = {
    POTHOLE: { label: 'Pothole', icon: AlertOctagon, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    GARBAGE: { label: 'Garbage Dump', icon: Trash2, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    OVERFLOWING_DUSTBIN: { label: 'Overflowing Bin', icon: Trash2, color: 'text-amber-700 bg-amber-50 border-amber-300' },
    ILLEGAL_GARBAGE_DUMPING: { label: 'Illegal Dumping', icon: Trash2, color: 'text-rose-700 bg-rose-50 border-rose-300' },
    UNCOLLECTED_GARBAGE: { label: 'Uncollected Trash', icon: Trash2, color: 'text-orange-700 bg-orange-50 border-orange-300' },
    GARBAGE_BLOCKING_DRAIN: { label: 'Garbage in Drain', icon: Waves, color: 'text-red-700 bg-red-50 border-red-300' },
    OPEN_GARBAGE_DUMP: { label: 'Open Garbage Dump', icon: Trash2, color: 'text-red-800 bg-red-100 border-red-300' },
    MISSED_GARBAGE_COLLECTION: { label: 'Missed Pickup', icon: Trash2, color: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
    GENERAL_WASTE_MANAGEMENT: { label: 'Waste Management', icon: Trash2, color: 'text-teal-700 bg-teal-50 border-teal-200' },
    WATER_LEAKAGE: { label: 'Water Leakage', icon: Droplets, color: 'text-blue-700 bg-blue-50 border-blue-200' },
    DRAINAGE: { label: 'Drainage Issue', icon: Waves, color: 'text-teal-700 bg-teal-50 border-teal-200' },
    STREETLIGHT: { label: 'Streetlight', icon: Lightbulb, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    ROAD_DAMAGE: { label: 'Road Damage', icon: Car, color: 'text-stone-700 bg-stone-50 border-stone-200' },
    OTHER: { label: 'Other Issue', icon: HelpCircle, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  };

  const config = configs[category] || configs.OTHER;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${config.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
