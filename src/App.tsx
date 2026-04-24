import * as React from 'react';
import { motion } from 'motion/react';
import { 
  Linkedin, 
  Instagram,
  DoorOpen,
  ExternalLink
} from 'lucide-react';

const HARDCODED_LINKS = [
  {
    id: 1,
    title: "Lundi 27 avril à 12h30",
    url: "https://live.zoho.com/enxm-air-fkp",
  },
  {
    id: 2,
    title: "Mardi 28 Avril à 18h30",
    url: "https://live.zoho.com/lvqs-ebw-ghy",
  },
  {
    id: 3,
    title: "Mercredi 29 Avril à 13h00",
    url: "https://live.zoho.com/yivy-oqb-kxd",
  },
  {
    id: 4,
    title: "Jeudi 30 Avril à 19h00",
    url: "https://live.zoho.com/tveu-mia-rhw",
  }
];

const SETTINGS = {
  title: "le club immobilier français",
  bio: "Découvrez le futur de l'immobilier.",
  profile_image: "https://leclubimmobilier.fr/wp-content/uploads/2023/11/logo-le-club-immobilier-fr-2.png",
  linkedin_url: "https://www.linkedin.com/company/le-club-immobilier-fr/",
  instagram_url: "https://www.instagram.com/leclubimmobilier/"
};

function App() {
  return (
    <div className="min-h-screen bg-[#e8eff9] text-[#1a3a6c] font-sans selection:bg-[#1a3a6c] selection:text-white">
      <main className="max-w-xl mx-auto px-6 py-12 flex flex-col items-center">
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 w-full flex flex-col items-center"
        >
          <div className="relative mb-6">
            <div className="w-48 h-24 flex items-center justify-center overflow-hidden">
              <img 
                src={SETTINGS.profile_image} 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          
          <h1 className="text-[22px] font-bold mb-1 tracking-tight text-[#1a3a6c] uppercase">
            {SETTINGS.title}
          </h1>
          <p className="text-[#1a3a6c] text-[15px] opacity-90 mb-6">
            {SETTINGS.bio}
          </p>

          {/* Social Icons */}
          <div className="flex gap-6 mb-10">
            <a href={SETTINGS.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#1a3a6c] hover:scale-110 transition-transform">
              <Linkedin className="w-8 h-8" />
            </a>
            <a href={SETTINGS.instagram_url} target="_blank" rel="noopener noreferrer" className="text-[#1a3a6c] hover:scale-110 transition-transform">
              <Instagram className="w-8 h-8" />
            </a>
          </div>

          <h2 className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#1a3a6c] mb-6">
            NOS PROCHAINS WEBINAIRES
          </h2>
        </motion.div>

        {/* Links Section */}
        <div className="w-full space-y-3 mb-16">
          {HARDCODED_LINKS.map((link, index) => (
            <motion.a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group relative flex items-center justify-between px-4 py-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-transparent hover:border-[#1a3a6c]/10"
            >
              <div className="flex items-center gap-4 w-full">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[#e8eff9] rounded-md group-hover:bg-[#1a3a6c] transition-colors">
                  <DoorOpen className="w-5 h-5 text-[#1a3a6c] group-hover:text-white transition-colors" />
                </div>
                <span className="font-semibold text-[15px] text-center flex-1 pr-10">{link.title}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#1a3a6c] transition-colors shrink-0" />
            </motion.a>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">
            © {new Date().getFullYear()} Le Club Immobilier Français
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
