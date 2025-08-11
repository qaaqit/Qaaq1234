interface QBOTChatAreaProps {
  children?: React.ReactNode;
  className?: string;
}

export default function QBOTChatArea({ children, className }: QBOTChatAreaProps) {
  return (
    <div 
      className={`flex-1 overflow-hidden relative ${className || ''}`}
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(156, 163, 175, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(156, 163, 175, 0.08) 1px, transparent 1px),
          linear-gradient(to right, rgba(156, 163, 175, 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(156, 163, 175, 0.12) 1px, transparent 1px),
          linear-gradient(to right, rgba(156, 163, 175, 0.2) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(156, 163, 175, 0.2) 1px, transparent 1px)
        `,
        backgroundSize: '5px 5px, 5px 5px, 20px 20px, 20px 20px, 80px 80px, 80px 80px',
        backgroundColor: '#ffffff'
      }}
    >
      <div className="relative h-full">
        {children}
      </div>
    </div>
  );
}