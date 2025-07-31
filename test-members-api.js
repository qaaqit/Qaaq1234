// Quick test to check members API
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NzkxZTY2Zi05Y2MxLTRiZTQtYmQ0Yi03ZmMxYmQyZTI1OGUiLCJpYXQiOjE3NTM5OTk4NDMsImV4cCI6MTc1NDE3MjY0M30.TKiSDUpKLN8Z9fALXGT5FH8vrh7dEtgJ5jV3fCMYQ1I';

// Test Cadets group (find ID first)
fetch('http://localhost:5000/api/rank-groups', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(groups => {
  console.log('Groups found:', groups.length);
  const cadetsGroup = groups.find(g => g.name === 'Cadets');
  if (cadetsGroup) {
    console.log('Cadets group:', cadetsGroup.name, 'ID:', cadetsGroup.id, 'Members:', cadetsGroup.memberCount);
    
    // Test members API
    return fetch(`http://localhost:5000/api/rank-groups/${cadetsGroup.id}/members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } else {
    console.log('Cadets group not found');
  }
})
.then(res => res ? res.json() : null)
.then(members => {
  if (members) {
    console.log('Members API response:', Array.isArray(members) ? `${members.length} members` : 'Error');
    if (Array.isArray(members) && members.length > 0) {
      console.log('First member:', members[0]);
    }
  }
})
.catch(err => console.error('Error:', err));