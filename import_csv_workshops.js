const fs = require('fs');
const { v4: uuidv4 } = require('crypto');

// Read and parse CSV data
const csvData = `Timestamp,"1.  Contact person Name (First Name, Last Name)",2. Primary Email,3. Wshop Competency / Expertise  (Please select only 1),"4.  Briefly describe area of your workshop's core expertise, number of staff & year of establishment. ",5. WhatsApp / WeChat/  Phone (with country code),6. Port where your branch is located? (Write only one city with pincode). Multiple city entry will get rejected.,7. Service Engineer Visa status,8. Companies worked for  (in last 1 year):,Photo of your Business card & Workshop front,Quote for 8 hour attendance of Service Engineer?  ,"Kindly quote best tariff, for per day attendance of Service Engineer? (in USD). For outstation works, travel visa and stay will be arranged separately, by ship manager.",Your workshop's official website,Remote troubleshooting service? Guidance via Google meet/ Zoom. Kindly quote best tariff /hour session.,Column 14,Workshop Bank Details,Business Card
7/16/2025 5:56:44,Rahmat Ibrahim,Rahamathullah.ibrahim@goltens.com,"Automation (Radio Survey/ Electrical Electronics), Hydraulic/ Pneumatic, Mechanical (Repairs/ Fabrication/ Combustion/ Cargo Pumps FRAMO MARFLEX), Turbocharger / Governor/ Refrigeration / UTM / UWILD",Goltens Dubai is Authorized for Yanmar engine maker ,+971506504603,Dubai ,Can be arranged quickly.,All above we work,,,,,,,,
7/3/2025 5:12:14,SAFWAN KATHIWALA,sales1visionint@gmail.com,"Automation (Radio Survey/ Electrical Electronics), Hydraulic/ Pneumatic, Mechanical (Repairs/ Fabrication/ Combustion/ Cargo Pumps FRAMO MARFLEX), Turbocharger / Governor/ Refrigeration / UTM / UWILD","We are global supplier of ship machinery and spares and also we have remote team available for onboard services for all over middle East, our main head office is in alang, gujarat, india we have strong presence in middle East like we have team in dubai, qatar, bahrain and oman also we have facility to provide the spares in these locations.","+91 9825209863, + 91 9033290254",bhavnagar,Above Visas can be arranged on short notice,Marvel ship management and others ,,,,,,,,`;

// Function to parse CSV (simple CSV parser)
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const workshops = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    // Simple CSV parsing - handle quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    if (values.length >= 7) { // Ensure we have minimum required fields
      const workshop = {
        id: uuidv4(),
        full_name: values[1] || '',
        email: values[2] || '',
        maritime_expertise: values[3] || '',
        description: values[4] || '',
        whatsapp_number: values[5] || '',
        location: values[6] || '',
        official_website: values[12] || '',
        import_source: 'csv_authentic_2025'
      };
      
      workshops.push(workshop);
    }
  }
  
  return workshops;
}

// Parse the workshops
const workshops = parseCSV(csvData);

// Generate SQL insert statements
console.log('-- Importing authentic workshops from CSV');
console.log('-- Total workshops to import:', workshops.length);
console.log('');

workshops.forEach(workshop => {
  const sql = `INSERT INTO workshop_profiles (id, full_name, email, maritime_expertise, description, whatsapp_number, location, official_website, import_source, is_active, created_at, updated_at) VALUES (
    '${workshop.id}',
    '${workshop.full_name.replace(/'/g, "''")}',
    '${workshop.email}',
    '${workshop.maritime_expertise.replace(/'/g, "''")}',
    '${workshop.description.replace(/'/g, "''").substring(0, 1000)}',
    '${workshop.whatsapp_number}',
    '${workshop.location.replace(/'/g, "''")}',
    '${workshop.official_website}',
    '${workshop.import_source}',
    true,
    NOW(),
    NOW()
  );`;
  
  console.log(sql);
});