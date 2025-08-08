import React from 'react';

interface MaritimeCommunicationBgProps {
  className?: string;
}

export default function MaritimeCommunicationBg({ className = "" }: MaritimeCommunicationBgProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0"
      >
        {/* Ocean Gradient Background */}
        <defs>
          <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#4682B4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.5" />
          </linearGradient>
          
          {/* Wave pattern */}
          <pattern id="waves" x="0" y="0" width="200" height="40" patternUnits="userSpaceOnUse">
            <path d="M0,20 Q50,10 100,20 T200,20" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.2"/>
            <path d="M0,25 Q50,15 100,25 T200,25" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.1"/>
          </pattern>
          
          {/* Message pulse animation */}
          <circle id="messagePulse" r="3" fill="#ea580c" opacity="0.8">
            <animate attributeName="r" values="3;8;3" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
          </circle>
          
          {/* Communication lines animation */}
          <line id="commLine" stroke="#ea580c" strokeWidth="2" opacity="0">
            <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
            <animateTransform attributeName="transform" type="scale" values="0,1;1,1;0,1" dur="3s" repeatCount="indefinite"/>
          </line>
        </defs>
        
        {/* Background */}
        <rect width="100%" height="100%" fill="url(#oceanGradient)"/>
        <rect width="100%" height="100%" fill="url(#waves)"/>
        
        {/* Ships positioned across the screen */}
        
        {/* Ship 1 - Left side */}
        <g transform="translate(200,300)">
          <g className="ship-container">
            {/* Ship hull */}
            <path d="M0,30 L80,30 L85,35 L85,40 L-5,40 L-5,35 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1"/>
            <rect x="0" y="20" width="80" height="10" fill="#1e40af" stroke="#1d4ed8" strokeWidth="1"/>
            
            {/* Ship superstructure */}
            <rect x="20" y="10" width="40" height="10" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1"/>
            <rect x="30" y="5" width="20" height="5" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1"/>
            
            {/* Mast */}
            <line x1="40" y1="5" x2="40" y2="-10" stroke="#374151" strokeWidth="2"/>
            
            {/* Communication antenna */}
            <circle cx="40" cy="-5" r="2" fill="#ea580c">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
            </circle>
            
            {/* Ship label */}
            <text x="40" y="55" textAnchor="middle" fontSize="10" fill="#374151" opacity="0.7">MV QAAQ Explorer</text>
          </g>
        </g>
        
        {/* Ship 2 - Center */}
        <g transform="translate(800,450)">
          <g className="ship-container">
            {/* Ship hull */}
            <path d="M0,25 L70,25 L75,30 L75,35 L-5,35 L-5,30 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="1"/>
            <rect x="0" y="15" width="70" height="10" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
            
            {/* Ship superstructure */}
            <rect x="15" y="8" width="40" height="7" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1"/>
            <rect x="25" y="3" width="20" height="5" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1"/>
            
            {/* Mast */}
            <line x1="35" y1="3" x2="35" y2="-8" stroke="#374151" strokeWidth="2"/>
            
            {/* Communication antenna */}
            <circle cx="35" cy="-3" r="2" fill="#ea580c">
              <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            
            {/* Ship label */}
            <text x="35" y="50" textAnchor="middle" fontSize="10" fill="#374151" opacity="0.7">MV Maritime Pioneer</text>
          </g>
        </g>
        
        {/* Ship 3 - Right side */}
        <g transform="translate(1400,250)">
          <g className="ship-container">
            {/* Ship hull */}
            <path d="M0,28 L75,28 L80,33 L80,38 L-5,38 L-5,33 Z" fill="#059669" stroke="#047857" strokeWidth="1"/>
            <rect x="0" y="18" width="75" height="10" fill="#10b981" stroke="#059669" strokeWidth="1"/>
            
            {/* Ship superstructure */}
            <rect x="18" y="9" width="39" height="9" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
            <rect x="28" y="4" width="19" height="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1"/>
            
            {/* Mast */}
            <line x1="37" y1="4" x2="37" y2="-9" stroke="#374151" strokeWidth="2"/>
            
            {/* Communication antenna */}
            <circle cx="37" cy="-4" r="2" fill="#ea580c">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            
            {/* Ship label */}
            <text x="37" y="53" textAnchor="middle" fontSize="10" fill="#374151" opacity="0.7">MV Ocean Connect</text>
          </g>
        </g>
        
        {/* Communication Lines between Ships */}
        
        {/* Ship 1 to Ship 2 */}
        <line x1="240" y1="295" x2="835" y2="447" stroke="#ea580c" strokeWidth="2" strokeDasharray="10,5" opacity="0.6">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4s" repeatCount="indefinite"/>
        </line>
        
        {/* Ship 2 to Ship 3 */}
        <line x1="835" y1="447" x2="1437" y2="246" stroke="#ea580c" strokeWidth="2" strokeDasharray="10,5" opacity="0.6">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="3s" repeatCount="indefinite" begin="1s"/>
          <animate attributeName="opacity" values="0.2;0.8;0.2" dur="4s" repeatCount="indefinite" begin="1s"/>
        </line>
        
        {/* Ship 1 to Ship 3 (long distance) */}
        <line x1="240" y1="295" x2="1437" y2="246" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="15,10" opacity="0.4">
          <animate attributeName="stroke-dashoffset" values="0;-25" dur="5s" repeatCount="indefinite" begin="2s"/>
          <animate attributeName="opacity" values="0.1;0.6;0.1" dur="6s" repeatCount="indefinite" begin="2s"/>
        </line>
        
        {/* Animated Message Pulses */}
        <circle cx="240" cy="295" r="4" fill="#ea580c" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="r" values="4;12;4" dur="3s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="835" cy="447" r="4" fill="#ea580c" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" begin="1s"/>
          <animate attributeName="r" values="4;12;4" dur="3s" repeatCount="indefinite" begin="1s"/>
        </circle>
        
        <circle cx="1437" cy="246" r="4" fill="#ea580c" opacity="0">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" begin="2s"/>
          <animate attributeName="r" values="4;12;4" dur="3s" repeatCount="indefinite" begin="2s"/>
        </circle>
        
        {/* Sailors on shore communicating */}
        
        {/* Shore Communication Station 1 */}
        <g transform="translate(100,600)">
          <rect x="0" y="0" width="40" height="30" fill="#6b7280" stroke="#4b5563" strokeWidth="1"/>
          <rect x="5" y="5" width="30" height="20" fill="#1f2937" stroke="#374151" strokeWidth="1"/>
          <line x1="20" y1="0" x2="20" y2="-20" stroke="#374151" strokeWidth="2"/>
          <circle cx="20" cy="-15" r="3" fill="#ea580c">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          <text x="20" y="45" textAnchor="middle" fontSize="9" fill="#374151" opacity="0.7">Port Control A</text>
        </g>
        
        {/* Shore Communication Station 2 */}
        <g transform="translate(1600,650)">
          <rect x="0" y="0" width="40" height="30" fill="#6b7280" stroke="#4b5563" strokeWidth="1"/>
          <rect x="5" y="5" width="30" height="20" fill="#1f2937" stroke="#374151" strokeWidth="1"/>
          <line x1="20" y1="0" x2="20" y2="-20" stroke="#374151" strokeWidth="2"/>
          <circle cx="20" cy="-15" r="3" fill="#ea580c">
            <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <text x="20" y="45" textAnchor="middle" fontSize="9" fill="#374151" opacity="0.7">Port Control B</text>
        </g>
        
        {/* Shore to Ship Communications */}
        <line x1="120" y1="585" x2="240" y2="335" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.5">
          <animate attributeName="stroke-dashoffset" values="0;-12" dur="2.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" repeatCount="indefinite"/>
        </line>
        
        <line x1="1620" y1="635" x2="1437" y2="286" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="8,4" opacity="0.5">
          <animate attributeName="stroke-dashoffset" values="0;-12" dur="2.5s" repeatCount="indefinite" begin="1.5s"/>
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.5s" repeatCount="indefinite" begin="1.5s"/>
        </line>
        
        {/* Message indicators floating around */}
        <g opacity="0.6">
          <circle cx="400" cy="200" r="2" fill="#ea580c">
            <animateTransform attributeName="transform" type="translate" values="0,0; 50,30; 0,0" dur="8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite"/>
          </circle>
          
          <circle cx="1200" cy="400" r="2" fill="#dc2626">
            <animateTransform attributeName="transform" type="translate" values="0,0; -40,20; 0,0" dur="6s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite"/>
          </circle>
          
          <circle cx="600" cy="150" r="2" fill="#f59e0b">
            <animateTransform attributeName="transform" type="translate" values="0,0; 30,-20; 0,0" dur="7s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="5s" repeatCount="indefinite"/>
          </circle>
        </g>
        
        {/* Welcome text overlay */}
        <g transform="translate(960,900)" opacity="0.8">
          <text x="0" y="0" textAnchor="middle" fontSize="24" fill="#1e40af" fontWeight="bold">
            Maritime Communication Network
          </text>
          <text x="0" y="25" textAnchor="middle" fontSize="16" fill="#374151">
            Connecting ships and sailors worldwide • QaaqConnect Platform
          </text>
          <text x="0" y="45" textAnchor="middle" fontSize="14" fill="#6b7280">
            Real-time ship-to-ship and shore-to-ship messaging
          </text>
        </g>
        
        {/* Subtle grid overlay for tech feel */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.1"/>
        
      </svg>
    </div>
  );
}