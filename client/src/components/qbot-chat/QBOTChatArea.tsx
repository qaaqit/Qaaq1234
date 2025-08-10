interface QBOTChatAreaProps {
  children?: React.ReactNode;
}

export default function QBOTChatArea({ children }: QBOTChatAreaProps) {
  return (
    <div 
      className="flex-1 overflow-hidden relative"
      style={{
        backgroundImage: `
          linear-gradient(to right, #E5E7EB 1px, transparent 1px),
          linear-gradient(to bottom, #E5E7EB 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        backgroundColor: '#FFFFFF'
      }}
    >
      <div className="absolute inset-0 bg-white/50" />
      <div className="relative h-full">
        {children}
      </div>
    </div>
  );
}