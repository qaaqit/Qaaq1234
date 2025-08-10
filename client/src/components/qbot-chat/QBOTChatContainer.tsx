interface QBOTChatContainerProps {
  children?: React.ReactNode;
}

export default function QBOTChatContainer({ children }: QBOTChatContainerProps) {
  return (
    <div 
      className="flex flex-col h-full bg-white"
      role="main"
      aria-label="QBOT Chat"
    >
      {/* Chat content */}
      {children}
    </div>
  );
}