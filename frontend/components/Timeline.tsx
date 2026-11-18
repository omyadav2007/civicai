import React from 'react';
import { ComplaintStatus, ComplaintStatusHistory } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Circle, Clock, RefreshCw, XCircle } from 'lucide-react';

interface Props {
  currentStatus: ComplaintStatus;
  history?: ComplaintStatusHistory[];
}

export default function Timeline({ currentStatus, history = [] }: Props) {
  const steps: { key: ComplaintStatus; label: string; desc: string }[] = [
    {
      key: 'SUBMITTED',
      label: 'Submitted',
      desc: 'Complaint received and recorded in municipal system',
    },
    {
      key: 'IN_PROGRESS',
      label: 'In Progress',
      desc: 'Assigned to field inspection team / work order dispatched',
    },
    {
      key: 'RESOLVED',
      label: 'Resolved',
      desc: 'Civic issue addressed and marked resolved on-site',
    },
  ];

  const getStepIndex = (status: ComplaintStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return 0;
      case 'IN_PROGRESS':
        return 1;
      case 'RESOLVED':
        return 2;
      case 'REJECTED':
        return -1;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  if (currentStatus === 'REJECTED') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
        <XCircle className="w-8 h-8 text-rose-500 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-rose-800 text-sm">Complaint Closed / Rejected</h4>
          <p className="text-xs text-rose-600 mt-0.5">
            This issue could not be verified or fell outside municipal operational jurisdiction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Horizontal step indicator */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 z-0 hidden sm:block" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-teal-500 -translate-y-1/2 z-0 transition-all duration-500 hidden sm:block"
          style={{
            width: currentIndex === 0 ? '16%' : currentIndex === 1 ? '50%' : '100%',
          }}
        />

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {steps.map((step, idx) => {
            const isCompleted = currentIndex > idx;
            const isCurrent = currentIndex === idx;

            return (
              <div
                key={step.key}
                className="flex items-center sm:flex-col sm:text-center gap-3 sm:gap-2 bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-slate-200"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all flex-shrink-0 ${
                    isCompleted
                      ? 'bg-teal-600 text-white shadow-sm ring-4 ring-teal-100'
                      : isCurrent
                      ? 'bg-teal-500 text-slate-950 font-bold ring-4 ring-teal-100 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isCurrent ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      isCurrent || isCompleted ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] sm:mx-auto">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History log timeline */}
      {history.length > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Audit Status Logs
          </h4>
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-4">
            {history.map((item) => (
              <div key={item.id} className="relative pl-6">
                <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white" />
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-slate-800">
                      {item.previousStatus
                        ? `Status transitioned from ${item.previousStatus} to ${item.newStatus}`
                        : `Complaint initially submitted (${item.newStatus})`}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {formatDate(item.changedAt)}
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Recorded by CivicAI Audit Log Engine
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
