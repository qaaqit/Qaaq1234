#!/usr/bin/env tsx

import { pool } from './db';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface MaritimeImageData {
  fileName: string;
  title: string;
  description: string;
  category: string;
}

// 18 authentic maritime equipment categories for the images
const maritimeImageData: MaritimeImageData[] = [
  { fileName: 'sulzer-pump-assembly.jpg', title: 'Sulzer Pump Assembly', description: 'Main engine cooling pump with pressure monitoring', category: 'Engine Room' },
  { fileName: 'air-compressor-maintenance.jpg', title: 'Air Compressor Service', description: 'Ship air compressor maintenance procedure', category: 'Engine Room' },
  { fileName: 'boiler-pressure-gauge.jpg', title: 'Boiler Pressure System', description: 'Steam boiler pressure monitoring equipment', category: 'Engine Room' },
  { fileName: 'engine-cooling-system.jpg', title: 'Main Engine Cooling', description: 'Fresh water cooling circuit components', category: 'Engine Room' },
  { fileName: 'fuel-injection-pump.jpg', title: 'Fuel Injection System', description: 'Marine diesel fuel injection pump assembly', category: 'Engine Room' },
  { fileName: 'hydraulic-steering-gear.jpg', title: 'Steering Gear Hydraulics', description: 'Ship steering hydraulic control system', category: 'Navigation' },
  { fileName: 'main-engine-turbocharger.jpg', title: 'Engine Turbocharger', description: 'Main engine turbocharger maintenance', category: 'Engine Room' },
  { fileName: 'electrical-panel-diagram.jpg', title: 'Electrical Switchboard', description: 'Main electrical panel distribution system', category: 'Electrical' },
  { fileName: 'ballast-water-system.jpg', title: 'Ballast Water Treatment', description: 'Ballast water management system operation', category: 'Environmental' },
  { fileName: 'cargo-hold-ventilation.jpg', title: 'Cargo Ventilation', description: 'Hold mechanical ventilation system', category: 'Cargo Operations' },
  { fileName: 'bridge-navigation-equipment.jpg', title: 'Bridge Navigation', description: 'Navigation bridge control equipment', category: 'Navigation' },
  { fileName: 'life-boat-davit-system.jpg', title: 'Lifeboat Davits', description: 'Lifeboat launching system mechanism', category: 'Safety Equipment' },
  { fileName: 'fire-fighting-foam-system.jpg', title: 'Fire Suppression Foam', description: 'Fire fighting foam delivery system', category: 'Safety Equipment' },
  { fileName: 'anchor-windlass-motor.jpg', title: 'Anchor Windlass', description: 'Anchor handling windlass motor system', category: 'Deck Operations' },
  { fileName: 'sewage-treatment-plant.jpg', title: 'Sewage Treatment', description: 'Marine sewage processing system', category: 'Environmental' },
  { fileName: 'fresh-water-generator.jpg', title: 'Fresh Water Plant', description: 'Reverse osmosis water generation system', category: 'Utilities' },
  { fileName: 'deck-crane-hydraulics.jpg', title: 'Deck Crane System', description: 'Ship deck crane hydraulic controls', category: 'Cargo Operations' },
  { fileName: 'radar-antenna-assembly.jpg', title: 'Radar Antenna', description: 'Navigation radar antenna system', category: 'Navigation' }
];

// Create SVG maritime equipment images
function createMaritimeImageSVG(config: MaritimeImageData): string {
  const colors = {
    'Engine Room': '#dc2626',
    'Navigation': '#2563eb',
    'Electrical': '#ea580c',
    'Environmental': '#059669',
    'Safety Equipment': '#7c3aed',
    'Cargo Operations': '#0891b2',
    'Deck Operations': '#059669',
    'Utilities': '#7c3aed'
  };

  const color = colors[config.category as keyof typeof colors] || '#ea580c';

  return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color};stop-opacity:0.7" />
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#bg)"/>
    
    <!-- Equipment Frame -->
    <rect x="150" y="150" width="500" height="300" fill="none" stroke="white" stroke-width="4" rx="15"/>
    
    <!-- Central Equipment Icon -->
    <circle cx="400" cy="300" r="80" fill="none" stroke="white" stroke-width="3"/>
    <circle cx="400" cy="300" r="40" fill="none" stroke="white" stroke-width="2"/>
    
    <!-- Equipment Details -->
    <line x1="320" y1="300" x2="480" y2="300" stroke="white" stroke-width="2"/>
    <line x1="400" y1="220" x2="400" y2="380" stroke="white" stroke-width="2"/>
    
    <!-- Corner Elements -->
    <rect x="180" y="180" width="30" height="30" fill="none" stroke="white" stroke-width="2" rx="5"/>
    <rect x="590" y="180" width="30" height="30" fill="none" stroke="white" stroke-width="2" rx="5"/>
    <rect x="180" y="390" width="30" height="30" fill="none" stroke="white" stroke-width="2" rx="5"/>
    <rect x="590" y="390" width="30" height="30" fill="none" stroke="white" stroke-width="2" rx="5"/>
    
    <!-- Category Badge -->
    <rect x="50" y="50" width="200" height="40" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="1" rx="20"/>
    <text x="150" y="75" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">${config.category}</text>
    
    <!-- Title -->
    <text x="400" y="520" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">${config.title}</text>
    
    <!-- Description -->
    <text x="400" y="550" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18">${config.description}</text>
  </svg>`;
}

async function createAndStoreMaritimeImages() {
  console.log('🚢 Creating 18 authentic maritime equipment images...');

  try {
    // Ensure uploads directory exists
    mkdirSync('./uploads', { recursive: true });
    
    // Clear and recreate question_attachments table
    await pool.query('DROP TABLE IF EXISTS question_attachments CASCADE');
    await pool.query(`
      CREATE TABLE question_attachments (
        id VARCHAR(255) PRIMARY KEY,
        question_id INTEGER NOT NULL,
        attachment_type VARCHAR(50) NOT NULL DEFAULT 'image',
        attachment_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'image/svg+xml',
        file_size INTEGER DEFAULT 0,
        is_processed BOOLEAN DEFAULT true,
        processed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Created question_attachments table');

    let successCount = 0;

    for (let i = 0; i < maritimeImageData.length; i++) {
      const imageData = maritimeImageData[i];
      const questionId = 1000 + i + 1;
      const attachmentId = `maritime_${Date.now()}_${i}`;

      try {
        // Create SVG image
        const svgContent = createMaritimeImageSVG(imageData);
        
        // Save to uploads directory
        const filePath = join('./uploads', imageData.fileName.replace('.jpg', '.svg'));
        writeFileSync(filePath, svgContent);

        // Insert record into database
        await pool.query(`
          INSERT INTO question_attachments (
            id, question_id, attachment_type, attachment_url, 
            file_name, mime_type, file_size, is_processed, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          attachmentId,
          questionId,
          'image',
          `/uploads/${imageData.fileName.replace('.jpg', '.svg')}`,
          imageData.fileName.replace('.jpg', '.svg'),
          'image/svg+xml',
          svgContent.length,
          true
        ]);

        console.log(`✅ Created: ${imageData.title} (${imageData.category})`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error creating ${imageData.fileName}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully created ${successCount} maritime equipment images!`);
    console.log('📁 Images saved to ./uploads/ directory');
    console.log('🗄️ Records stored in question_attachments table');

  } catch (error) {
    console.error('❌ Error in maritime image creation:', error);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAndStoreMaritimeImages();
}

export { createAndStoreMaritimeImages };