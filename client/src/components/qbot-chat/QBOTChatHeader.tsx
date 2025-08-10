import { Trash2, Upload, Edit3 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


interface QBOTChatHeaderProps {
  onClear?: () => void;
  isAdmin?: boolean;
}

const DEFAULT_CHATBOT_INVITES = [
  "Engine trouble? Ask away!",
  "Pump problem? Fire away!",
  "Boiler blues? Let's chat!",
  "Ship system issue?",
  "Maritime emergency?",
  "Technical question?",
  "Equipment doubt?",
  "Maintenance query?",
  "Safety concern?",
  "Navigation puzzle?",
  "Cargo confusion?",
  "Fuel system query?",
  "Generator glitch?",
  "Valve vexation?",
  "Pipe puzzle?",
  "Motor malfunction?",
  "Control confusion?",
  "System stumped?",
  "Machine mystery?",
  "Tool trouble?",
  "Part problem?",
  "Quick question?",
  "Need help?",
  "Ask QBOT!",
  "Maritime doubt?",
  "Ship query?",
  "Tech trouble?",
  "Equipment help?",
  "System support?",
  "Expert advice?"
];

export default function QBOTChatHeader({ onClear, isAdmin = false }: QBOTChatHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [chatbotInvites, setChatbotInvites] = useState(() => {
    const saved = localStorage.getItem('chatbotInvites');
    return saved ? JSON.parse(saved) : DEFAULT_CHATBOT_INVITES;
  });
  const [editText, setEditText] = useState('');

  const handleEditInvites = () => {
    setEditText(chatbotInvites.join('\n'));
    setIsDialogOpen(true);
  };

  const handleSaveInvites = () => {
    const newInvites = editText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (newInvites.length === 0) {
      console.error("Please add at least one chatbot invite message.");
      return;
    }

    setChatbotInvites(newInvites);
    localStorage.setItem('chatbotInvites', JSON.stringify(newInvites));
    setIsDialogOpen(false);
    
    console.log(`Updated ${newInvites.length} chatbot invite messages.`);

    // Trigger placeholder update
    window.dispatchEvent(new Event('chatbotInvitesUpdated'));
  };

  const handleResetToDefault = () => {
    setChatbotInvites(DEFAULT_CHATBOT_INVITES);
    localStorage.setItem('chatbotInvites', JSON.stringify(DEFAULT_CHATBOT_INVITES));
    setEditText(DEFAULT_CHATBOT_INVITES.join('\n'));
    
    console.log("Reset complete - restored default maritime and tech chatbot invites.");
  };

  return (
    <div className="relative z-10 h-[50px] bg-gradient-to-r from-red-500 to-orange-500 shadow-lg flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Action Icons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onClear}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Clear chat"
          title="Clear chat history"
        >
          <Trash2 size={18} className="text-white" />
        </button>

        {/* Chatbot Invites Dialog - Only for Admin */}
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button
                onClick={handleEditInvites}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Edit chatbot invites"
                title="Edit chatbot invites (Admin only)"
              >
                <Upload size={18} className="text-white" />
              </button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 size={20} className="text-orange-600" />
                Edit Chatbot Invites
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Edit the welcome messages that appear as placeholders in the QBOT chat box. 
                Each line becomes a separate invite message.
              </p>
              <Textarea
                placeholder="Enter chatbot invite messages, one per line..."
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Reset to Default
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveInvites}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Save Invites
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Center: QBOT AI Text */}
      <h2 className="text-white font-bold text-lg tracking-wide">
        QBOT AI Assistant
      </h2>

      {/* Right: Spacer for symmetry */}
      <div className="w-10" />
    </div>
  );
}