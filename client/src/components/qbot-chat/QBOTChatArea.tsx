interface QBOTChatAreaProps {
  children?: React.ReactNode;
}

export default function QBOTChatArea({ children }: QBOTChatAreaProps) {
  return (
    <div className="flex-1 overflow-hidden relative bg-gray-50/30">
      <div className="relative h-full">
        {children}
      </div>
    </div>
  );
}