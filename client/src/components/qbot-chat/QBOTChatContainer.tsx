interface QBOTChatContainerProps {
  children?: React.ReactNode;
}

export default function QBOTChatContainer({ children }: QBOTChatContainerProps) {
  return (
    <div 
      className="flex flex-col h-full relative"
      role="main"
      aria-label="QBOT Chat"
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
      <div className="relative h-full flex flex-col">
        {/* Chat content */}
        {children}
      </div>
    </div>
  );
}