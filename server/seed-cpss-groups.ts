import { neon } from '@neondatabase/serverless';

// Use the same QAAQ Parent Database as the application
const QAAQ_PARENT_DB_URL = "postgresql://neondb_owner:npg_rTOn7VZkYAb3@ep-autumn-hat-a27gd1cd.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(QAAQ_PARENT_DB_URL);

interface GroupData {
  country: string;
  ports: Array<{
    name: string;
    suburbs: Array<{
      name: string;
      services: string[];
    }>;
  }>;
}

const countries: GroupData[] = [
  {
    country: "India",
    ports: [
      {
        name: "Mumbai",
        suburbs: [
          { name: "Colaba", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Bandra", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Chennai",
        suburbs: [
          { name: "Marina", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Mylapore", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "Singapore",
    ports: [
      {
        name: "Singapore Port",
        suburbs: [
          { name: "Jurong", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Tanjong Pagar", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "PSA Terminal",
        suburbs: [
          { name: "Pasir Panjang", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Brani", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "UAE",
    ports: [
      {
        name: "Dubai",
        suburbs: [
          { name: "Jebel Ali", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Port Rashid", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Abu Dhabi",
        suburbs: [
          { name: "Khalifa Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Zayed Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "Turkiye",
    ports: [
      {
        name: "Istanbul",
        suburbs: [
          { name: "Ambarli", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Haydarpasa", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Izmir",
        suburbs: [
          { name: "Alsancak", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Aliaga", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "Germany",
    ports: [
      {
        name: "Hamburg",
        suburbs: [
          { name: "HafenCity", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Altona", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Bremen",
        suburbs: [
          { name: "Bremerhaven", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Neustädter", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "Netherlands",
    ports: [
      {
        name: "Rotterdam",
        suburbs: [
          { name: "Maasvlakte", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Waalhaven", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Amsterdam",
        suburbs: [
          { name: "Westpoort", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Noord", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "Belgium",
    ports: [
      {
        name: "Antwerp",
        suburbs: [
          { name: "Deurganck", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Europa Terminal", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Zeebrugge",
        suburbs: [
          { name: "Outer Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Inner Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "Cyprus",
    ports: [
      {
        name: "Limassol",
        suburbs: [
          { name: "New Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Old Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Larnaca",
        suburbs: [
          { name: "Marina", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Commercial Port", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "USA",
    ports: [
      {
        name: "Los Angeles",
        suburbs: [
          { name: "San Pedro", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Long Beach", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "New York",
        suburbs: [
          { name: "Brooklyn", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Newark", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  },
  {
    country: "China",
    ports: [
      {
        name: "Shanghai",
        suburbs: [
          { name: "Yangshan", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Waigaoqiao", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Shenzhen",
        suburbs: [
          { name: "Yantian", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Shekou", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      },
      {
        name: "Others",
        suburbs: [
          { name: "Various", services: ["Qaaq Store", "Port Experience", "Others"] },
          { name: "Others", services: ["Qaaq Store", "Port Experience", "Others"] }
        ]
      }
    ]
  }
];

async function seedCPSSGroups() {
  console.log("Starting CPSS groups seeding...");
  
  try {
    // Clear existing groups
    await sql`DELETE FROM cpss_groups`;
    
    const groups = [];
    
    for (const countryData of countries) {
      const country = countryData.country;
      
      // Create country-level group
      const countryGroupId = `cpss_${country.toLowerCase().replace(/\s+/g, '_')}`;
      groups.push({
        group_id: countryGroupId,
        group_name: `${country} Maritime Community`,
        breadcrumb_path: country,
        group_type: 'country',
        country: country,
        port: null,
        suburb: null,
        service: null,
        description: `Connect with maritime professionals across ${country}`,
        member_count: Math.floor(Math.random() * 500) + 100
      });
      
      for (const portData of countryData.ports) {
        const port = portData.name;
        
        // Create port-level group
        const portGroupId = `cpss_${country.toLowerCase().replace(/\s+/g, '_')}_${port.toLowerCase().replace(/\s+/g, '_')}`;
        groups.push({
          group_id: portGroupId,
          group_name: `${port} Port Community`,
          breadcrumb_path: `${country} > ${port}`,
          group_type: 'port',
          country: country,
          port: port,
          suburb: null,
          service: null,
          description: `Maritime professionals and services in ${port}`,
          member_count: Math.floor(Math.random() * 300) + 50
        });
        
        for (const suburbData of portData.suburbs) {
          const suburb = suburbData.name;
          
          // Create suburb-level group
          const suburbGroupId = `cpss_${country.toLowerCase().replace(/\s+/g, '_')}_${port.toLowerCase().replace(/\s+/g, '_')}_${suburb.toLowerCase().replace(/\s+/g, '_')}`;
          groups.push({
            group_id: suburbGroupId,
            group_name: `${suburb} Area Group`,
            breadcrumb_path: `${country} > ${port} > ${suburb}`,
            group_type: 'suburb',
            country: country,
            port: port,
            suburb: suburb,
            service: null,
            description: `Local services and connections in ${suburb}`,
            member_count: Math.floor(Math.random() * 150) + 20
          });
          
          for (const service of suburbData.services) {
            // Create service-level group
            const serviceGroupId = `cpss_${country.toLowerCase().replace(/\s+/g, '_')}_${port.toLowerCase().replace(/\s+/g, '_')}_${suburb.toLowerCase().replace(/\s+/g, '_')}_${service.toLowerCase().replace(/\s+/g, '_')}`;
            groups.push({
              group_id: serviceGroupId,
              group_name: service === "Qaaq Store" ? "Qaaq Store Group" : 
                       service === "Port Experience" ? "Port Experience Group" : 
                       "Community Services Group",
              breadcrumb_path: `${country} > ${port} > ${suburb} > ${service}`,
              group_type: 'service',
              country: country,
              port: port,
              suburb: suburb,
              service: service,
              description: service === "Qaaq Store" ? "Order maritime essentials and supplies" :
                         service === "Port Experience" ? "Share and discover port experiences" :
                         "Various community services and resources",
              member_count: Math.floor(Math.random() * 100) + 10
            });
          }
        }
      }
    }
    
    // Insert all groups
    for (const group of groups) {
      await sql`
        INSERT INTO cpss_groups (
          group_id, group_name, breadcrumb_path, group_type,
          country, port, suburb, service, description, member_count
        ) VALUES (
          ${group.group_id}, ${group.group_name}, ${group.breadcrumb_path}, ${group.group_type},
          ${group.country}, ${group.port}, ${group.suburb}, ${group.service}, 
          ${group.description}, ${group.member_count}
        )
      `;
    }
    
    console.log(`Successfully seeded ${groups.length} CPSS groups!`);
    
    // Add some sample members to a few groups
    const sampleMembers = [
      { user_id: 'wa_919029010070', user_name: 'Piyush Gupta' },
      { user_id: 'wa_919845865262', user_name: 'Vaishak kori' },
      { user_id: 'wa_917278295646', user_name: 'Shashank Kumar' },
      { user_id: 'wa_919920027697', user_name: 'Explain vit' }
    ];
    
    // Add members to some groups
    const popularGroups = [
      'cpss_india_mumbai_colaba_qaaq_store',
      'cpss_singapore_singapore_port_jurong_port_experience',
      'cpss_uae_dubai',
      'cpss_india_chennai'
    ];
    
    for (const groupId of popularGroups) {
      for (const member of sampleMembers) {
        await sql`
          INSERT INTO cpss_group_members (group_id, user_id, user_name)
          VALUES (${groupId}, ${member.user_id}, ${member.user_name})
          ON CONFLICT (group_id, user_id) DO NOTHING
        `;
      }
    }
    
    console.log("Sample members added to popular groups!");
    
  } catch (error) {
    console.error("Error seeding CPSS groups:", error);
    throw error;
  }
}

// Run the seeding
seedCPSSGroups().then(() => {
  console.log("CPSS groups seeding completed!");
  process.exit(0);
}).catch(error => {
  console.error("Seeding failed:", error);
  process.exit(1);
});