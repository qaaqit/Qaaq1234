interface QBOTChatAreaProps {
  children?: React.ReactNode;
}

export default function QBOTChatArea({ children }: QBOTChatAreaProps) {
  return (
    <div className="flex-1 overflow-hidden relative">
      <div className="relative h-full">
        {children}
      </div>
    </div>
  );
}