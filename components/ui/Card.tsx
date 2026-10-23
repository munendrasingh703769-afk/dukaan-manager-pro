import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}