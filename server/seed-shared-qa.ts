import { syncQuestionFromExternalSource, storeAnswer } from './shared-qa-service';

// Sample questions from different sources to demonstrate the shared system
const sampleQuestions = [
  {
    questionId: 'qa_001_whatsapp',
    userId: 'wa_919845865262', 
    userName: 'Vaishak kori',
    questionText: 'What are the requirements for entering a port in Singapore? Need to know about documentation and clearance procedures.',
    source: 'whatsapp' as const,
    category: 'Port Operations',
    tags: ['singapore', 'port-entry', 'documentation'],
    askedDate: new Date('2025-01-28')
  },
  {
    questionId: 'qa_002_web',
    userId: '44885683',
    userName: 'Piyush Gupta', 
    questionText: 'How to troubleshoot main engine cylinder head temperature alarms? Engine is running but showing high temperatures on cylinders 3 and 5.',
    source: 'web' as const,
    category: 'Engine Operations',
    tags: ['main-engine', 'temperature', 'troubleshooting'],
    askedDate: new Date('2025-01-29')
  },
  {
    questionId: 'qa_003_whatsapp',
    userId: 'wa_919128085185',
    userName: 'Explain vit',
    questionText: 'What is the correct procedure for confined space entry on a chemical tanker? Need step-by-step safety checklist.',
    source: 'whatsapp' as const,
    category: 'Safety Procedures',
    tags: ['confined-space', 'chemical-tanker', 'safety'],
    askedDate: new Date('2025-01-29')
  },
  {
    questionId: 'qa_004_web',
    userId: 'wa_919128085185',
    userName: 'Explain vit',
    questionText: 'How to calculate ballast water requirements for container ship in rough weather conditions?',
    source: 'web' as const,
    category: 'Navigation & Stability',
    tags: ['ballast-water', 'container-ship', 'weather'],
    askedDate: new Date('2025-01-30')
  },
  {
    questionId: 'qa_005_whatsapp',
    userId: 'wa_917278295646',
    userName: 'Shashank Kumar',
    questionText: 'Best practices for cargo loading sequence on bulk carriers? Loading iron ore and need proper sequence to maintain stability.',
    source: 'whatsapp' as const,
    category: 'Cargo Operations',
    tags: ['bulk-carrier', 'iron-ore', 'loading-sequence'],
    askedDate: new Date('2025-01-30')
  }
];

const sampleAnswers = [
  {
    answerId: 'ans_001_qa_001',
    questionId: 'qa_001_whatsapp',
    userId: '44885683',
    userName: 'Piyush Gupta',
    answerText: 'For Singapore port entry, you need: 1) Pre-arrival notification 24hrs before 2) Valid ship certificates (safety, security, pollution) 3) Crew list and passenger manifest 4) Cargo manifest 5) Ship\'s stores declaration. Contact MPA VTS on Channel 12 for berth allocation.',
    source: 'web' as const,
    answeredDate: new Date('2025-01-28'),
    isAccepted: true
  },
  {
    answerId: 'ans_002_qa_002',
    questionId: 'qa_002_web',
    userId: 'wa_919845865262',
    userName: 'Vaishak kori',
    answerText: 'Check cooling water flow first - likely blockage in cylinder head cooling passages. Also verify fuel injection timing on those cylinders. Temperature sensors might also need calibration. Check with engine manual for specific temperature limits.',
    source: 'whatsapp' as const,
    answeredDate: new Date('2025-01-29')
  },
  {
    answerId: 'ans_003_qa_003',
    questionId: 'qa_003_whatsapp',
    userId: '44885683',
    userName: 'Piyush Gupta',
    answerText: 'Chemical tanker confined space entry: 1) Gas test (O2 19.5-23%, LEL <10%, H2S <10ppm) 2) Permit to enter 3) Ventilation running 4) Rescue team standby 5) Communication established 6) Emergency equipment ready 7) Continuous monitoring. Never enter alone!',
    source: 'web' as const,
    answeredDate: new Date('2025-01-29'),
    isAccepted: true
  }
];

async function seedSharedQADatabase() {
  try {
    console.log('🌱 Seeding shared Q&A database with sample questions and answers...\n');
    
    // Store sample questions
    console.log('Storing sample questions:');
    for (const question of sampleQuestions) {
      const success = await syncQuestionFromExternalSource(question);
      if (success) {
        console.log(`✓ Stored: ${question.questionText.substring(0, 60)}... (${question.source})`);
      } else {
        console.log(`✗ Failed to store question: ${question.questionId}`);
      }
    }
    
    console.log('\nStoring sample answers:');
    for (const answer of sampleAnswers) {
      try {
        await storeAnswer(answer);
        console.log(`✓ Stored answer for: ${answer.questionId}`);
      } catch (error) {
        console.log(`✗ Failed to store answer: ${answer.answerId}`);
      }
    }
    
    console.log('\n✅ Shared Q&A database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- ${sampleQuestions.length} questions stored`);
    console.log(`- ${sampleAnswers.length} answers stored`);
    console.log('- Questions from: WhatsApp bot, Web interface');
    console.log('- Categories: Port Operations, Engine Operations, Safety Procedures, Navigation & Stability, Cargo Operations');
    
  } catch (error) {
    console.error('❌ Error seeding shared Q&A database:', error);
  }
}

seedSharedQADatabase();