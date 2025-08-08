import { Trash2, Upload, Edit3 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface QBOTChatHeaderProps {
  onClear?: () => void;
}

const DEFAULT_CHATBOT_INVITES = [
  // Maritime-themed invites
  "Trick Question or Engine Room Reality?",
  "Brainstorm Before Rainstorm?", 
  "Ever Heard the Chief Say This?",
  "Guess Before It Sinks!",
  "Bridge or Bluff?",
  "Sailor's Pop Quiz! Ready?",
  "Sea Logic or Ship Magic?",
  "This One's Hotter Than E/R on Fire Watch!",
  "Smarter Than Your 2/E? Prove It.",
  "Don't Let the Cadet Answer First!",
  "Main Engine Trick or Treat?",
  "Radar's On… But Are You?",
  "Purifier Puzzle! Swipe to Solve.",
  "One Alarm… A Hundred Theories.",
  "This Ain't in Your DG Approved Notes.",
  "Ship Roll or Role Confusion?",
  "Code 710? Or Just A Galley Rumor?",
  "Log Book Says One Thing… Reality Another?",
  "Can You Solve This Before UMS Buzzer Rings?",
  
  // Desi maritime flavor
  "Chai Break Mein Ye Socho…",
  "2nd Engineer Bolega: Kya Samjha Iska Matlab?",
  "Galley Ka Chana Garam Se Tez Hai Ye Sawal!",
  "Ustad Bole – Answer Bata, Varna Line Mein Lag.",
  "DG Shipping Is Watching... Think Fast!",
  "Ship Mein Wifi Nahi, Dimaag Toh On Rakho!",
  "Aur Batao, Ye Doubt Kisko Dena Hai?",
  "Boss Chief Asks: Can You Answer This?",
  "No Signal? Still Got This Puzzle!",
  
  // Filipino maritime style
  "Kapag Hindi Mo Alam… Lagot Ka Sa Bosun!",
  "Midwatch Thinking? Try This!",
  "Before Your Karaoke Turn, Try Solving This!",
  "Galley Gossip or Nautical Fact?",
  "PO3 Says Only Smart Guys Know This!",
  
  // Tech-themed invites  
  "Guess What?",
  "You Think You Know?",
  "Wait, Really?",
  "Spot the Mistake?",
  "Ever Wondered Why?",
  "Sounds Easy, Right?",
  "Let's Test That Brain!",
  "Pop Quiz!",
  "Not What You Think!",
  "Challenge Accepted?",
  "Bug or Feature?",
  "Logic Says One Thing…",
  "Ctrl + Z That Thought!",
  "CPU Says No. You Say Yes?",
  "It Works on My Machine!",
  "One Line of Code… One Big Mess.",
  "Compiled… But Not Complied!",
  
  // Food & casual invites
  "This One's Hotter Than Your Maggi.",
  "Better Than Spicy Paneer Momos.",
  "More Twisted Than Desi Chinese.",
  "Click Before It Gets Cold!",
  "Masala for Your Monday.",
  "Brain Fry > French Fry.",
  "Too Good to Scroll Past."
];

export default function QBOTChatHeader({ onClear }: QBOTChatHeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [chatbotInvites, setChatbotInvites] = useState(() => {
    const saved = localStorage.getItem('chatbotInvites');
    return saved ? JSON.parse(saved) : DEFAULT_CHATBOT_INVITES;
  });
  const [editText, setEditText] = useState('');
  const { toast } = useToast();

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
      toast({
        title: "Error",
        description: "Please add at least one chatbot invite message.",
        variant: "destructive"
      });
      return;
    }

    setChatbotInvites(newInvites);
    localStorage.setItem('chatbotInvites', JSON.stringify(newInvites));
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: `Updated ${newInvites.length} chatbot invite messages.`
    });

    // Trigger placeholder update
    window.dispatchEvent(new Event('chatbotInvitesUpdated'));
  };

  const handleResetToDefault = () => {
    setChatbotInvites(DEFAULT_CHATBOT_INVITES);
    localStorage.setItem('chatbotInvites', JSON.stringify(DEFAULT_CHATBOT_INVITES));
    setEditText(DEFAULT_CHATBOT_INVITES.join('\n'));
    
    toast({
      title: "Reset Complete",
      description: "Restored default maritime and tech chatbot invites."
    });
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

        {/* Chatbot Invites Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              onClick={handleEditInvites}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Edit chatbot invites"
              title="Edit chatbot invites"
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