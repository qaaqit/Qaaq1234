import WhatsAppTestPanel from '@/components/whatsapp-test-panel';

export default function WhatsAppTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-cream-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            QBOTwa WhatsApp Testing
          </h1>
          <p className="text-slate-600">
            Test your WhatsApp Business integration for maritime Q&A assistance
          </p>
        </div>
        
        <WhatsAppTestPanel />
      </div>
    </div>
  );
}