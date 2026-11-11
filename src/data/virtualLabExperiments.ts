import { VirtualExperiment } from '../types/svt';

export const SVT_EXPERIMENTS: VirtualExperiment[] = [
  {
    id: 'exp_photosynthesis',
    gradeLevel: '1AC',
    title: 'Photosynthèse & Synthèse d\'amidon',
    titleAr: 'التركيب الضوئي وتركيب النشا',
    subtitle: 'Mise en évidence du rôle de la lumière et de la chlorophylle',
    subtitleAr: 'إبراز دور الضوء واليخضور في إنتاج المادة العضوية',
    scientificConcept: 'Les végétaux chlorophylliens sont des producteurs primaires de matière organique grâce à la photosynthèse, nécessitant lumière, CO2, eau et chlorophylle.',
    scientificConceptAr: 'النباتات اليخضورية منتجات أولية للمادة العضوية عبر التركيب الضوئي، وتتطلب الضوء وثاني أكسيد الكربون والماء واليخضور.',
    objective: 'Démontrer expérimentalement que la synthèse d\'amidon ne se produit que dans les parties éclairées contenant de la chlorophylle grâce au test à l\'eau iodée.',
    objectiveAr: 'إثبات تجريبياً أن النشا يُركب فقط في الأجزاء المعرضة للضوء والمحتوية على اليخضور بواسطة كاشف الماء اليودي.',
    protocolSteps: [
      { step: 1, instruction: 'Éclairer la feuille avec un cache noir partiel pendant 24 heures.', instructionAr: 'تعريض الورقة النباتية لضوء جزئي مع حجب جزء منها بغطاء أسود لمدة 24 ساعة.' },
      { step: 2, instruction: 'Faire bouillir la feuille dans l\'alcool à 90° pour extraire la chlorophylle.', instructionAr: 'غلي الورقة في الكحول 90° لإزالة صبغة اليخضور الخضراء.' },
      { step: 3, instruction: 'Rincer la feuille décolorée à l\'eau tiède.', instructionAr: 'شطف الورقة المبيضة بالماء الفاتر.' },
      { step: 4, instruction: 'Verser l\'eau iodée (jaune-brun) : virage au bleu-noir en présence d\'amidon.', instructionAr: 'إضافة قطرات من الماء اليودي (بني مصفر): تلوّن باللون الأزرق الداكن في وجود النشا.' }
    ],
    controls: [
      { id: 'lightExposure', label: 'Exposition à la Lumière', labelAr: 'شدة الإضاءة', type: 'slider', min: 0, max: 100, step: 10, defaultValue: 80 },
      { id: 'hasMask', label: 'Présence du Cache Opaque', labelAr: 'وضع الغطاء العازل للضوء', type: 'toggle', defaultValue: true },
      { id: 'iodineTest', label: 'Ajout de l\'Eau Iodée', labelAr: 'إضافة الماء اليودي', type: 'toggle', defaultValue: false }
    ],
    simulationType: 'photosynthesis'
  },
  {
    id: 'exp_respiration',
    gradeLevel: '1AC',
    title: 'Respiration & Échanges Gazeux',
    titleAr: 'التنفس والتبادلات الغازية',
    subtitle: 'Consommation d\'O2 et rejet de CO2 par des êtres vivants',
    subtitleAr: 'استهلاك الأكسجين وطرح ثاني أكسيد الكربون من طرف الكائنات الحية',
    scientificConcept: 'La respiration cellulaire consiste en l\'absorption de dioxygène (O2) et le rejet de dioxyde de carbone (CO2) par oxydation des nutriments.',
    scientificConceptAr: 'التنفس الخلوي يتمثل في امتصاص ثنائي الأكسجين وطرح ثنائي أكسيد الكربون لأكسدة مواد القيت وتحرير الطاقة.',
    objective: 'Observer le trouble de l\'eau de chaux (preuve de CO2) et la diminution du taux d\'O2 mesurée à l\'oxymètre.',
    objectiveAr: 'ملاحظة تعكر ماء الجير (دليل على طرح CO2) وانخفاض تركيز O2 المقاس بمسبار الأكسجين.',
    protocolSteps: [
      { step: 1, instruction: 'Placer l\'organisme (graines en germination ou criquet) dans une enceinte fermée.', instructionAr: 'وضع الكائن الحي (بذور في طور الإنبات أو جندب) في وعاء مغلق بإحكام.' },
      { step: 2, instruction: 'Relier l\'enceinte à un tube contenant de l\'eau de chaux limpide.', instructionAr: 'ربط الوعاء بأنبوب يحتوي على ماء الجير الصافي.' },
      { step: 3, instruction: 'Activer la sonde oxymétrique pour enregistrer le taux d\'O2 en direct.', instructionAr: 'تشغيل مسبار الأكسيمتر لتسجيل نسبة O2 في الوقت الحقيقي.' }
    ],
    controls: [
      { id: 'organism', label: 'Organisme testé', labelAr: 'الكائن الحي المُختبر', type: 'select', defaultValue: 'seeds', options: [
        { value: 'seeds', label: 'Graines en germination', labelAr: 'بذور في طور الإنبات' },
        { value: 'insect', label: 'Criquet (animal)', labelAr: 'جندب (حيوان)' },
        { value: 'control', label: 'Témoin (vide)', labelAr: 'شاهد (وعاء فارغ)' }
      ]},
      { id: 'timeElapsed', label: 'Temps d\'incubation (minutes)', labelAr: 'مدة التجربة (دقائق)', type: 'slider', min: 0, max: 60, step: 5, defaultValue: 30 }
    ],
    simulationType: 'respiration'
  },
  {
    id: 'exp_stomata',
    gradeLevel: '1AC',
    title: 'Fermeture et Ouverture des Stomates',
    titleAr: 'انفتاح وانغلاق الثغور النباتية',
    subtitle: 'Régulation des échanges gazeux et de l\'évapotranspiration',
    subtitleAr: 'تنظيم التبادلات الغازية والنتح عند النباتات',
    scientificConcept: 'Les stomates sont des orifices foliaires formés de deux cellules de garde. Ils régulent la transpiration et les échanges de gaz respiratoires et photosynthétiques.',
    scientificConceptAr: 'الثغور مسامات على بشرة الورقة تتكون من خليتين حارستين، تنظم عملية النتح وتبادل الغازات التنفسية والضوئية.',
    objective: 'Observer sous microscope optique la turgescence des cellules stomatiques et l\'ouverture de l\'ostiole selon le taux d\'humidité et la lumière.',
    objectiveAr: 'ملاحظة امتلاء الخلايا الثغرية وانفتاح الفوهة عبر المجهر الضوئي وفق معدل الرطوبة والضوء.',
    protocolSteps: [
      { step: 1, instruction: 'Prélever un fragment d\'épiderme inférieur d\'une feuille de Polypode ou de Lis.', instructionAr: 'أخذ عينة من البشرة السفلية لورقة نبات الخنشار أو الزنبق.' },
      { step: 2, instruction: 'Monter entre lame et lamelle dans une goutte d\'eau.', instructionAr: 'وضع العينة بين الصفيحة والصفيحة الزجاجية في قطرة ماء.' },
      { step: 3, instruction: 'Faire varier la salinité ou le déficit hydrique pour observer la plasmolyse.', instructionAr: 'تغيير تركيز الملوحة أو نقص الماء لملاحظة انكماش الخلايا وانغلاق الثغر.' }
    ],
    controls: [
      { id: 'magnification', label: 'Grossissement Microscope', labelAr: 'تكبير المجهر', type: 'select', defaultValue: '400', options: [
        { value: '100', label: 'x100 (Faible)', labelAr: 'x100 (ضعيف)' },
        { value: '400', label: 'x400 (Moyen)', labelAr: 'x400 (متوسط)' },
        { value: '1000', label: 'x1000 (Immersion)', labelAr: 'x1000 (زيتي قوي)' }
      ]},
      { id: 'hydrationState', label: 'État d\'hydratation', labelAr: 'حالة الرطوبة والماء', type: 'select', defaultValue: 'normal', options: [
        { value: 'normal', label: 'Normal (Turgescent)', labelAr: 'عادي (ممتلئ - منفتح)' },
        { value: 'drought', label: 'Stress Hydrique (Sécheresse)', labelAr: 'جفاف ونقص الماء (منغلق)' },
        { value: 'night', label: 'Obscurité (Nuit)', labelAr: 'ظلام الليل (منغلق)' }
      ]}
    ],
    simulationType: 'stomata'
  },
  {
    id: 'exp_digestion',
    gradeLevel: '3AC',
    title: 'Digestion In Vitro de l\'Amidon',
    titleAr: 'الهضم الاصطناعي للنشا باللعاب',
    subtitle: 'Action de l\'amylase salivaire et hydrolyse enzymatique',
    subtitleAr: 'تأثير أنزيم النشاوز اللعابي والحلمأة الأنزيمية',
    scientificConcept: 'Les enzymes digestives sont des catalyseurs biologiques spécifiques agissant à température corporelle (37°C) pour simplifier les macromolécules.',
    scientificConceptAr: 'الأنزيمات الهضمية محفزات حيوية نوعية تعمل في درجة حرارة الجسم (37°C) لتبسيط الجزيئات المعقدة إلى جزيئات بسيطة (مواد قيت).',
    objective: 'Suivre la disparition de l\'amidon (test à l\'eau iodée) et l\'apparition du maltose (test à la liqueur de Fehling à chaud).',
    objectiveAr: 'تتبع اختفاء النشا (بالماء اليودي) وظهور سكر المالتوز المختزل (بمحلول فهلينغ مع التسخين).',
    protocolSteps: [
      { step: 1, instruction: 'Préparer 2 tubes : Tube A (Empois d\'amidon + Salive fraîche) et Tube B Témoin (Empois d\'amidon + Eau distillée).', instructionAr: 'تحضير أنبوبين: أنبوب A (مطبوخ النشا + لعاب طازج) وأنبوب B شاهد (مطبوخ النشا + ماء مقطر).' },
      { step: 2, instruction: 'Placer les tubes au bain-marie à 37°C pendant 15 minutes.', instructionAr: 'وضع الأنبوبين في حمام مريم بدرجة حرارة 37°C لمدة 15 دقيقة.' },
      { step: 3, instruction: 'Effectuer le test à la liqueur de Fehling avec ébullition : apparition d\'un précipité rouge brique.', instructionAr: 'إجراء اختبار محلول فهلينغ مع التسخين: تشكل راسب أحمر آجوري يؤكد وجود سكر مختزل.' }
    ],
    controls: [
      { id: 'temperature', label: 'Température du bain-marie (°C)', labelAr: 'درجة حرارة الحمام المائي (°C)', type: 'slider', min: 0, max: 100, step: 10, defaultValue: 37 },
      { id: 'hasSaliva', label: 'Ajout de Salive (Amylase)', labelAr: 'إضافة اللعاب (أنزيم النشاوز)', type: 'toggle', defaultValue: true },
      { id: 'duration', label: 'Temps écoulé (minutes)', labelAr: 'الزمن المنقضي (دقائق)', type: 'slider', min: 0, max: 30, step: 5, defaultValue: 15 }
    ],
    simulationType: 'digestion'
  },
  {
    id: 'exp_transpiration',
    gradeLevel: '1AC',
    title: 'Transpiration Végétale & Mesure au Potomètre',
    titleAr: 'النتح النباتي والقياس بالبوتومتر',
    subtitle: 'Perte d\'eau sous forme de vapeur par les feuilles',
    subtitleAr: 'فقدان الماء على شكل بخار عبر الأوراق',
    scientificConcept: 'La transpiration foliaire crée un appel d\'eau qui aspire la sève brute (eau + sels minéraux) des racines jusqu\'aux feuilles.',
    scientificConceptAr: 'عملية النتح تحدث قوة شفط تجذب النسغ الناقص من الجذور نحو الأوراق عبر الأوعية الخشبية.',
    objective: 'Mesurer la vitesse de déplacement d\'une bulle d\'air dans le tube capillaire en fonction de la température et du vent.',
    objectiveAr: 'قياس سرعة تحرك فقاعة هواء في أنبوب دقيق حسب درجة الحرارة وحركة الهواء والرياح.',
    protocolSteps: [
      { step: 1, instruction: 'Brancher un rameau feuillé dans le potomètre rempli d\'eau.', instructionAr: 'تثبيت غصن مورق داخل جهاز البوتومتر المليء بالماء.' },
      { step: 2, instruction: 'Introduire une petite bulle d\'air dans le tube capillaire millimétré.', instructionAr: 'إدخال فقاعة هواء صغيرة داخل الأنبوب الشعري المدرج.' },
      { step: 3, instruction: 'Enclencher le ventilateur ou la lampe thermique et chronométrer l\'avancée de la bulle.', instructionAr: 'تشغيل المروحة أو المصباح الحراري وتوقيت حركة الفقاعة.' }
    ],
    controls: [
      { id: 'hasWind', label: 'Ventilateur (Vent)', labelAr: 'تشغيل الرياح (مروحة)', type: 'toggle', defaultValue: false },
      { id: 'temperature', label: 'Chaleur ambiante', labelAr: 'حرارة الجو المحيط', type: 'slider', min: 15, max: 40, step: 5, defaultValue: 25 },
      { id: 'leafCount', label: 'Nombre de feuilles', labelAr: 'عدد أوراق الغصن', type: 'slider', min: 2, max: 12, step: 2, defaultValue: 8 }
    ],
    simulationType: 'transpiration'
  },
  {
    id: 'exp_reflex_arc',
    gradeLevel: '3AC',
    title: 'L\'Arc Réflexe Médullaire',
    titleAr: 'القوس الانعكاسي الشوكي',
    subtitle: 'Analyse des mouvements involontaires chez la grenouille spinale',
    subtitleAr: 'تحليل الحركات اللاإرادية والانعكاسية عند الضفدعة الشوكية',
    scientificConcept: 'Le réflexe inné est une réponse motrice involontaire stéréotypée déclenchée par un stimulus sensoriel. Le centre nerveux responsable est la moelle épinière.',
    scientificConceptAr: 'الانعكاس الشوكي رد فعل حركي لاإرادي وسريع ومبرمج إثر إهاجة حسية، ومركزه العصبي هو النخاع الشوكي.',
    objective: 'Identifier les éléments de l\'arc réflexe (récepteur cutané, nerf sciatique sensitif/moteur, moelle épinière, muscle effecteur).',
    objectiveAr: 'تحديد العناصر المتدخلة في القوس الانعكاسي: المستقبل الحسي، العصب السيسائي، النخاع الشوكي، والعضو المستجيب (العضلة).',
    protocolSteps: [
      { step: 1, instruction: 'Préparer une grenouille spinale (cerveau détruit, moelle épinière intacte).', instructionAr: 'تحضير ضفدعة شوكية (دماغ مخرب ونخاع شوكي سليم معلقة من فكها).' },
      { step: 2, instruction: 'Tremper l\'orteil dans des solutions d\'acide acétique à concentrations croissantes.', instructionAr: 'غمر طرف أصابع الرجل في محاليل حمض الخليك بتراكيز متصاعدة.' },
      { step: 3, instruction: 'Tester l\'effet d\'une anesthésie locale de la peau à l\'éther ou la section du nerf sciatique.', instructionAr: 'اختبار تأثير تخدير الجلد بالإيثر أو قطع العصب الوركي على الاستجابة الحركية.' }
    ],
    controls: [
      { id: 'acidConcentration', label: 'Concentration en Acide', labelAr: 'تركيز الحمض (شدة الإهاجة)', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 2 },
      { id: 'condition', label: 'Condition expérimentale', labelAr: 'الحالة التجريبية', type: 'select', defaultValue: 'normal', options: [
        { value: 'normal', label: 'Grenouille normale (Moelle intacte)', labelAr: 'ضفدعة شوكية سليمة' },
        { value: 'anesthetized_skin', label: 'Peau anesthésiée à l\'éther', labelAr: 'جلد مخدر بالإيثر (مستقبل مخرب)' },
        { value: 'cut_nerve', label: 'Nerf sciatique sectionné', labelAr: 'عصب وركي مقطوع' },
        { value: 'destroyed_cord', label: 'Moelle épinière détruite', labelAr: 'نخاع شوكي مخرب' }
      ]}
    ],
    simulationType: 'reflex_arc'
  },
  {
    id: 'exp_volcano',
    gradeLevel: '2AC',
    title: 'Volcanisme Effusif vs Explosif',
    titleAr: 'البركانية الانسكابية والانفجارية',
    subtitle: 'Rôle de la viscosité du magma et de la teneur en gaz dissous',
    subtitleAr: 'دور لزوجة الصهارة ونسبة الغازات الذائبة في نمط البركان',
    scientificConcept: 'Le dynamisme éruptif dépend de la teneur en silice et de la viscosité du magma : fluide -> coulées effusives ; visqueux -> dôme, nuées ardentes et explosions.',
    scientificConceptAr: 'دينامية الثوران تعتمد على لزوجة الصهارة وغناها بالسيليس والغازات: سائلة -> بركان انسكابي؛ لزجة -> بركان انفجاري وسحب حارقة.',
    objective: 'Simuler l\'ascension du magma et visualiser l\'édification d\'un cône volcanique ou d\'un dôme d\'extrusion.',
    objectiveAr: 'محاكاة صعود الصهارة ورؤية تشكل المخروط البركاني أو القبة المتفجرة.',
    protocolSteps: [
      { step: 1, instruction: 'Régler la teneur en silice (viscosité) et la pression des gaz dans la chambre magmatique.', instructionAr: 'ضبط نسبة السيليس (اللزوجة) وضغط الغازات في الغرفة الصهارية.' },
      { step: 2, instruction: 'Déclencher la montée magmatique le long de la cheminée volcanique.', instructionAr: 'إطلاق صعود الصهارة عبر المدخنة البركانية.' },
      { step: 3, instruction: 'Observer les retombées de pyroclastes, cendres, projections ou coulées basaltiques.', instructionAr: 'ملاحظة تدفقات البازلت المسالة أو تشكل سحابة الرماد والمقذوفات الانفجارية.' }
    ],
    controls: [
      { id: 'viscosity', label: 'Type de Lave / Viscosité', labelAr: 'نوع اللابة / درجة اللزوجة', type: 'select', defaultValue: 'fluid', options: [
        { value: 'fluid', label: 'Fluide basaltique (Effusif - Type Hawaïen)', labelAr: 'سائلة بازلتية (انسكابي - نمط هاواي)' },
        { value: 'viscous', label: 'Visqueuse andésitique (Explosif - Type Péléen)', labelAr: 'لزجة أنديزيتية (انفجاري - نمط بيلي)' }
      ]},
      { id: 'gasPressure', label: 'Pression des Gaz (bars)', labelAr: 'ضغط الغازات المحبوسة', type: 'slider', min: 10, max: 100, step: 10, defaultValue: 30 }
    ],
    simulationType: 'volcano'
  }
];
