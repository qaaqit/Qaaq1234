export default function Discover() {
  const staticWorldMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=2&size=800x600&maptype=roadmap&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&scale=2`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full h-screen max-w-4xl mx-auto">
        <img
          src={staticWorldMapUrl}
          alt="World Map"
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error('Failed to load world map');
            const img = e.target as HTMLImageElement;
            img.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
                 <rect width="100%" height="100%" fill="#f0f0f0"/>
                 <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="20" fill="#666">
                   World Map
                 </text>
               </svg>`
            )}`;
          }}
        />
      </div>
    </div>
  );
}