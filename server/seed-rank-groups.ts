import { neon } from '@neondatabase/serverless';

// Use the same QAAQ Parent Database as the application
const QAAQ_PARENT_DB_URL = "postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(QAAQ_PARENT_DB_URL);

interface RankGroup {
  group_id: string;
  group_name: string;
  breadcrumb_path: string;
  group_type: string;
  description: string;
  member_count: number;
  rank_category: string;
}

const rankGroups: RankGroup[] = [
  {
    group_id: 'rank_master_co',
    group_name: 'Mtr CO',
    breadcrumb_path: 'Master & Chief Officer',
    group_type: 'rank',
    description: 'Senior deck officers - Masters, Chief Officers, and Captain discussions',
    member_count: 45,
    rank_category: 'senior_deck'
  },
  {
    group_id: 'rank_2o_3o',
    group_name: '2O 3O',
    breadcrumb_path: 'Second & Third Officers',
    group_type: 'rank',
    description: 'Navigation officers - 2nd Officers, 3rd Officers, and deck watch keepers',
    member_count: 78,
    rank_category: 'deck_officers'
  },
  {
    group_id: 'rank_ce_2e',
    group_name: 'CE 2E',
    breadcrumb_path: 'Chief & Second Engineers',
    group_type: 'rank',
    description: 'Senior engine room officers - Chief Engineers and Second Engineers',
    member_count: 52,
    rank_category: 'senior_engine'
  },
  {
    group_id: 'rank_3e_4e',
    group_name: '3E 4E',
    breadcrumb_path: 'Third & Fourth Engineers',
    group_type: 'rank',
    description: 'Junior engine officers - 3rd Engineers, 4th Engineers, and engine watch keepers',
    member_count: 89,
    rank_category: 'engine_officers'
  },
  {
    group_id: 'rank_cadets',
    group_name: 'Cadets',
    breadcrumb_path: 'Maritime Cadets',
    group_type: 'rank',
    description: 'Deck and Engine cadets - Training officers and maritime students',
    member_count: 156,
    rank_category: 'training'
  },
  {
    group_id: 'rank_crew',
    group_name: 'Crew',
    breadcrumb_path: 'Ship Crew',
    group_type: 'rank',
    description: 'Ratings and crew members - ABs, OSs, Motormen, Wipers, and all ratings',
    member_count: 234,
    rank_category: 'ratings'
  },
  {
    group_id: 'rank_eto',
    group_name: 'ETO',
    breadcrumb_path: 'Electro Technical Officers',
    group_type: 'rank',
    description: 'Electrical and electronics specialists - ETOs and electrical engineers',
    member_count: 67,
    rank_category: 'technical'
  },
  {
    group_id: 'rank_superintendents',
    group_name: 'Superintendents',
    breadcrumb_path: 'Superintendents',
    group_type: 'rank',
    description: 'Shore-based maritime management - Technical, Marine, and Port Superintendents',
    member_count: 38,
    rank_category: 'management'
  },
  {
    group_id: 'rank_marine_professionals',
    group_name: 'Marine Professionals',
    breadcrumb_path: 'Marine Professionals',
    group_type: 'rank',
    description: 'Maritime industry professionals - Surveyors, Port agents, Maritime lawyers, Consultants',
    member_count: 91,
    rank_category: 'professional'
  }
];

async function seedRankGroups() {
  console.log("Starting maritime rank groups seeding...");
  
  try {
    // Clear existing rank groups
    await sql`DELETE FROM cpss_groups WHERE group_type = 'rank'`;
    console.log("Cleared existing rank groups");
    
    // Insert rank groups
    for (const group of rankGroups) {
      await sql`
        INSERT INTO cpss_groups (
          group_id, group_name, breadcrumb_path, group_type,
          country, port, suburb, service, description, member_count
        ) VALUES (
          ${group.group_id}, ${group.group_name}, ${group.breadcrumb_path}, ${group.group_type},
          null, null, null, null, ${group.description}, ${group.member_count}
        )
      `;
    }
    
    console.log(`Successfully seeded ${rankGroups.length} maritime rank groups!`);
    
    // Add some sample posts to popular rank groups
    const samplePosts = [
      {
        group_id: 'rank_master_co',
        user_id: 'wa_919029010070',
        user_name: 'Piyush Gupta',
        content: 'What are the latest regulations for port state control inspections? Any updates from IMO?',
        post_type: 'discussion'
      },
      {
        group_id: 'rank_cadets',
        user_id: 'wa_919845865262',
        user_name: 'Vaishak Kori',
        content: 'Starting my first voyage as deck cadet next month. Any advice for a fresher?',
        post_type: 'question'
      },
      {
        group_id: 'rank_ce_2e',
        user_id: 'wa_917278295646',
        user_name: 'Shashank Kumar',
        content: 'Best practices for main engine maintenance during port stays. Let me know your experience.',
        post_type: 'discussion'
      },
      {
        group_id: 'rank_eto',
        user_id: 'wa_919920027697',
        user_name: 'Explain VIT',
        content: 'New GMDSS regulations coming into effect. How are you preparing your crew?',
        post_type: 'announcement'
      }
    ];

    // Insert sample posts
    for (const post of samplePosts) {
      const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await sql`
        INSERT INTO cpss_group_posts (
          post_id, group_id, user_id, user_name, content, post_type,
          attachments, likes_count, comments_count, is_pinned
        ) VALUES (
          ${postId}, ${post.group_id}, ${post.user_id}, ${post.user_name}, ${post.content}, ${post.post_type},
          '[]', ${Math.floor(Math.random() * 15)}, ${Math.floor(Math.random() * 8)}, false
        )
      `;
    }
    
    console.log("Sample posts added to rank groups!");
    
    // Add some sample members to popular rank groups
    const sampleMembers = [
      { user_id: 'wa_919029010070', user_name: 'Piyush Gupta' },
      { user_id: 'wa_919845865262', user_name: 'Vaishak Kori' },
      { user_id: 'wa_917278295646', user_name: 'Shashank Kumar' },
      { user_id: 'wa_919920027697', user_name: 'Explain VIT' }
    ];
    
    // Add members to rank groups based on typical maritime career paths
    const membershipMap = {
      'rank_cadets': ['wa_919845865262'], // Vaishak as cadet
      'rank_3e_4e': ['wa_917278295646'], // Shashank as junior engineer
      'rank_ce_2e': ['wa_919029010070'], // Piyush as senior engineer
      'rank_eto': ['wa_919920027697'], // Explain VIT as ETO
      'rank_marine_professionals': ['wa_919029010070', 'wa_919920027697'], // Senior professionals
    };

    for (const [groupId, userIds] of Object.entries(membershipMap)) {
      for (const userId of userIds) {
        const member = sampleMembers.find(m => m.user_id === userId);
        if (member) {
          await sql`
            INSERT INTO cpss_group_members (group_id, user_id, user_name)
            VALUES (${groupId}, ${member.user_id}, ${member.user_name})
            ON CONFLICT (group_id, user_id) DO NOTHING
          `;
        }
      }
    }
    
    console.log("Sample members added to rank groups based on maritime roles!");
    
  } catch (error) {
    console.error("Error seeding maritime rank groups:", error);
    throw error;
  }
}

// Run the seeding function
seedRankGroups()
  .then(() => {
    console.log("Maritime rank groups seeding completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed maritime rank groups:", error);
    process.exit(1);
  });

export { seedRankGroups };