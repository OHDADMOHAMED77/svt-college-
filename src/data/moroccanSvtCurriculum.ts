import { Lesson, Quiz } from '../types/svt';

export const MOROCCAN_SVT_LESSONS: Lesson[] = [
  // ==================== 1AC ====================
  {
    id: 'lesson_1ac_milieu_naturel',
    gradeLevel: '1AC',
    semester: 1,
    themeId: 'theme_1ac_unite_vivant',
    themeTitle: 'Unité 1 : Les relations entre les êtres vivants et leurs interactions avec les milieux',
    themeTitleAr: 'الوحدة 1: العلاقات بين الكائنات الحية وتفاعلها مع أوساط عيشها',
    chapterTitle: 'Chapitre 1 : Découverte d\'un milieu naturel et notion de cellule',
    chapterTitleAr: 'الفصل 1: استكشاف وسط طبيعي ومفهوم الخلية',
    title: 'Découverte d\'un milieu naturel & La cellule unité structurale',
    titleAr: 'استكشاف وسط طبيعي والخلية الوحدة التركيبية للكائنات الحية',
    summary: 'Étude de la diversité des milieux naturels (forêt, oued, mare, littoral) et découverte de l\'organisation cellulaire commune à tous les êtres vivants.',
    summaryAr: 'دراسة تنوع الأوساط الطبيعية (غابة، واد، بركة، ساحل) واكتشاف التنظيم الخلوي المشترك بين جميع الكائنات الحية.',
    objectives: [
      'Distinguer les composantes vivantes (faune et flore) et non vivantes (roches, eau, air).',
      'Utiliser le microscope optique pour observer des cellules végétales et animales.',
      'Identifier les trois constituants universels d\'une cellule : membrane plasmique, cytoplasme, noyau.',
      'Comparer la cellule végétale (avec paroi pectocellulosique et chloroplaste) et animale.'
    ],
    objectivesAr: [
      'التمييز بين المكونات الإحيائية (حيوانات ونباتات) واللاإحيائية (صخور، ماء، هواء).',
      'استعمال المجهر الضوئي لملاحظة خلايا نباتية وخلايا حيوانية.',
      'التعرف على المكونات الثلاثة الأساسية للخلية: غشاء سيتوبلازمي، سيتوبلازم، نواة.',
      'المقارنة بين الخلية النباتية (جدار هيكلي وبلاستيدات خضراء) والخلية الحيوانية.'
    ],
    contentSections: [
      {
        heading: '1. Les composantes d\'un milieu naturel au Maroc',
        headingAr: '1. مكونات وسط طبيعي في المغرب',
        bodyMarkdown: 'Un milieu naturel (comme la forêt de la Maâmora, les dunes de Merzouga, ou la lagune de Moulay Bousselham) se compose de :\n- **Composantes vivantes (biocénose)** : animaux (oiseaux, insectes, mammifères) et végétaux (chêne-liège, herbes, lichens).\n- **Composantes minérales (biotope)** : roches, sol, eau et air, soumis à des facteurs climatiques (température, humidité, luminosité).',
        bodyMarkdownAr: 'يتكون الوسط الطبيعي (مثل غابة المعمورة، أو كثبان مرزوكة، أو مرجة مولاي بوسلهام) من:\n- **مكونات إحيائية**: حيوانات (طيور، حشرات، ثدييات) ونباتات (بلوط فليني، أعشاب، أشنيات).\n- **مكونات لاإحيائية (معدنية)**: صخور، تربة، ماء وهواء، خاضعة لعوامل مناخية (حرارة، رطوبة، إضاءة).',
        keyTakeaway: 'Le milieu naturel est un ensemble écologique associant biotope et biocénose en constante interaction.',
        keyTakeawayAr: 'الوسط الطبيعي هو نظام بيئي يجمع بين المحيا والعشيرة الإحيائية في تفاعل مستمر.'
      },
      {
        heading: '2. La cellule : unité de base de tous les êtres vivants',
        headingAr: '2. الخلية: الوحدة الأساسية لجميع الكائنات الحية',
        bodyMarkdown: 'L\'observation microscopique d\'un fragment d\'épiderme d\'oignon (végétal) et de cellules de l\'épithélium buccal (animal) montre que tous les êtres vivants sont formés de cellules.\n\nUne cellule type comprend :\n1. **Membrane plasmique** : enveloppe limitant la cellule.\n2. **Cytoplasme** : liquide visqueux contenant les organites.\n3. **Noyau** : centre de contrôle de l\'activité cellulaire et support de l\'information génétique.\n\n*Spécificité végétale* : Présence d\'une paroi squelettique rigide (cellulosique), de grandes vacuoles et de chloroplastes pour la photosynthèse.',
        bodyMarkdownAr: 'تُظهر الملاحظة المجهرية لبشرة البصل (خلية نباتية) ومخاطية الفم (خلية حيوانية) أن جميع الكائنات الحية تتكون من خلايا.\n\nتتكون الخلية النموذجية من:\n1. **غشاء سيتوبلازمي**: يحيط بالخلية وينظم التبادلات.\n2. **سيتوبلازم**: سائل هلامي يضم العضيات الخلوية.\n3. **نواة**: مركز التحكم في أنشطة الخلية والحامل للخبر الوراثي.\n\n*خاصية الخلية النباتية*: وجود جدار هيكلي سليلوزي، وفجوة عصارية نامية، وبلاستيدات خضراء تقوم بالتركيب الضوئي.',
        keyTakeaway: 'Tous les êtres vivants sont soit unicellulaires (ex : Paramécie) soit pluricellulaires (ex : Homme, Arbre).',
        keyTakeawayAr: 'الكائنات الحية إما وحيدة الخلية (مثل البراميسيوم) أو عديدة الخلايا (مثل الإنسان، النباتات).'
      }
    ],
    definitions: [
      {
        term: 'Cellule',
        termAr: 'الخلية',
        definition: 'Unité structurale et fonctionnelle de tous les êtres vivants, délimitée par une membrane plasmique.',
        definitionAr: 'الوحدة التركيبية والوظيفية لجميع الكائنات الحية، محاطة بغشاء سيتوبلازمي وتحتوي على نواة وسيتوبلازم.'
      },
      {
        term: 'Milieu naturel',
        termAr: 'وسط طبيعي',
        definition: 'Espace géographique naturel abritant un ensemble d\'êtres vivants en relation avec leur biotope.',
        definitionAr: 'فضاء جغرافي يضم مجموعة من الكائنات الحية المتفاعلة فيما بينها ومع محيطها الفيزيائي.'
      }
    ],
    diagrams: [
      {
        id: 'diag_cell_1ac',
        title: 'Structure comparée de la cellule animale et végétale',
        titleAr: 'مقارنة بنية الخلية الحيوانية والنباتية',
        caption: 'Schéma d\'interprétation des organites cellulaires au microscope optique.',
        captionAr: 'رسم تخطيطي تفسيري للعضيات الخلوية بالمجهر الضوئي.',
        type: 'cell',
        labels: [
          { x: 30, y: 25, text: 'Noyau', textAr: 'نواة' },
          { x: 50, y: 40, text: 'Cytoplasme', textAr: 'سيتوبلازم' },
          { x: 70, y: 65, text: 'Membrane plasmique', textAr: 'غشاء سيتوبلازمي' },
          { x: 80, y: 80, text: 'Paroi cellulosique (végétale)', textAr: 'جدار هيكلي سليلوزي' }
        ]
      }
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 25,
    linkedQuizId: 'quiz_1ac_cellule',
    linkedExperimentId: 'exp_photosynthesis'
  },
  {
    id: 'lesson_1ac_respiration',
    gradeLevel: '1AC',
    semester: 1,
    themeId: 'theme_1ac_unite_vivant',
    themeTitle: 'Unité 1 : Les relations entre les êtres vivants et leurs interactions avec les milieux',
    themeTitleAr: 'الوحدة 1: العلاقات بين الكائنات الحية وتفاعلها مع أوساط عيشها',
    chapterTitle: 'Chapitre 2 : La respiration dans différents milieux de vie',
    chapterTitleAr: 'الفصل 2: التنفس في أوساط عيش مختلفة',
    title: 'La respiration chez les êtres vivants (aérien et aquatique)',
    titleAr: 'التنفس عند الكائنات الحية في الوسطين الهوائي والمائي',
    summary: 'Mécanismes des échanges gazeux respiratoires chez les animaux et les végétaux en milieu aérien (poumons, trachées) et aquatique (branchies).',
    summaryAr: 'آليات التبادلات الغازية التنفسية عند الحيوانات والنباتات في الوسط الهوائي (رئتان، قصبات) والوسط المائي (غلاصم).',
    objectives: [
      'Mettre en évidence l\'absorption de dioxygène (O2) et le rejet de dioxyde de carbone (CO2).',
      'Comparer les organes respiratoires : poumons chez l\'Homme, trachées chez le criquet, branchies chez le poisson.',
      'Expliquer la respiration des végétaux terrestres et aquatiques.'
    ],
    objectivesAr: [
      'إبراز امتصاص ثنائي الأكسجين وطرح ثنائي أكسيد الكربون بواسطة ماء الجير ومسبار O2.',
      'مقارنة الأعضاء التنفسية: الرئتان عند الإنسان، القصبات عند الجندب، والغلاصم عند الأسماك.',
      'تفسير تنفس النباتات في الأوساط الأرضية والمائية.'
    ],
    contentSections: [
      {
        heading: '1. Échanges gazeux respiratoires universels',
        headingAr: '1. التبادلات الغازية التنفسية الشاملة',
        bodyMarkdown: 'Tous les êtres vivants respirent :\n- Ils absorbent le **dioxygène (O2)** dans leur milieu.\n- Ils rejettent le **dioxyde de carbone (CO2)** qui trouble l\'eau de chaux limpide.',
        bodyMarkdownAr: 'تتنفس جميع الكائنات الحية:\n- تمتص **ثنائي الأكسجين (O2)** من وسط عيشها.\n- تطرح **ثنائي أكسيد الكربون (CO2)** الذي يعكر ماء الجير الصافي.',
        keyTakeaway: 'L\'eau de chaux est le réactif spécifique du dioxyde de carbone.',
        keyTakeawayAr: 'ماء الجير هو الكاشف النوعي لثنائي أكسيد الكربون حيث يتعكر في وجوده.'
      },
      {
        heading: '2. Diversité des organes respiratoires',
        headingAr: '2. تنوع الأعضاء التنفسية حسب وسط العيش',
        bodyMarkdown: '- **Respiration pulmonaire** : Chez les mammifères, oiseaux et reptiles. Les alvéoles pulmonaires assurent une surface d\'échange richement vascularisée.\n- **Respiration branchiale** : Chez le poisson. Les branchies absorbent l\'O2 dissous dans l\'eau.\n- **Respiration trachéenne** : Chez les insectes. L\'air circule directement aux cellules via un réseau de tubes (trachées et trachéoles) sans intervention du sang.',
        bodyMarkdownAr: '- **تنفس رئوي**: عند الثدييات والطيور والزواحف؛ الأسناخ الرئوية توفر مساحة تبادل واسعة وغنية بالشعيرات الدموية.\n- **تنفس غلصمي**: عند الأسماك؛ الغلاصم تمتص ثنائي الأكسجين المذاب في الماء.\n- **تنفس قصبي**: عند الحشرات؛ يدخل الهواء مباشرة إلى الخلايا عبر شبكة قصبات وقصيبات هوائية دون وساطة الدم.',
        keyTakeaway: 'La structure de l\'organe respiratoire est toujours adaptée aux contraintes du milieu de vie.',
        keyTakeawayAr: 'بنية العضو التنفسي تتكيف دائماً مع خصائص وإكراهات وسط العيش.'
      }
    ],
    definitions: [
      {
        term: 'Branchies',
        termAr: 'الغلاصم',
        definition: 'Organes respiratoires des animaux aquatiques composés de fins filaments très vascularisés.',
        definitionAr: 'أعضاء تنفسية للحيوانات المائية تتكون من خيوط غلصمية دقيقة وغنية بالشعيرات الدموية.'
      },
      {
        term: 'Trachées',
        termAr: 'القصبات الهوائية',
        definition: 'Tubes respiratoires chez les insectes conduisant l\'air directement des stigmates aux organes.',
        definitionAr: 'أنابيب تنفسية عند الحشرات تنقل الهواء مباشرة من الفتحات التنفسية إلى خلايا الأعضاء.'
      }
    ],
    diagrams: [
      {
        id: 'diag_resp_1ac',
        title: 'Appareil respiratoire branchial du poisson',
        titleAr: 'الجهاز التنفسي الغلصمي عند السمكة',
        caption: 'Circulation de l\'eau et échanges gazeux au niveau des lamelles branchiales.',
        captionAr: 'مسار تيار الماء والتبادلات الغازية على مستوى الخيوط الغلصمية.',
        type: 'respiration',
        labels: [
          { x: 25, y: 35, text: 'Bouche (Entrée d\'eau)', textAr: 'الفم (دخول الماء)' },
          { x: 60, y: 50, text: 'Branchies (Filaments)', textAr: 'الغلاصم (الخيوط الغلصمية)' },
          { x: 80, y: 70, text: 'Ouïe / Opercule (Sortie)', textAr: 'غطاء الغلاصم (خروج الماء)' }
        ]
      }
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 20,
    linkedQuizId: 'quiz_1ac_respiration',
    linkedExperimentId: 'exp_respiration'
  },

  // ==================== 2AC ====================
  {
    id: 'lesson_2ac_tectonique',
    gradeLevel: '2AC',
    semester: 1,
    themeId: 'theme_2ac_geologie_interne',
    themeTitle: 'Unité 1 : Les phénomènes géologiques internes',
    themeTitleAr: 'الوحدة 1: الظواهر الجيولوجية الباطنية',
    chapterTitle: 'Chapitre 1 : La théorie de la dérive des continents et la tectonique des plaques',
    chapterTitleAr: 'الفصل 1: نظرية زحزحة القارات وتكتونية الصفائح',
    title: 'La dérive des continents & La tectonique des plaques',
    titleAr: 'نظرية زحزحة القارات وتكتونية الصفائح الصخرية',
    summary: 'Fondements de la théorie d\'Alfred Wegener, arguments morphologiques, paléontologiques et pétrographiques, et découverte de l\'expansion des fonds océaniques.',
    summaryAr: 'أسس نظرية ألفريد فيجنر، الأدلة المورفولوجية والمستحاثية والصخرية، واكتشاف اتساع قاع المحيطات وحركية الصفائح.',
    objectives: [
      'Analyser les arguments de Wegener en faveur de la dérive des continents.',
      'Définir une plaque lithosphérique et identifier ses limites (dorsales, fosses océaniques, chaînes de montagnes).',
      'Expliquer l\'expansion des fonds océaniques à partir du paléomagnétisme.',
      'Comprendre le moteur de la tectonique des plaques (courants de convection mantellique).'
    ],
    objectivesAr: [
      'تحليل حجج فيجنر المدعمة لزحزحة القارات (مورفولوجية، مستحاثية، صخرية).',
      'تعريف الصفيحة الصخرية وتحديد حدودها (دروات، خنادق محيطية، سلاسل جبلية).',
      'تفسير اتساع قاع المحيطات انطلاقاً من الشذوذات المغناطيسية للصخور البازلتية.',
      'فهم المحرك الأساسي لحركية الصفائح (تيارات الحمل الحراري في الرداء).'
    ],
    contentSections: [
      {
        heading: '1. Les arguments d\'Alfred Wegener (1912)',
        headingAr: '1. حجج ألفريد فيجنر (1912)',
        bodyMarkdown: 'En 1912, le météorologue allemand Alfred Wegener propose l\'hypothèse que tous les continents étaient réunis en un supercontinent primitif : **La Pangée**, entourée de l\'océan Panthalassa.\n\nIl s\'appuie sur trois arguments majeurs :\n1. **Argument morphologique** : Complémentarité géométrique des côtes de l\'Afrique de l\'Ouest et de l\'Amérique du Sud.\n2. **Argument paléontologique** : Présence des mêmes fossiles (ex : *Mesosaurus*, *Glossopteris*) de part et d\'autre de l\'océan Atlantique.\n3. **Argument pétrographique** : Continuité de boucliers rocheux anciens (plus de 2 milliards d\'années) entre l\'Afrique et l\'Amérique du Sud.',
        bodyMarkdownAr: 'في عام 1912، اقترح العالم ألفريد فيجنر أن القارات كانت مجمعة في كتلة قارية واحدة تدعى **بانجيا (Pangée)** محاطة بمحيط شاسع.\n\nاعتمد فيجنر على ثلاث حجج رئيسية:\n1. **حجة مورفولوجية (هندسية)**: تطابق الحواف الساحلية لغرب إفريقيا وشرق أمريكا الجنوبية.\n2. **حجة مستحاثية**: العثور على نفس المستحاثات (مثل ميزوزوروس وسرخس غلوسوبتريس) في قارتين متباعدتين.\n3. **حجة صخرية**: استمرارية السلاسل الصخرية القديمة التي يفوق عمرها ملياري سنة عبر المحيط الأطلسي.',
        keyTakeaway: 'Bien qu\'incomplète sur le plan du mécanisme, la théorie de Wegener est le socle de la tectonique moderne.',
        keyTakeawayAr: 'رغم غياب تفسير آلية الحركة حينها، شكلت نظرية فيجنر حجر الأساس لتكتونية الصفائح الحديثة.'
      },
      {
        heading: '2. La lithosphère et les courants de convection',
        headingAr: '2. الغلاف الصخري وتيارات الحمل الحراري',
        bodyMarkdown: 'La surface de la Terre est découpée en **plaques lithosphériques** rigides (environ 12 plaques principales comme la plaque Africaine, Eurasienne, Pacifique) qui flottent sur l\'asthénosphère ductile.\n\nLe moteur du déplacement réside dans la chaleur interne de la Terre qui engendre des **courants de convection** dans le manteau :\n- **Zones de divergence (Dorsales médio-océaniques)** : remontée de magma basaltique et création de plancher océanique.\n- **Zones de convergence (Subduction et Collision)** : enfoncement d\'une plaque océanique dense ou affrontement continental.',
        bodyMarkdownAr: 'ينقسم سطح الأرض إلى **صفائح صخرية** صلبة (حوالي 12 صفيحة رئيسية مثل الصفيحة الإفريقية والأوراسية والهادئة) تطفو فوق الأستينوسفير اللزج.\n\nالمحرك الرئيسي للحركة هو الحرارة الباطنية للأرض المولدة لـ **تيارات الحمل الحراري** في الرداء:\n- **مناطق التباعد (الدروات المحيطية)**: صعود الصهارة وتشكل قشرة محيطية جديدة (اتساع المحيط).\n- **مناطق التقارب (الطمر والاصطدام)**: انغراز صفيحة محيطية كثيفة أو اصطدام قارتين وتشكل الجبال.',
        keyTakeaway: 'Le Maroc se trouve sur la bordure nord de la plaque Africaine, en convergence avec la plaque Eurasienne.',
        keyTakeawayAr: 'يقع المغرب في الطرف الشمالي للصفيحة الإفريقية في تقارب دائم مع الصفيحة الأوراسية.'
      }
    ],
    definitions: [
      {
        term: 'Plaque lithosphérique',
        termAr: 'صفيحة صخرية',
        definition: 'Morceau rigide de la lithosphère terrestre délimité par des zones à forte activité sismique et volcanique.',
        definitionAr: 'جزء صلب وهادئ نسبياً من الغلاف الصخري، تحده مناطق ذات نشاط زلزالي وبركاني كثيف.'
      },
      {
        term: 'Dorsale océanique',
        termAr: 'دروة وسط محيطية',
        definition: 'Chaîne de montagnes sous-marine où se crée la nouvelle lithosphère océanique par accrétion magmatique.',
        definitionAr: 'سلسلة جبلية تحت بحرية تتميز بنشاط بركاني انسكابي يتم على مستواها تجديد قعر المحيطات.'
      }
    ],
    diagrams: [
      {
        id: 'diag_tecto_2ac',
        title: 'Modèle de divergence et convergence des plaques',
        titleAr: 'نموذج تباعد وتقارب الصفائح الصخرية',
        caption: 'Coupe lithosphérique illustrant la dorsale océanique et la zone de subduction.',
        captionAr: 'مقطع تخطيطي يوضح الدروة المحيطية ومنطقة الطمر مع تيارات الحمل الحراري.',
        type: 'plate_tectonics',
        labels: [
          { x: 20, y: 40, text: 'Dorsale (Divergence)', textAr: 'دروة محيطية (تباعد)' },
          { x: 50, y: 75, text: 'Courants de convection', textAr: 'تيارات الحمل الحراري' },
          { x: 80, y: 35, text: 'Fosse de subduction', textAr: 'خندق الطمر (تقارب)' }
        ]
      }
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 30,
    linkedQuizId: 'quiz_2ac_tectonique',
    linkedExperimentId: 'exp_volcano'
  },
  {
    id: 'lesson_2ac_seismes',
    gradeLevel: '2AC',
    semester: 1,
    themeId: 'theme_2ac_geologie_interne',
    themeTitle: 'Unité 1 : Les phénomènes géologiques internes',
    themeTitleAr: 'الوحدة 1: الظواهر الجيولوجية الباطنية',
    chapterTitle: 'Chapitre 2 : Les séismes et leur relation avec la tectonique',
    chapterTitleAr: 'الفصل 2: الزلازل وعلاقتها بتكتونية الصفائح',
    title: 'Les séismes : Genèse, enregistrement et propagation des ondes',
    titleAr: 'الزلازل: النشأة، التسجيل وانتشار الموجات الزلزالية',
    summary: 'Comprendre l\'origine des tremblements de terre (rupture brutale le long d\'une faille au foyer), les ondes P, S, L et l\'analyse du séisme historique d\'Al Haouz.',
    summaryAr: 'فهم أصل الهزات الأرضية (الانكسار المفاجئ للصخور على طول فالق في البؤرة)، انتشار الموجات P وS وL، مع دراسة زلزال الحوز بالمغرب.',
    objectives: [
      'Différencier foyer (hypocentre) et épicentre.',
      'Décrire le fonctionnement d\'un sismographe et analyser un sismogramme.',
      'Caractériser les types d\'ondes sismiques (ondes P de compression, ondes S de cisaillement, ondes de surface).',
      'Relier la répartition mondiale des séismes aux limites de plaques.'
    ],
    objectivesAr: [
      'التمييز بين بؤرة الزلزال والمركز السطحي.',
      'وصف عمل جهاز مسجل الهزات (السيسموغراف) وتحليل التسجيل الزلزالي.',
      'تحديد خصائص الموجات الزلزالية (الموجات الأولية P، الموجات الثانوية S، والموجات السطحية).',
      'ربط التوزيع العالمي للزلازل بحدود الصفائح الصخرية.'
    ],
    contentSections: [
      {
        heading: '1. Mécanisme de rupture et foyer sismique',
        headingAr: '1. آلية انكسار الصخور والبؤرة الزلزالية',
        bodyMarkdown: 'Les roches de la croûte terrestre sont soumises à d\'immenses forces tectoniques (compression, distension ou coulissage). Lorsqu\'elles dépassent leur seuil d\'élasticité, une rupture brutale survient en profondeur le long d\'une **faille** : c\'est le **foyer (ou hypocentre)**.\n\nL\'énergie libérée se propage dans toutes les directions sous forme d\'**ondes sismiques**. Le point de la surface situé à la verticale du foyer est l\'**épicentre**, où les secousses et les dégâts sont généralement les plus intenses.',
        bodyMarkdownAr: 'تخضع صخور القشرة الأرضية لقوى تكتونية هائلة (انضغاط أو تمدد). وعند تجاوز حد مرونتها، يحدث كسر مفاجئ للصخور على طول **فالق** في العمق: وتسمى هذه النقطة **البؤرة الزلزالية**.\n\nتتحرر الطاقة المتراكمة وتنتشر في جميع الاتجاهات على شكل **موجات زلزالية**. وتسمى النقطة العمودية للبؤرة على سطح الأرض بـ **المركز السطحي**، حيث تسجل أقصى الشدات والخسائر.',
        keyTakeaway: 'La magnitude (échelle de Richter) mesure l\'énergie libérée au foyer, tandis que l\'intensité (échelle EMS/MSK) évalue les dégâts observés.',
        keyTakeawayAr: 'يقيس السلم اللوغاريتمي (ريشتر) الطاقة المحررة في البؤرة، بينما يقيس سلم الشدة (MSK) حجم الخسائر المشاهدة.'
      }
    ],
    definitions: [
      {
        term: 'Épicentre',
        termAr: 'المركز السطحي',
        definition: 'Point à la surface du globe terrestre situé exactement à la verticale du foyer du séisme.',
        definitionAr: 'نقطة على سطح الأرض تقع عمودياً فوق بؤرة الزلزال، وتصلها الموجات الزلزالية أولاً وتسجل أكبر الخسائر.'
      },
      {
        term: 'Ondes P',
        termAr: 'الموجات الأولية P',
        definition: 'Ondes sismiques longitudinales de compression-dilatation, les plus rapides, se propageant dans les solides et liquides.',
        definitionAr: 'موجات زلزالية انضغاطية طولية، هي الأسرع وصولاً لمحطات الرصد وتنتشر في الأوساط الصلبة والسائلة.'
      }
    ],
    diagrams: [],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 25,
    linkedQuizId: 'quiz_2ac_seismes'
  },

  // ==================== 3AC ====================
  {
    id: 'lesson_3ac_digestion',
    gradeLevel: '3AC',
    semester: 1,
    themeId: 'theme_3ac_fonctions_nutrition',
    themeTitle: 'Unité 1 : Les fonctions de nutrition et l\'éducation nutritionnelle',
    themeTitleAr: 'الوحدة 1: وظائف القيت والتربية الغذائية',
    chapterTitle: 'Chapitre 1 : La digestion des aliments et l\'absorption intestinale',
    chapterTitleAr: 'الفصل 1: هضم الأغذية والامتصاص المعوي',
    title: 'La digestion des aliments & L\'absorption intestinale',
    titleAr: 'هضم الأغذية والامتصاص المعوي ومواد القيت',
    summary: 'Transformation mécanique et chimique des macromolécules alimentaires en nutriments simples par les sucs digestifs et les enzymes, puis passage dans le sang au niveau des villosités intestinales.',
    summaryAr: 'التبسيط الميكانيكي والكيميائي للجزيئات الغذائية الضخمة إلى مواد قيت بسيطة بفعل الأنزيمات، ثم مرورها إلى الدم واللمف عبر الخملات المعوية.',
    objectives: [
      'Distinguer la digestion mécanique (mastication, brassage) et chimique (hydrolyse enzymatique).',
      'Identifier les enzymes digestives majeures (amylase salivaire, pepsine/protéase, lipase).',
      'Décrire les caractéristiques de la surface d\'absorption intestinale (villosités et microvillosités).',
      'Connaître les voies sanguine et lymphatique de transport des nutriments.'
    ],
    objectivesAr: [
      'التمييز بين الهضم الميكانيكي (المضغ، التقلصات) والهضم الكيميائي (الحلمأة الأنزيمية).',
      'تحديد الأنزيمات الهضمية الرئيسية (النشاوز، البيبسين/البروتياز، والليباز).',
      'وصف الخصائص البنيوية للجدار المعوي (الخملات والتفرعات الشعرية الدموية).',
      'التعرف على المسلكين الدموي واللمفاوي لامتصاص مواد القيت.'
    ],
    contentSections: [
      {
        heading: '1. La simplification moléculaire des aliments',
        headingAr: '1. التبسيط الجزيئي للأغذية',
        bodyMarkdown: 'Les aliments consommés (pain, viande, huile) contiennent de grosses molécules insolubles qui ne peuvent franchir la barrière digestive. La digestion les transforme en **nutriments (ou matières de quête / مواد القيت)** grâce à des **enzymes digestives** :\n- **Amidon** (glucide complexe) -> Maltose (par l\'amylase salivaire) -> **Glucose** (par la maltase).\n- **Protéines** -> Peptides -> **Acides aminés** (par les protéases et peptidases gastriques et pancréatiques).\n- **Lipides (graisses)** -> Émulsionnés par la bile hépatique -> **Acides gras + Glycérol** (par la lipase).\n- L\'eau, les sels minéraux et les vitamines ne sont pas digérés : ils sont directement absorbables.',
        bodyMarkdownAr: 'تحتوي الأغذية المتناولة (خبز، لحم، زيت) على جزيئات معقدة وكبيرة الحجم لا يمكنها عبور جدار الأمعاء. يحولها الهضم إلى **مواد قيت** بسيطة قابلة للاستعمال بفضل **الأنزيمات النوعية**:\n- **النشا** (سكر مركب) -> مالتوز (بفعل نشاوز اللعاب) -> **غلوكوز** (بفعل أنزيم المالتاز المعوي).\n- **البروتيدات** -> ببتيدات -> **أحماض أمينية** (بفعل أنزيمات البروتياز والبيبتيداز).\n- **الدهنيات** -> استحيلاب بالصفراء -> **أحماض دهنية وغليسيرول** (بفعل أنزيم الليباز البنكرياسي والمعوي).\n- الماء، الأملاح المعدنية والفيتامينات جزيئات دقيقة لا تخضع للهضم بل تُمتص مباشرة.',
        keyTakeaway: 'Une enzyme digestive est un biocatalyseur hautement spécifique opérant à température corporelle (37°C) et pH adapté.',
        keyTakeawayAr: 'الأنزيم الهضمي وسيط حيوي نوعي يسرع تفاعل الحلمأة الكيميائية في درجة حرارة الجسم (37°C).'
      },
      {
        heading: '2. L\'absorption intestinale au niveau des villosités',
        headingAr: '2. الامتصاص المعوي على مستوى الخملات المعوية',
        bodyMarkdown: 'L\'intestin grêle mesure environ 6 à 7 mètres chez l\'Homme. Sa paroi interne présente des replis circulaires hérissés de millions de **villosités intestinales** qui offrent une surface d\'échange gigantesque (~300 m²).\n\nChaque villosité est tapissée d\'un épithélium très mince et parcourue par un réseau dense de capillaires sanguins et un vaisseau chylifère (lymphatique).\n- **Voie sanguine** : Glucose, acides aminés, eau, sels minéraux, vitamines hydrosolubles -> veine porte hépatique -> Foie -> Cœur.\n- **Voie lymphatique** : Acides gras et glycérol -> vaisseaux lymphatiques -> veine sous-clavière gauche -> Cœur.',
        bodyMarkdownAr: 'يصل طول الأمعاء الدقيقة عند الإنسان البالغ إلى حوالي 6-7 أمتار. يتميز جداره الداخلي بطيات وثنيات دائرية مغطاة بملايين **الخملات المعوية** التي تمنح مساحة امتصاص هائلة تقارب 300 متر مربع.\n\nتتميز كل خملة معوية بجدار خلوي رقيق جداً وبشبكة غنية من الشعيرات الدموية وشعيرة لمفاوية مركزية:\n- **المسلك الدموي**: الغلوكوز، الأحماض الأمينية، الماء، الأملاح المعدنية، الفيتامينات الذائبة في الماء نحو الوريد البابي ثم الكبد ثم القلب.\n- **المسلك اللمفاوي**: الأحماض الدهنية والغليسيرول نحو الأوعية اللمفاوية ثم تصب في الدورة الدموية العامة.',
        keyTakeaway: 'L\'absorption intestinale est le passage des nutriments de la lumière intestinale vers le milieu intérieur (sang et lymphe).',
        keyTakeawayAr: 'الامتصاص المعوي هو ظاهرة انتقال مواد القيت من جوف المعي الدقيق نحو الوسط الداخلي (الدم واللمف).'
      }
    ],
    definitions: [
      {
        term: 'Nutriment (Matière de quête)',
        termAr: 'مادة القيت',
        definition: 'Molécule simple soluble issue de la digestion chimique des aliments, directement assimilable par les cellules.',
        definitionAr: 'جزيئة عضوية أو معدنية بسيطة وقابلة للذوبان، ناتجة عن الهضم، قادرة على العبور الخلوي وتغذية خلايا الجسم.'
      },
      {
        term: 'Villosité intestinale',
        termAr: 'خملة معوية',
        definition: 'Repli microscopique de la muqueuse intestinale constituant l\'unité structurale d\'absorption des nutriments.',
        definitionAr: 'نتوء مجهري دقيق لغشاء المعي الدقيق يشكل الوحدة الوظيفية الأساسية للامتصاص المعوي.'
      }
    ],
    diagrams: [
      {
        id: 'diag_villosité_3ac',
        title: 'Structure histologique d\'une villosité intestinale',
        titleAr: 'البنية النسيجية لخملة معوية',
        caption: 'Coupe longitudinale montrant le vaisseau chylifère et le réseau de capillaires sanguins.',
        captionAr: 'مقطع طولي يوضح مسار الامتصاص عبر الشعيرات الدموية والوعاء اللمفاوي المركزي.',
        type: 'digestion',
        labels: [
          { x: 30, y: 20, text: 'Épithélium intestinal monocouche', textAr: 'ظهارة معوية أحادية الطبقة' },
          { x: 50, y: 50, text: 'Vaisseau chylifère (Lymphe)', textAr: 'وعاء بلغمي / لمفاوي مركزي' },
          { x: 75, y: 60, text: 'Réseau de capillaires sanguins', textAr: 'شبكة شعيرات دموية' }
        ]
      }
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 30,
    linkedQuizId: 'quiz_3ac_digestion',
    linkedExperimentId: 'exp_digestion'
  },
  {
    id: 'lesson_3ac_systeme_nerveux',
    gradeLevel: '3AC',
    semester: 2,
    themeId: 'theme_3ac_fonctions_communication',
    themeTitle: 'Unité 2 : Les fonctions de communication et l\'immunité',
    themeTitleAr: 'الوحدة 2: وظائف التواصل والمناعة',
    chapterTitle: 'Chapitre 1 : Le système nerveux et la motricité',
    chapterTitleAr: 'الفصل 1: الجهاز العصبي والتحركية',
    title: 'Le système nerveux : Sensibilité consciente et motricité volontaire / involontaire',
    titleAr: 'الجهاز العصبي: الحساسية الشعورية والتحركية الإرادية واللاإرادية',
    summary: 'Organisation du système nerveux cérébro-spinal, transmission du message nerveux par les neurones, et circuits de la sensibilité consciente, du mouvement volontaire et du réflexe médullaire.',
    summaryAr: 'تنظيم الجهاز العصبي المركزي والمحيطي، انتقال السيالة العصبية عبر العصبونات، ومسارات الحساسية الشعورية، الحركة الإرادية، والانعكاس الشوكي.',
    objectives: [
      'Différencier système nerveux central (encéphale, moelle épinière) et périphérique (nerfs).',
      'Identifier les aires corticales motrices et sensorielles du cerveau.',
      'Tracer le trajet de l\'influx nerveux afférent (sensitif) et efférent (moteur).',
      'Schématiser l\'arc réflexe médullaire inné.'
    ],
    objectivesAr: [
      'التمييز بين الجهاز العصبي المركزي (الدماغ والنخاع الشوكي) والمحيطي (الأعصاب).',
      'تحديد الباحات القشرية الحسية والحركية على مستوى نصفي الكرة المخية.',
      'تتبع مسار السيالة العصبية الحسية النابذة والحركية الجابذة.',
      'رسم وتوضيح عناصر القوس الانعكاسي الشوكي الفطري.'
    ],
    contentSections: [
      {
        heading: '1. Les trois grandes activités nerveuses',
        headingAr: '1. الأنشطة العصبية الثلاث الكبرى',
        bodyMarkdown: '1. **Sensibilité consciente** (Vision, ouïe, toucher...) : L\'organe de sens capte un stimulus -> création d\'un influx sensitif centripète -> transmis par un nerf sensitif -> analysé par l\'aire sensorielle correspondante dans le cortex cérébral.\n2. **Motricité volontaire** : Décidée consciemment dans l\'**aire motrice** cérébrale située en avant du sillon de Rolando -> influx moteur centrifuge -> transmis par les faisceaux pyramidaux et les nerfs moteurs -> contraction du muscle effecteur. (Le cortex gauche commande l\'hémicorps droit).\n3. **Mouvement involontaire (Réflexe médullaire)** : Réponse rapide, stéréotypée et protectrice. Le centre de traitement est la **moelle épinière** sans intervention du cerveau.',
        bodyMarkdownAr: '1. **الحساسية الشعورية** (الرؤية، السمع، اللمس...): يستقبل العضو الحسي الإهاجة -> تتولد سيالة عصبية حسية مركزية جابذة -> تنقلها الألياف الحسية -> تُعالج في الباحة الحسية بالقشرة المخية.\n2. **التحركية الإرادية**: تنطلق من **الباحة الحركية** الواقعة أمام شق رولاندو في المخ -> سيالة عصبية حركية نابذة -> تعبر النخاع الشوكي والأعصاب الحركية -> تؤدي لتقلص العضلة المستجيبة (نصف الكرة المخية الأيسر يتحكم بنصف الجسم الأيمن لوجود تصالب عصبي).\n3. **التحركية اللاإرادية (الانعكاس الشوكي)**: رد فعل حركي فوري، لاإرادي لحماية الجسم؛ والمركز العصبي المعالج هو **النخاع الشوكي** دون تدخل المخ.',
        keyTakeaway: 'Le neurone est la cellule spécialisée dans la genèse et la conduction du potentiel d\'action.',
        keyTakeawayAr: 'العصبون هو الخلية العصبية المتخصصة في توليد وتوصيل السيالة العصبية عبر المشابك.'
      }
    ],
    definitions: [
      {
        term: 'Neurone',
        termAr: 'عصبون',
        definition: 'Cellule nerveuse excitable composée d\'un corps cellulaire, de dendrites et d\'un axone conducteur.',
        definitionAr: 'خلية عصبية قابلة للاستثارة، تتكون من جسم خلوي يحتوي على نواة، وتفرعات سيتوبلازمية ومحورة طويلة تنتهي بتشجر نهائي.'
      },
      {
        term: 'Arc réflexe',
        termAr: 'قوس الانعكاس',
        definition: 'Trajet anatomique emprunté par l\'influx nerveux depuis le récepteur sensoriel jusqu\'au muscle effecteur lors d\'un réflexe.',
        definitionAr: 'المسار التشريحي الذي تسلكه السيالة العصبية من المستقبل الحسي إلى العضلة المستجيبة أثناء الحركة اللاإرادية.'
      }
    ],
    diagrams: [
      {
        id: 'diag_reflex_3ac',
        title: 'Trajet de l\'influx dans l\'arc réflexe médullaire',
        titleAr: 'مسار السيالة العصبية في القوس الانعكاسي الشوكي',
        caption: 'Schéma anatomique de la moelle épinière montrant la racine postérieure sensitive et antérieure motrice.',
        captionAr: 'مقطع عرضي للنخاع الشوكي يوضح الجذر الخلفي الحسي والجذر الأمامي الحركي والعصبون الرابط.',
        type: 'reflex_arc',
        labels: [
          { x: 20, y: 30, text: 'Récepteur cutané (Peau)', textAr: 'مستقبل حسي جلدي' },
          { x: 50, y: 40, text: 'Moelle épinière (Centre réflexe)', textAr: 'نخاع شوكي (مركز عصبي انعكاسي)' },
          { x: 80, y: 70, text: 'Muscle effecteur (Contraction)', textAr: 'عضلة مستجيبة (تقلص)' }
        ]
      }
    ],
    status: 'published',
    isPremium: false,
    estimatedMinutes: 30,
    linkedQuizId: 'quiz_3ac_nerveux',
    linkedExperimentId: 'exp_reflex_arc'
  }
];

export const MOROCCAN_SVT_QUIZZES: Quiz[] = [
  {
    id: 'quiz_1ac_cellule',
    lessonId: 'lesson_1ac_milieu_naturel',
    gradeLevel: '1AC',
    title: 'Quiz 1AC : Découverte du milieu naturel et la cellule',
    titleAr: 'اختبار 1AC: استكشاف الوسط الطبيعي وبنية الخلية',
    description: 'Évaluation formative sur les composantes de l\'écosystème et l\'observation microscopique.',
    descriptionAr: 'تقويم تكويني حول مكونات الوسط الطبيعي والملاحظة المجهرية للخلايا.',
    durationMinutes: 10,
    isExam: false,
    isPremium: false,
    passingScore: 10,
    questions: [
      {
        id: 'q_1ac_1',
        type: 'qcm',
        prompt: 'Quels sont les trois constituants indispensables d\'une cellule animale observée au microscope optique ?',
        promptAr: 'ما هي المكونات الثلاثة الأساسية للخلية الحيوانية الملاحظة بالمجهر الضوئي؟',
        options: [
          'Paroi rigide, chloroplaste, vacuole',
          'Membrane plasmique, cytoplasme, noyau',
          'Cuticule, stomate, sève',
          'Capsule, flagelle, ribosome'
        ],
        optionsAr: [
          'جدار هيكلي، بلاستيدة خضراء، فجوة عصارية',
          'غشاء سيتوبلازمي، سيتوبلازم، نواة',
          'بشرة، ثغر، نسغ',
          'محفظة، سوط، ريبوزوم'
        ],
        correctAnswer: 1,
        explanation: 'Toute cellule animale type possède une membrane plasmique délimitant un cytoplasme contenant un noyau.',
        explanationAr: 'تتكون كل خلية حيوانية نموذجية من غشاء سيتوبلازمي يحيط بسيتوبلازم يضم نواة مركزية.',
        points: 5
      },
      {
        id: 'q_1ac_2',
        type: 'true_false',
        prompt: 'La cellule végétale possède une paroi cellulosique protectrice qui lui confère une forme géométrique stable.',
        promptAr: 'تمتلك الخلية النباتية جداراً هيكلياً سليلوزياً يمنحها شكلاً هندسياً ثابتاً ومحدداً.',
        correctAnswer: true,
        explanation: 'Vrai. La paroi pectocellulosique externe est spécifique aux cellules végétales.',
        explanationAr: 'صحيح. الجدار الهيكلي السليلوزي الصلب خاصية مميزة للخلايا النباتية.',
        points: 5
      },
      {
        id: 'q_1ac_3',
        type: 'qcm',
        prompt: 'Dans un milieu naturel, les roches, l\'eau et l\'air constituent :',
        promptAr: 'في وسط طبيعي، تشكل الصخور والماء والهواء:',
        options: [
          'La biocénose (composante vivante)',
          'Le biotope (composante minérale non vivante)',
          'Une colonie de micro-organismes',
          'Une chaîne trophique'
        ],
        optionsAr: [
          'العشيرة الإحيائية (المكون الحي)',
          'المحيا (المكون المعدني غير الحي)',
          'مستعمرة كائنات دقيقة',
          'سلسلة غذائية'
        ],
        correctAnswer: 1,
        explanation: 'Le biotope rassemble les composantes minérales physiques et chimiques du milieu.',
        explanationAr: 'المحيا يمثل الجزء اللاحيوي أو المعدني في النظام البيئي (صخور، ماء، مناخ).',
        points: 5
      },
      {
        id: 'q_1ac_4',
        type: 'true_false',
        prompt: 'La paramécie est un être vivant pluricellulaire visible uniquement au télescope.',
        promptAr: 'البراميسيوم كائن حي عديد الخلايا يُرى فقط بالتليسكوب.',
        correctAnswer: false,
        explanation: 'Faux ! La paramécie est un être vivant unicellulaire visible au microscope optique.',
        explanationAr: 'خطأ! البراميسيوم كائن حي وحيد الخلية يُلاحظ بالمجهر الضوئي في المياه الراكدة.',
        points: 5
      }
    ]
  },
  {
    id: 'quiz_2ac_tectonique',
    lessonId: 'lesson_2ac_tectonique',
    gradeLevel: '2AC',
    title: 'Quiz 2AC : Tectonique des plaques et dérive des continents',
    titleAr: 'اختبار 2AC: تكتونية الصفائح ونظرية زحزحة القارات',
    description: 'Test sur la théorie de Wegener, les plaques lithosphériques et les courants de convection.',
    descriptionAr: 'اختبار حول نظرية فيجنر، الصفائح الصخرية وتيارات الحمل الحراري.',
    durationMinutes: 12,
    isExam: false,
    isPremium: false,
    passingScore: 10,
    questions: [
      {
        id: 'q_2ac_1',
        type: 'qcm',
        prompt: 'Quel scientifique allemand a proposé la théorie de la dérive des continents en 1912 ?',
        promptAr: 'من هو العالم الألماني الذي اقترح نظرية زحزحة القارات عام 1912؟',
        options: [
          'Charles Darwin',
          'Alfred Wegener',
          'Louis Pasteur',
          'Isaac Newton'
        ],
        optionsAr: [
          'تشارلز داروين',
          'ألفريد فيجنر',
          'لويس باستور',
          'إسحاق نيوتن'
        ],
        correctAnswer: 1,
        explanation: 'Alfred Wegener a fondé sa théorie sur la Pangée et la dérive des continents en 1912.',
        explanationAr: 'ألفريد فيجنر هو صاحب نظرية زحزحة القارات وكتلة بانجيا الأولى.',
        points: 5
      },
      {
        id: 'q_2ac_2',
        type: 'qcm',
        prompt: 'Où se forme la nouvelle croûte océanique par accrétion de magma basaltique ?',
        promptAr: 'أين تتشكل القشرة المحيطية الجديدة عبر تدفق صهارة البازلت وتصلبها؟',
        options: [
          'Au niveau des fosses de subduction',
          'Au niveau de l\'axe des dorsales médio-océaniques',
          'Au sommet de l\'Himalaya',
          'Dans les plaines sédimentaires'
        ],
        optionsAr: [
          'على مستوى الخنادق المحيطية للطمر',
          'على مستوى محور الدروات وسط المحيطية',
          'في قمم جبال الهملايا',
          'في السهول الرسوبية'
        ],
        correctAnswer: 1,
        explanation: 'Les dorsales océaniques sont des zones de divergence où la lave refroidit pour former le plancher océanique.',
        explanationAr: 'الدروة المحيطية هي منطقة تباعد حيث تتدفق الحمم البازلتية وتتصلب لتكون قعر المحيط.',
        points: 5
      },
      {
        id: 'q_2ac_3',
        type: 'true_false',
        prompt: 'Le moteur principal du mouvement des plaques lithosphériques réside dans les courants de convection thermique du manteau.',
        promptAr: 'المحرك الرئيسي لحركة الصفائح الصخرية هو تيارات الحمل الحراري في الرداء الباطني للأرض.',
        correctAnswer: true,
        explanation: 'Vrai. La chaleur interne de la Terre génère des mouvements ascendants et descendants de matière.',
        explanationAr: 'صحيح. الفارق الحراري بين عمق الأرض وسطحها يولد تيارات حمل حراري تحرك الصفائح.',
        points: 5
      },
      {
        id: 'q_2ac_4',
        type: 'qcm',
        prompt: 'L\'argument paléontologique de Wegener repose sur :',
        promptAr: 'تعتمد الحجة المستحاثية لفيجنر على:',
        options: [
          'La ressemblance géométrique des côtes',
          'La découverte des mêmes fossiles anciens (ex : Mesosaurus) sur des continents aujourd\'hui séparés',
          'La mesure par satellites GPS',
          'La vitesse des ondes sismiques'
        ],
        optionsAr: [
          'التطابق الهندسي للسواحل',
          'العثور على نفس المستحاثات القديمة (مثل ميزوزوروس) في قارات تفصلها محيطات حالياً',
          'القياس بالأقمار الاصطناعية ونظام GPS',
          'سرعة الموجات الزلزالية'
        ],
        correctAnswer: 1,
        explanation: 'Des animaux terrestres incapables de traverser l\'océan Atlantique ont été retrouvés sous forme fossile en Afrique et Amérique du Sud.',
        explanationAr: 'عُثر على مستحاثات كائنات قارية لا تقوى على السباحة عبر المحيط في إفريقيا وأمريكا الجنوبية معاً.',
        points: 5
      }
    ]
  },
  {
    id: 'quiz_3ac_digestion',
    lessonId: 'lesson_3ac_digestion',
    gradeLevel: '3AC',
    title: 'Quiz 3AC : Digestion et absorption intestinale',
    titleAr: 'اختبار 3AC: الهضم والامتصاص المعوي ومصير القيت',
    description: 'Questions d\'application sur les enzymes digestives, les nutriments et les villosités intestinales.',
    descriptionAr: 'أسئلة تطبيقية حول الأنزيمات الهضمية، مواد القيت وبنية الخملات المعوية.',
    durationMinutes: 15,
    isExam: false,
    isPremium: false,
    passingScore: 10,
    questions: [
      {
        id: 'q_3ac_1',
        type: 'qcm',
        prompt: 'Quelle enzyme salivaire transforme l\'amidon cuit en maltose ?',
        promptAr: 'ما هو الأنزيم اللعابي المسؤول عن تحويل النشا المطبوخ إلى سكر المالتوز؟',
        options: [
          'La pepsine gastrique',
          'L\'amylase salivaire',
          'La lipase pancréatique',
          'La maltase'
        ],
        optionsAr: [
          'البيبسين المعدي',
          'النشاوز اللعابي',
          'الليباز البنكرياسي',
          'المالتاز المعوي'
        ],
        correctAnswer: 1,
        explanation: 'L\'amylase salivaire coupe les longues chaînes d\'amidon en maltose à pH neutre et 37°C.',
        explanationAr: 'أنزيم النشاوز اللعابي يفكك سلاسل النشا المعقدة إلى سكر ثنائي (المالتوز) في حرارة الجسم.',
        points: 5
      },
      {
        id: 'q_3ac_2',
        type: 'qcm',
        prompt: 'Quel nutriment simple résulte de la digestion complète des protéines par les protéases ?',
        promptAr: 'ما هي مادة القيت البسيطة الناتجة عن الهضم الكامل للبروتيدات بفعل أنزيمات البروتياز والبيبتيداز؟',
        options: [
          'Le glucose',
          'Les acides aminés',
          'Les acides gras',
          'Le glycogène'
        ],
        optionsAr: [
          'الغلوكوز',
          'الأحماض الأمينية',
          'الأحماض الدهنية',
          'الغلایکوجين'
        ],
        correctAnswer: 1,
        explanation: 'Les protéines sont des polymères d\'acides aminés qui sont libérés lors de la digestion.',
        explanationAr: 'تتكون البروتينات من أحماض أمينية مترابطة تتحرر بعد التبسيط الجزيئي الكلي.',
        points: 5
      },
      {
        id: 'q_3ac_3',
        type: 'true_false',
        prompt: 'L\'absorption intestinale s\'effectue à travers la paroi des villosités intestinales riches en capillaires sanguins et lymphatiques.',
        promptAr: 'تتم ظاهرة الامتصاص المعوي عبر جدار الخملات المعوية الغنية بالشعيرات الدموية واللمفاوية.',
        correctAnswer: true,
        explanation: 'Vrai. La finesse de l\'épithélium et l\'immense surface des villosités facilitent le passage des nutriments vers le sang.',
        explanationAr: 'صحيح. دقة جدار الخملة وغناه بالأوعية الدموية والبلغمية يمكنان من عبور القيت بسرعة إلى الدورة الدموية.',
        points: 5
      },
      {
        id: 'q_3ac_4',
        type: 'qcm',
        prompt: 'Par quelle voie les acides gras et le glycérol sont-ils principalement absorbés ?',
        promptAr: 'عبر أي مسلك يتم امتصاص الأحماض الدهنية والغليسيرول بصفة رئيسية؟',
        options: [
          'La voie sanguine directe',
          'La voie lymphatique (vaisseaux chylifères)',
          'La voie respiratoire',
          'La voie rénale'
        ],
        optionsAr: [
          'المسلك الدموي المباشر',
          'المسلك اللمفاوي (الأوعية البلغمية المركزية)',
          'المسلك التنفسي',
          'المسلك الكلوي'
        ],
        correctAnswer: 1,
        explanation: 'Les lipides digérés rejoignent les vaisseaux lymphatiques (chylifères) avant de se déverser dans le sang veineux.',
        explanationAr: 'تنتقل نواتج هضم الدهنيات أولاً عبر اللمف (الوعاء البلغمي) قبل أن تصب في الدورة الدموية.',
        points: 5
      }
    ]
  }
];

export const MOROCCAN_EXAMENS_BLANCS: Quiz[] = [
  {
    id: 'exam_3ac_regional_blanc',
    gradeLevel: '3AC',
    title: 'Examen Blanc Régional SVT 3AC (Cadre de référence marocain)',
    titleAr: 'الامتحان الجهوي التجريبي الموحد لنيل شهادة السلك الإعدادي 3AC',
    description: 'Épreuve conforme aux directives officielles du Ministère de l\'Éducation Nationale : Restitution des connaissances (8 pts) et Raisonnement scientifique (12 pts).',
    descriptionAr: 'اختبار تجريبي مطابق للأطر المرجعية الرسمية لوزارة التربية الوطنية المغربية: استرداد المعارف (8 ن) والاستدلال العلمي والتواصل البياني (12 ن).',
    durationMinutes: 60,
    isExam: true,
    isPremium: false,
    passingScore: 10,
    questions: [
      {
        id: 'ex_1',
        type: 'qcm',
        prompt: '[Partie 1 : Restitution des connaissances / 8 pts] La digestion in vitro de l\'amidon par l\'amylase salivaire à 37°C produit :',
        promptAr: '[الجزء 1: استرداد المعارف / 8 ن] يؤدي الهضم الاصطناعي لمطبوخ النشا باللعاب في درجة حرارة 37°C إلى إنتاج:',
        options: [
          'Du saccharose',
          'Du maltose qui réduit la liqueur de Fehling à chaud',
          'Des acides gras et du glycérol',
          'Des protéines solubles'
        ],
        optionsAr: [
          'سكروز',
          'مالتوز يختزل محلول فهلينغ عند التسخين إلى راسب أحمر آجوري',
          'أحماض دهنية وغليسيرول',
          'بروتيدات ذائبة'
        ],
        correctAnswer: 1,
        explanation: 'L\'amylase salivaire transforme l\'amidon en maltose, un sucre réducteur.',
        explanationAr: 'أنزيم النشاوز اللعابي يفكك النشا إلى مالتوز وهو سكر مختزل يعطي راسباً أحمر آجورياً مع فهلينغ.',
        points: 4
      },
      {
        id: 'ex_2',
        type: 'true_false',
        prompt: '[Restitution des connaissances] La racine postérieure du nerf rachidien renferme uniquement des fibres motrices centrifuges.',
        promptAr: '[استرداد المعارف] يحتوي الجذر الخلفي للعصب السيسائي حصرياً على ألياف عصبية حركية نابذة.',
        correctAnswer: false,
        explanation: 'Faux ! La racine postérieure (avec ganglion spinal) contient les fibres sensitives centripètes, tandis que la racine antérieure contient les fibres motrices.',
        explanationAr: 'خطأ! الجذر الخلفي (الذي يضم العقدة الشوكية) يحتوي على الألياف الحسية الجابذة، بينما الجذر الأمامي يضم الألياف الحركية النابذة.',
        points: 4
      },
      {
        id: 'ex_3',
        type: 'scientific_analysis',
        prompt: '[Partie 2 : Raisonnement scientifique et analyse de document / 12 pts] On mesure la glycémie (taux de glucose sanguin) chez un individu avant et après un repas riche en glucides. La glycémie passe de 0,9 g/L à 1,4 g/L, puis revient à 1 g/L au bout de 2 heures. Quel organe intervient pour stocker l\'excès de glucose sous forme de glycogène ?',
        promptAr: '[الجزء 2: الاستدلال العلمي والتحليل البياني / 12 ن] نقيس تركيز الغلوكوز في الدم (التحلون) عند شخص سليم قبل وبعد وجبة غنية بالسكريات. يرتفع التحلون من 0.9 g/L إلى 1.4 g/L ثم يعود لقيمته العادية (1 g/L) بعد ساعتين. ما هو العضو الأساسي المتدخل لتخزين فائض الغلوكوز على شكل غليكوجين؟',
        options: [
          'Le poumon',
          'Le foie (sous l\'effet de l\'insuline pancréatique)',
          'La vessie urinaire',
          'L\'estomac'
        ],
        optionsAr: [
          'الرئة',
          'الكبد (بتأثير هرمون الأنسولين البنكرياسي)',
          'المثانة البولية',
          'المعدة'
        ],
        correctAnswer: 1,
        explanation: 'Le foie joue le rôle de réservoir régulateur : il synthétise le glycogène (glycogénogénèse) sous l\'action de l\'insuline.',
        explanationAr: 'يلعب الكبد دور العضو المنظم الأساسي؛ حيث يخزن الغلوكوز على شكل غليكوجين كبدي بتأثير هرمون الأنسولين.',
        points: 6
      },
      {
        id: 'ex_4',
        type: 'qcm',
        prompt: '[Raisonnement scientifique] Lors d\'une lésion accidentelle de l\'aire motrice de l\'hémisphère cérébral droit, on observe une paralysie de :',
        promptAr: '[الاستدلال العلمي] عند حدوث تلف أو نزيف في الباحة الحركية لنصف الكرة المخية الأيمن، يُصاب الشخص بشلل في:',
        options: [
          'La partie droite du corps (hémicorps droit)',
          'La partie gauche du corps (hémicorps gauche) en raison du croisement des voies nerveuses',
          'Les deux yeux uniquement',
          'La moelle épinière entière'
        ],
        optionsAr: [
          'الجانب الأيمن من الجسم',
          'الجانب الأيسر من الجسم بسبب تصالب الألياف العصبية الهرمية في البصلة السيسائية',
          'العينين فقط',
          'كامل النخاع الشوكي'
        ],
        correctAnswer: 1,
        explanation: 'Les voies motrices pyramidales se croisent au niveau du bulbe rachidien : le cortex droit contrôle la motricité gauche.',
        explanationAr: 'تتصالب الألياف العصبية الحركية في البصلة السيسائية مما يجعل نصف المخ الأيمن يتحكم في عضلات النصف الأيسر من الجسم.',
        points: 6
      }
    ]
  }
];
