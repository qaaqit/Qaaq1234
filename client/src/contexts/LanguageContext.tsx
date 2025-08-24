import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'tr';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations = {
  en: {
    // Navigation & General
    'nav.chat': 'Chat',
    'nav.questions': 'Questions',
    'nav.logout': 'Logout',
    'nav.admin': 'Admin',
    'nav.premium': 'Premium',
    
    // Chat Interface
    'chat.title': 'QBOT Maritime AI Assistant',
    'chat.placeholder': 'Ask your maritime question...',
    'chat.send': 'Send',
    'chat.typing': 'QBOT is typing...',
    'chat.welcome.title': 'Welcome to QBOT',
    'chat.welcome.subtitle': 'Your Maritime AI Assistant',
    'chat.welcome.description': 'Ask questions about maritime operations, equipment, regulations, and more.',
    'chat.improve_prompt': 'Improve this prompt for better AI responses',
    'chat.private_mode': 'Private Mode: Chat not stored in database',
    'chat.enable_private': 'Enable Private Mode',
    'chat.premium_required': 'Premium subscription required',
    
    // AI Models
    'ai.chatgpt': 'ChatGPT',
    'ai.gemini': 'Gemini',
    'ai.grok': 'Grok',
    'ai.mistral': 'Mistral',
    'ai.select_models': 'Select AI Models',
    'ai.premium_only': 'Premium Only',
    
    // Subscription
    'premium.title': 'Upgrade to Premium',
    'premium.subtitle': 'Unlock all AI models and unlimited responses',
    'premium.monthly': 'Monthly Plan',
    'premium.yearly': 'Yearly Plan',
    'premium.upgrade': 'Upgrade Now',
    'premium.benefits': 'Premium Benefits',
    'premium.unlimited': 'Unlimited AI responses',
    'premium.all_models': 'Access to all AI models',
    'premium.priority': 'Priority support',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.settings': 'Settings',
    
    // Questions
    'questions.title': 'Maritime Questions',
    'questions.recent': 'Recent Questions',
    'questions.popular': 'Popular Questions',
    'questions.no_results': 'No questions found',
    'questions.ask_new': 'Ask New Question',
    
    // User Interface
    'user.profile': 'Profile',
    'user.rank': 'Maritime Rank',
    'user.location': 'Location',
    'user.ship': 'Ship',
    'user.experience': 'Experience',
    
    // Language Switcher
    'language.english': 'English',
    'language.turkish': 'Türkçe',
    'language.select': 'Select Language'
  },
  
  tr: {
    // Navigation & General
    'nav.chat': 'Sohbet',
    'nav.questions': 'Sorular',
    'nav.logout': 'Çıkış',
    'nav.admin': 'Yönetici',
    'nav.premium': 'Premium',
    
    // Chat Interface
    'chat.title': 'QBOT Denizcilik AI Asistanı',
    'chat.placeholder': 'Denizcilik sorunuzu sorun...',
    'chat.send': 'Gönder',
    'chat.typing': 'QBOT yazıyor...',
    'chat.welcome.title': 'QBOT\'a Hoş Geldiniz',
    'chat.welcome.subtitle': 'Denizcilik AI Asistanınız',
    'chat.welcome.description': 'Denizcilik operasyonları, ekipmanlar, düzenlemeler ve daha fazlası hakkında sorular sorun.',
    'chat.improve_prompt': 'Daha iyi AI yanıtları için bu soruyu iyileştir',
    'chat.private_mode': 'Özel Mod: Sohbet veritabanında saklanmıyor',
    'chat.enable_private': 'Özel Modu Etkinleştir',
    'chat.premium_required': 'Premium abonelik gerekli',
    
    // AI Models
    'ai.chatgpt': 'ChatGPT',
    'ai.gemini': 'Gemini',
    'ai.grok': 'Grok',
    'ai.mistral': 'Mistral',
    'ai.select_models': 'AI Modellerini Seç',
    'ai.premium_only': 'Sadece Premium',
    
    // Subscription
    'premium.title': 'Premium\'a Yükselt',
    'premium.subtitle': 'Tüm AI modellerinin kilidini aç ve sınırsız yanıt al',
    'premium.monthly': 'Aylık Plan',
    'premium.yearly': 'Yıllık Plan',
    'premium.upgrade': 'Şimdi Yükselt',
    'premium.benefits': 'Premium Avantajları',
    'premium.unlimited': 'Sınırsız AI yanıtları',
    'premium.all_models': 'Tüm AI modellerine erişim',
    'premium.priority': 'Öncelikli destek',
    
    // Common
    'common.loading': 'Yükleniyor...',
    'common.error': 'Hata',
    'common.success': 'Başarılı',
    'common.cancel': 'İptal',
    'common.continue': 'Devam Et',
    'common.close': 'Kapat',
    'common.save': 'Kaydet',
    'common.delete': 'Sil',
    'common.edit': 'Düzenle',
    'common.settings': 'Ayarlar',
    
    // Questions
    'questions.title': 'Denizcilik Soruları',
    'questions.recent': 'Son Sorular',
    'questions.popular': 'Popüler Sorular',
    'questions.no_results': 'Soru bulunamadı',
    'questions.ask_new': 'Yeni Soru Sor',
    
    // User Interface
    'user.profile': 'Profil',
    'user.rank': 'Denizcilik Rütbesi',
    'user.location': 'Konum',
    'user.ship': 'Gemi',
    'user.experience': 'Deneyim',
    
    // Language Switcher
    'language.english': 'English',
    'language.turkish': 'Türkçe',
    'language.select': 'Dil Seçin'
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // Check localStorage first, then browser language, default to English
    const saved = localStorage.getItem('qaaq_language') as SupportedLanguage;
    if (saved && ['en', 'tr'].includes(saved)) {
      return saved;
    }
    
    // Detect Turkish browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('tr')) {
      return 'tr';
    }
    
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('qaaq_language', lang);
    
    // Update document language attribute
    document.documentElement.lang = lang;
  };

  // Update document language on component mount
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key as keyof typeof translations[typeof language]] || 
                       translations.en[key as keyof typeof translations.en] || 
                       key;
    
    if (params && typeof translation === 'string') {
      return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}