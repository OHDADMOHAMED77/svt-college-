import { Badge } from '../types/svt';

export const SVT_BADGES: Badge[] = [
  {
    id: 'badge_first_quiz',
    title: 'Premier Pas Scientifique',
    titleAr: 'الخطوة العلمية الأولى',
    description: 'Avoir complété son tout premier quiz SVT avec succès.',
    descriptionAr: 'إكمال أول اختبار في علوم الحياة والأرض بنجاح.',
    iconName: 'Award',
    xpValue: 50
  },
  {
    id: 'badge_perfect_score',
    title: 'Excellence 20/20',
    titleAr: 'العلامة الكاملة 20/20',
    description: 'Obtenir la note maximale de 20/20 lors d un examen ou quiz.',
    descriptionAr: 'الحصول على النقطة الكاملة 20/20 في اختبار أو فرض تجريبي.',
    iconName: 'Sparkles',
    xpValue: 150
  },
  {
    id: 'badge_explorer_lab',
    title: 'Apprenti Chercheur',
    titleAr: 'باحث متمرن',
    description: 'Réaliser avec succès 3 expériences dans le Laboratoire Virtuel.',
    descriptionAr: 'إنجاز 3 تجارب علمية بنجاح في المختبر الافتراضي.',
    iconName: 'FlaskConical',
    xpValue: 100
  },
  {
    id: 'badge_master_lab',
    title: 'Génie du Laboratoire',
    titleAr: 'عبقري المختبر العلمي',
    description: 'Compléter l ensemble des 7 expériences du Laboratoire Virtuel.',
    descriptionAr: 'إتمام جميع التجارب السبع في المختبر الافتراضي.',
    iconName: 'Microscope',
    xpValue: 250
  },
  {
    id: 'badge_scholar_5',
    title: 'Naturaliste Assidu',
    titleAr: 'عالم طبيعيات مجتهد',
    description: 'Valider et réviser 5 cours complets du programme officiel marocain.',
    descriptionAr: 'إنهاء ومراجعة 5 دروس كاملة من المقرر الرسمي المغربي.',
    iconName: 'BookOpen',
    xpValue: 120
  },
  {
    id: 'badge_svt_major',
    title: 'Major de Promotion SVT',
    titleAr: 'الأول على الدفعة في علوم الحياة والأرض',
    description: 'Obtenir plus de 3 notes parfaites et valider 10 leçons.',
    descriptionAr: 'تحقيق أكثر من 3 علامات كاملة وإنهاء 10 دروس.',
    iconName: 'Trophy',
    xpValue: 300
  }
];
