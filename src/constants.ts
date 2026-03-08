export interface Link {
  id: number;
  title: string;
  url: string;
  image_url: string | null;
  order_index: number;
}

export interface SettingsData {
  title: string;
  bio: string;
  profile_image: string;
  instagram_url: string;
  linkedin_url: string;
}

export const DEFAULT_SETTINGS: SettingsData = {
  title: 'le club immobilier français',
  bio: 'Découvrez le futur de l\'immobilier.',
  profile_image: 'https://res.cloudinary.com/dji8akleo/image/upload/v1772999427/3_quhn7t.png',
  instagram_url: 'https://www.instagram.com/leclubimmobilierfrancais/',
  linkedin_url: 'https://www.linkedin.com/company/leclubimmobilierfran%C3%A7ais'
};

export const DEFAULT_LINKS: Link[] = [
  { 
    id: 1, 
    title: "Lundi 9 mars 18h30", 
    url: "https://events.teams.microsoft.com/event/b16b3ad0-6be4-4fab-98f2-d2fcf40fcd25@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", 
    image_url: null, 
    order_index: 0 
  },
  { 
    id: 2, 
    title: "Mardi 10 Mars 13h", 
    url: "https://events.teams.microsoft.com/event/52798295-e55b-47d5-8d1e-f8e1bae24130@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", 
    image_url: null, 
    order_index: 1 
  },
  { 
    id: 3, 
    title: "Mercredi 11 Mars 17h30", 
    url: "https://events.teams.microsoft.com/event/d65e6c33-9542-4b7b-b0c0-384bd1405496@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", 
    image_url: null, 
    order_index: 2 
  },
  { 
    id: 4, 
    title: "Jeudi 12 Mars 19h", 
    url: "https://events.teams.microsoft.com/event/dfe315b9-2b20-4fb1-89fa-c8b0e806d538@0f7a9099-2bcb-4ce0-b36f-a8b025d7c5f7", 
    image_url: null, 
    order_index: 3 
  },
  { 
    id: 5, 
    title: "Réussir dans l'immobilier avec le club🏠", 
    url: "https://youtube.com/shorts/-YCBifslVsA?feature=share", 
    image_url: "https://res.cloudinary.com/dji8akleo/image/upload/v1773000626/14_by2bos.jpg", 
    order_index: 4 
  }
];
