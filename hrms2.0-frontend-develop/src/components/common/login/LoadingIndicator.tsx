import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
}

export default function LoadingIndicator({ message = 'Loading...' }: LoadingIndicatorProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center space-y-4 min-w-[280px]">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative" strokeWidth={2.5} />
        </div>

        <p className="text-slate-700 font-medium text-lg">{message}</p>

        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
