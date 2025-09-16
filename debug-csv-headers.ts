#!/usr/bin/env tsx

import { promises as fs } from 'fs';
import path from 'path';

async function debugCSVHeaders() {
  const csvPath = path.join(process.cwd(), 'attached_assets', 'Marine Repairs Workshop Database (Responses) - Form Responses 1 (3)_1758031382970.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  
  const lines = csvContent.trim().split('\n');
  const headerLine = lines[0];
  
  console.log('Raw header line:');
  console.log(headerLine);
  console.log('\n');
  
  // Parse the header line properly
  const headers: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < headerLine.length) {
    const char = headerLine[i];

    if (char === '"' && (i === 0 || headerLine[i - 1] === ',')) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (i + 1 < headerLine.length && headerLine[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  headers.push(current.trim());
  
  console.log('Parsed headers:');
  headers.forEach((header, index) => {
    console.log(`${index}: "${header}"`);
  });
  
  console.log('\nFirst data row:');
  if (lines[1]) {
    const dataLine = lines[1];
    const values: string[] = [];
    current = '';
    inQuotes = false;
    i = 0;

    while (i < dataLine.length) {
      const char = dataLine[i];

      if (char === '"' && (i === 0 || dataLine[i - 1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (i + 1 < dataLine.length && dataLine[i + 1] === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }

    values.push(current.trim());
    
    console.log('Sample data values:');
    values.forEach((value, index) => {
      if (headers[index]) {
        console.log(`${index}: "${headers[index]}" = "${value}"`);
      }
    });
  }
}

debugCSVHeaders().catch(console.error);