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
          linear-gradient(to right, rgba(156, 163, 175, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(156, 163, 175, 0.15) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        backgroundColor: '#ffffff'
      }}
    >
      <div className="relative h-full">
        {children}
      </div>
    </div>
  );
}