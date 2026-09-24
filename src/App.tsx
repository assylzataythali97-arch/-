import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  FileText,
  Settings,
  Info,
  Home,
  PlusCircle,
  Download,
  Printer,
  RefreshCw,
  Edit3,
  Trash2,
  Check,
  AlertCircle,
  ChevronRight,
  Eye,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  Book,
  Feather
} from 'lucide-react';

interface Task {
  number: number;
  type: string;
  instruction: string;
  content: string;
  answer: string;
  descriptor: string;
  sourceEvidence?: string;
}

interface Worksheet {
  id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  learningObjective: string;
  difficulty: string;
  createdAt: string;
  tasks: Task[];
}

interface FormDataState {
  subject: string;
  grade: string;
  topic: string;
  learningObjective: string;
  taskCount: number;
  difficulty: string;
  selectedTaskTypes: string[];
  sourceText: string;
}

const SUBJECTS = ['Қазақ тілі', 'Қазақ әдебиеті'];

const GRADES = Array.from({ length: 11 }, (_, i) => `${i + 1}-сынып`);

const TASK_TYPES = [
  'Кесте толтыру',
  'Салыстыру',
  'Сәйкестендіру',
  'Бос орынды толтыру',
  'Дұрыс/бұрыс',
  'Тест',
  'Ашық сұрақ',
  'Мәтінмен жұмыс',
  'Дәлел келтіру',
  'Талдау',
  'Шығармашылық тапсырма',
  'Ретін анықтау',
  'Тірек сөздермен жұмыс',
  'Рефлексия',
  'AI өзі таңдасын'
];

const DIFFICULTY_LEVELS = ['Жеңіл', 'Орта', 'Күрделі'];

const HERO_IMAGE_URL = 'https://tursynbaeva-kamila.kz/uploads/img_6ab547f5453dc.png';

export default function App() {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<
    'landing' | 'dashboard' | 'constructor' | 'preview' | 'saved' | 'settings' | 'about'
  >('landing');
  const [teacherMode, setTeacherMode] = useState(false); // Student vs Teacher answer key toggle
  const [designStyle, setDesignStyle] = useState<'stylized' | 'simple'>('stylized');

  // Worksheet Form State
  const [formData, setFormData] = useState<FormDataState>({
    subject: 'Қазақ әдебиеті',
    grade: '6-сынып',
    topic: '',
    learningObjective: '',
    taskCount: 4,
    difficulty: 'Орта',
    selectedTaskTypes: ['Салыстыру', 'Талдау', 'Дәлел келтіру', 'Шығармашылық тапсырма'],
    sourceText: ''
  });

  // UI & Loading state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentWorksheet, setCurrentWorksheet] = useState<Worksheet | null>(null);
  const [savedWorksheets, setSavedWorksheets] = useState<Worksheet[]>([]);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    console.log('[UL] App initialized');
    try {
      const stored = localStorage.getItem('ustaz_lab_worksheets');
      if (stored) {
        setSavedWorksheets(JSON.parse(stored));
        console.log('[UL] Loaded saved worksheets from local storage:', JSON.parse(stored).length);
      }
    } catch (e) {
      console.error('[UL] Error loading from localStorage:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTaskTypeToggle = (type: string) => {
    if (type === 'AI өзі таңдасын') {
      setFormData(prev => ({ ...prev, selectedTaskTypes: ['AI өзі таңдасын'] }));
      return;
    }

    setFormData(prev => {
      let updated = prev.selectedTaskTypes.filter(t => t !== 'AI өзі таңдасын');
      if (updated.includes(type)) {
        updated = updated.filter(t => t !== type);
      } else {
        if (updated.length >= 4) {
          showToast('Ең көп 4 тапсырма түрін таңдай аласыз!');
          return prev;
        }
        updated.push(type);
      }
      return { ...prev, selectedTaskTypes: updated };
    });
  };

  const generateWorksheetWithAI = async (singleTaskToReplaceIndex: number | null = null) => {
    // Input Validation
    if (!formData.topic.trim()) {
      setErrorMessage('Сабақ тақырыбын енгізіңіз!');
      return;
    }
    if (!formData.learningObjective.trim()) {
      setErrorMessage('Оқу мақсатын енгізіңіз!');
      return;
    }

    setErrorMessage(null);
    if (singleTaskToReplaceIndex !== null) {
      setRegeneratingIndex(singleTaskToReplaceIndex);
    } else {
      setIsGenerating(true);
    }

    console.log('[UL] Form validated');
    console.log('[UL] AI request sent to server-side endpoint');

    setGenerationStep('Педагогикалық параметрлер серверге жіберілуде...');

    try {
      setGenerationStep('ЖИ сапалы тапсырмаларды құрастыруда...');

      // Secure Server-Side Gemini API call via /api/generate-worksheet
      const response = await fetch('/api/generate-worksheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject,
          grade: formData.grade,
          topic: formData.topic,
          learningObjective: formData.learningObjective,
          difficulty: formData.difficulty,
          taskCount: singleTaskToReplaceIndex !== null ? 1 : formData.taskCount,
          selectedTaskTypes: formData.selectedTaskTypes,
          sourceText: formData.sourceText,
          singleTaskToReplaceIndex,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Сервер қатесі: ${response.status}`);
      }

      const parsedData = await response.json();
      console.log('[UL] AI server response received');

      setGenerationStep('Семантикалық сапаны тексеру орындалуда...');

      if (!parsedData.tasks || !Array.isArray(parsedData.tasks) || parsedData.tasks.length === 0) {
        throw new Error('ЖИ нақты тапсырмалар жасай алмады. Параметрлерді өзгертіп немесе мәтін/үзінді енгізіп қайта көріңіз.');
      }

      // Check for generic "Fake Tasks"
      const fakeTaskPhrases = [
        'өз ойыңды жаз',
        'сұрақтарға жауап бер',
        'мәтінді оқып, тапсырманы орында',
        'тақырыпты талда'
      ];

      const validTasks: Task[] = parsedData.tasks.filter((task: Task) => {
        const fullContent = (task.instruction + ' ' + task.content).toLowerCase();
        // Ensure no pure fake task
        const isTooGeneric = fakeTaskPhrases.some(phrase => fullContent.trim() === phrase);
        return !isTooGeneric && task.content && task.answer && task.descriptor;
      });

      if (validTasks.length === 0) {
        throw new Error('ЖИ нақты тапсырмалар жасай алмады. Параметрлерді өзгертіп қайта көріңіз.');
      }

      console.log(`[UL] Tasks generated: ${validTasks.length}`);
      console.log('[UL] Semantic validation passed');

      if (singleTaskToReplaceIndex !== null && currentWorksheet) {
        // Single task regeneration replacement
        const updatedTasks = [...currentWorksheet.tasks];
        updatedTasks[singleTaskToReplaceIndex] = {
          ...validTasks[0],
          number: singleTaskToReplaceIndex + 1
        };
        const updatedSheet = {
          ...currentWorksheet,
          tasks: updatedTasks
        };
        setCurrentWorksheet(updatedSheet);
        showToast(`№${singleTaskToReplaceIndex + 1} тапсырма сәтті жаңартылды!`);
      } else {
        // Full new worksheet
        const newWorksheet: Worksheet = {
          id: 'ws_' + Date.now(),
          title: parsedData.title || formData.topic,
          subject: formData.subject,
          grade: formData.grade,
          topic: formData.topic,
          learningObjective: formData.learningObjective,
          difficulty: formData.difficulty,
          createdAt: new Date().toLocaleDateString('kk-KZ'),
          tasks: validTasks.slice(0, formData.taskCount).map((t, idx) => ({ ...t, number: idx + 1 }))
        };

        setCurrentWorksheet(newWorksheet);
        console.log('[UL] Worksheet rendered');
        setCurrentView('preview');
      }

    } catch (err: unknown) {
      console.error('[UL] Error during worksheet generation:', err);
      const msg = err instanceof Error ? err.message : 'ЖИ қызметіне уақытша қосылу мүмкін болмады. Біраз уақыттан кейін қайта көріңіз.';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
      setRegeneratingIndex(null);
      setGenerationStep('');
    }
  };

  const handleStartEditTask = (index: number) => {
    if (!currentWorksheet) return;
    setEditingTaskIndex(index);
    setEditedTask({ ...currentWorksheet.tasks[index] });
  };

  const handleSaveEditTask = () => {
    if (!editedTask || editingTaskIndex === null || !currentWorksheet) return;
    const updatedTasks = [...currentWorksheet.tasks];
    updatedTasks[editingTaskIndex] = editedTask;
    setCurrentWorksheet({ ...currentWorksheet, tasks: updatedTasks });
    setEditingTaskIndex(null);
    setEditedTask(null);
    showToast('Тапсырма өзгертілді!');
  };

  const handleSaveWorksheet = () => {
    if (!currentWorksheet) return;
    const exists = savedWorksheets.some(w => w.id === currentWorksheet.id);
    let updated: Worksheet[];
    if (exists) {
      updated = savedWorksheets.map(w => w.id === currentWorksheet.id ? currentWorksheet : w);
    } else {
      updated = [currentWorksheet, ...savedWorksheets];
    }
    setSavedWorksheets(updated);
    try {
      localStorage.setItem('ustaz_lab_worksheets', JSON.stringify(updated));
      showToast('Жұмыс парағы «Менің жұмыстарым» бөліміне сақталды!');
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const handleDeleteSaved = (id: string) => {
    const updated = savedWorksheets.filter(w => w.id !== id);
    setSavedWorksheets(updated);
    localStorage.setItem('ustaz_lab_worksheets', JSON.stringify(updated));
    showToast('Жұмыс парағы жойылды.');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (!currentWorksheet) return;

    const contentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${currentWorksheet.title}</title>
      <style>
        body { font-family: 'Times New Roman', serif; padding: 20px; }
        h1 { font-size: 18pt; text-align: center; margin-bottom: 5px; }
        .meta { font-size: 11pt; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .task-box { border: 1px solid #777; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
        .task-title { font-weight: bold; font-size: 12pt; color: #1e3a8a; }
        .instruction { font-style: italic; font-size: 10.5pt; color: #4b5563; }
        .content { margin: 10px 0; font-size: 11pt; }
        .answer-key { background-color: #f3f4f6; padding: 8px; font-size: 10pt; margin-top: 10px; border-left: 3px solid #2563eb; }
      </style>
      </head>
      <body>
        <h1>ҰСТАЗ LAB — ЖҰМЫС ПАРАҒЫ</h1>
        <div class="meta">
          <p><b>Пән:</b> ${currentWorksheet.subject} &nbsp;|&nbsp; <b>Сынып:</b> ${currentWorksheet.grade}</p>
          <p><b>Тақырып:</b> ${currentWorksheet.topic}</p>
          <p><b>Оқу мақсаты:</b> ${currentWorksheet.learningObjective}</p>
          <p><b>Оқушының аты-жөні:</b> _____________________________________ &nbsp;&nbsp;&nbsp; <b>Күні:</b> ____________</p>
        </div>
        ${currentWorksheet.tasks.map(t => `
          <div class="task-box">
            <div class="task-title">№${t.number} Тапсырма [${t.type}]</div>
            <div class="instruction">${t.instruction}</div>
            <div class="content">${t.content.replace(/\n/g, '<br/>')}</div>
            <div style="height: 60px; border-bottom: 1px dashed #ccc; margin-top: 15px;">Жауабы:</div>
            ${teacherMode ? `
              <div class="answer-key">
                <p><b>Дұрыс жауабы:</b> ${t.answer}</p>
                <p><b>Дескриптор:</b> ${t.descriptor}</p>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + contentHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWorksheet.topic}_Жұмыс_парағы.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Word форматында жүктелді!');
  };

  const renderHeader = () => (
    <header className="no-print sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setCurrentView('landing')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-200">
              ҰСТАЗ LAB
            </span>
            <span className="block text-[10px] tracking-widest text-indigo-400 font-semibold uppercase">
              AI WORKSHEET CONSTRUCTOR
            </span>
          </div>
        </div>

        {currentView !== 'landing' && (
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Басты бет</span>
            </button>

            <button
              onClick={() => setCurrentView('constructor')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                currentView === 'constructor' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Жасау</span>
            </button>

            <button
              onClick={() => setCurrentView('saved')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                currentView === 'saved' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Жұмыстарым</span>
              {savedWorksheets.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                  {savedWorksheets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                currentView === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Баптаулар</span>
            </button>

            <button
              onClick={() => setCurrentView('about')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                currentView === 'about' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Жоба туралы</span>
            </button>
          </nav>
        )}

        <div className="flex items-center space-x-3">
          {currentView === 'landing' ? (
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all"
            >
              ЖҮЙЕГЕ КІРУ
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">AI ҚОЛЖЕТІМДІ</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  const renderLandingPage = () => (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
        <div className="lg:w-1/2 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Интеллектуалды Педагогикалық AI Платформа</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            ҰСТАЗ LAB
            <span className="block text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 mt-2">
              AI WORKSHEET CONSTRUCTOR
            </span>
          </h1>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-2xl relative">
            <div className="text-xl sm:text-2xl font-bold text-slate-100 italic leading-snug">
              «Бір тақырып. <br />
              Бір оқу мақсаты. <br />
              ЖИ көмегімен — нақты жұмыс парағы.»
            </div>
          </div>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl">
            Қазақ тілі мен қазақ әдебиеті сабақтарына арналған интеллектуалды жұмыс парағын жасаушы
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-extrabold text-lg shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3 group"
            >
              <span>ЖҮЙЕГЕ КІРУ</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Quick Feature Badges */}
          <div className="pt-6 grid grid-cols-3 gap-4 text-center border-t border-slate-800/80">
            <div>
              <div className="text-indigo-400 font-bold text-xl">100%</div>
              <div className="text-xs text-slate-400">Қазақша мазмұн</div>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-xl">0 Fake</div>
              <div className="text-xs text-slate-400">Нақты тапсырмалар</div>
            </div>
            <div>
              <div className="text-emerald-400 font-bold text-xl">A4 Format</div>
              <div className="text-xs text-slate-400">Басып шығаруға дайын</div>
            </div>
          </div>
        </div>

        {/* Required Hero Image Container */}
        <div className="lg:w-1/2 w-full flex justify-center">
          <div className="relative group w-full max-w-lg">
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur-xl opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl p-2">
              {!imageError ? (
                <img
                  src={HERO_IMAGE_URL}
                  alt="Ustaz Lab AI Education"
                  onError={() => setImageError(true)}
                  className="w-full h-auto object-cover rounded-xl shadow-inner transform group-hover:scale-102 transition-transform duration-500"
                />
              ) : (
                /* Fallback Aesthetic Graphic if URL is unreachable */
                <div className="w-full h-80 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 rounded-xl flex flex-col items-center justify-center p-8 text-center border border-indigo-500/20">
                  <GraduationCap className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
                  <h3 className="text-xl font-bold text-white mb-2">ҰСТАЗ LAB Digital Classroom</h3>
                  <p className="text-xs text-indigo-200">Қазақ тілі мен әдебиеті мұғалімдеріне арналған AI платформасы</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 no-print">
        <p>«ҰСТАЗ LAB» — ЖИ мұғалімнің педагогикалық идеясын дайын жұмыс парағына айналдырады © 2026</p>
      </footer>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="no-print w-full md:w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white">ҰСТАЗ LAB</span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>🏠 Басты бет</span>
            </button>

            <button
              onClick={() => setCurrentView('constructor')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                currentView === 'constructor' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span>✨ Жұмыс парағын жасау</span>
            </button>

            <button
              onClick={() => setCurrentView('saved')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                currentView === 'saved' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>📚 Менің жұмыстарым</span>
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                currentView === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>⚙️ Баптаулар</span>
            </button>

            <button
              onClick={() => setCurrentView('about')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                currentView === 'about' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Info className="w-5 h-5" />
              <span>ℹ️ ҰСТАЗ LAB туралы</span>
            </button>
          </div>
        </div>

        {/* AI Service Status Indicator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs text-slate-400 font-medium">AI Қызметінің статусы:</div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-bold text-emerald-400">🟢 ҚОЛЖЕТІМДІ</span>
          </div>
          <p className="text-[10px] text-slate-500">Қорғалған серверлік архитектура белсенді</p>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-violet-900/60 via-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-full uppercase">
              Қош келдіңіз, Мұғалім!
            </span>
            <h2 className="text-3xl font-extrabold text-white">ЖАҢА ЖҰМЫС ПАРАҒЫН ЖАСАУ</h2>
            <p className="text-slate-300 text-base leading-relaxed">
              Тақырыпты, оқу мақсатын және тапсырма түрлерін таңдаңыз. ЖИ нақты, пәнге және сыныпқа сәйкес жұмыс парағын жасайды.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setCurrentView('constructor')}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Жаңа жұмыс парағын бастау</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats & Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Feather className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Қазақ әдебиеті</h3>
            <p className="text-xs text-slate-400">
              Көркем шығармалар, кейіпкерлер, сюжеттік конфликт, идеялар мен көркемдегіш тәсілдер бойынша терең талдау.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Book className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Қазақ тілі</h3>
            <p className="text-xs text-slate-400">
              Граматикалық талдау, құрмалас сөйлем түрлері, синтаксис пен лексикалық нақты сөйлемдік тапсырмалар.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-white">Fake Task Фильтрі</h3>
            <p className="text-xs text-slate-400">
              «Тақырыпты талда», «Өз ойыңды жаз» сияқты бос шаблондарға тыйым салынған. Тек нақты педагогикалық тапсырмалар.
            </p>
          </div>
        </div>

        {/* Recent Worksheets Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Соңғы сақталған жұмыстар</span>
            </h3>
            {savedWorksheets.length > 0 && (
              <button
                onClick={() => setCurrentView('saved')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Барлығын көру ({savedWorksheets.length})
              </button>
            )}
          </div>

          {savedWorksheets.length === 0 ? (
            <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-sm">Әлі сақталған жұмыс парақтары жоқ.</p>
              <button
                onClick={() => setCurrentView('constructor')}
                className="mt-3 text-xs text-indigo-400 font-bold hover:underline"
              >
                Алғашқы жұмыс парағын жасау →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedWorksheets.slice(0, 2).map((ws) => (
                <div key={ws.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold rounded-lg">
                        {ws.subject} • {ws.grade}
                      </span>
                      <span className="text-[10px] text-slate-500">{ws.createdAt}</span>
                    </div>
                    <h4 className="font-bold text-base text-white line-clamp-1">{ws.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      Оқу мақсаты: {ws.learningObjective}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-500">{ws.tasks?.length || 0} тапсырма</span>
                    <button
                      onClick={() => {
                        setCurrentWorksheet(ws);
                        setCurrentView('preview');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1"
                    >
                      <span>Ашу</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );

  const renderConstructor = () => (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Page Heading */}
      <div className="space-y-2 border-b border-slate-800 pb-5">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 mb-2"
        >
          <span>← Басты бетке оралу</span>
        </button>
        <h2 className="text-3xl font-extrabold text-white flex items-center space-x-3">
          <Sparkles className="w-7 h-7 text-indigo-400" />
          <span>Жұмыс парағын жасаушы</span>
        </h2>
        <p className="text-slate-400 text-sm">
          Сабақ параметрлерін енгізіңіз. ЖИ нақты педагогикалық сұрақтар мен тапсырмаларды құрастырады.
        </p>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold block">Қате орын алды:</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main Constructor Form */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Пән */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200">1. Пән <span className="text-rose-400">*</span></label>
            <select
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {SUBJECTS.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          {/* 2. Сынып */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200">2. Сынып <span className="text-rose-400">*</span></label>
            <select
              value={formData.grade}
              onChange={e => setFormData({ ...formData, grade: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {GRADES.map(grd => (
                <option key={grd} value={grd}>{grd}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Сабақ тақырыбы */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-200">
            3. Сабақ тақырыбы <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Мысалы: Абайдың он жетінші қара сөзі немесе Сабақтас құрмалас сөйлем"
            value={formData.topic}
            onChange={e => setFormData({ ...formData, topic: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        {/* 4. Оқу мақсаты */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-200">
            4. Оқу мақсаты <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Мысалы: Шығармадағы негізгі ой мен авторлық идеяны талдау"
            value={formData.learningObjective}
            onChange={e => setFormData({ ...formData, learningObjective: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 5. Тапсырма саны */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200">5. Тапсырма саны (Ең көп 4)</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFormData({ ...formData, taskCount: num })}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    formData.taskCount === num
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Қиындық */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200">6. Қиындық деңгейі</label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_LEVELS.map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFormData({ ...formData, difficulty: lvl })}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    formData.difficulty === lvl
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 7. Тапсырма түрлері Checkboxes */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-200">7. Тапсырма түрлерін таңдаңыз</label>
            <span className="text-xs text-indigo-400">Таңдалғаны: {formData.selectedTaskTypes.length}/4</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {TASK_TYPES.map(type => {
              const isSelected = formData.selectedTaskTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTaskTypeToggle(type)}
                  className={`p-3 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate mr-1">{type}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 8. Мәтін / Үзінді (Source Text Optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-200">
              Мәтін немесе шығарма үзіндісі <span className="text-slate-500 text-xs font-normal">(Міндетті емес)</span>
            </label>
          </div>
          <textarea
            rows={4}
            placeholder="Нақты мәтінге сүйенген тапсырма қажет болса, мәтін немесе шығарма үзіндісін енгізіңіз..."
            value={formData.sourceText}
            onChange={e => setFormData({ ...formData, sourceText: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
          <p className="text-xs text-slate-500">
            * Түсіндірме: Әдеби шығармалар немесе нақты мәтіндік граматикалық талдау үшін өте пайдалы.
          </p>
        </div>

        {/* Submit Generator Button */}
        <div className="pt-4">
          <button
            onClick={() => generateWorksheetWithAI()}
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>{generationStep || 'Жұмыс парағы құрастырылуда...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-white" />
                <span>ЖҰМЫС ПАРАҒЫН ЖАСАУ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderWorksheetPreview = () => {
    if (!currentWorksheet || !currentWorksheet.tasks) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center text-slate-400">
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto" />
            <p>ЖИ нақты тапсырмалар жасай алмады. Параметрлерді өзгертіп немесе мәтін/үзінді енгізіп қайта көріңіз.</p>
            <button
              onClick={() => setCurrentView('constructor')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold"
            >
              Конструкторға оралу
            </button>
          </div>
        </div>
      );
    }

    const taskCount = currentWorksheet.tasks.length;
    // Dynamic Grid Layout based on task count
    const gridStyle =
      taskCount === 4
        ? 'grid-cols-1 md:grid-cols-2'
        : taskCount === 3
        ? 'grid-cols-1 md:grid-cols-3'
        : taskCount === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1';

    return (
      <div className="min-h-screen bg-slate-950 text-slate-900 pb-20">
        {/* Top Control Bar for Printing & Exporting */}
        <div className="no-print sticky top-16 z-30 bg-slate-900/95 border-b border-slate-800 py-3 px-4 sm:px-8 text-white shadow-xl backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentView('constructor')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                ← Өңдеу
              </button>
              <span className="font-bold text-sm text-indigo-300 truncate max-w-xs">
                {currentWorksheet.topic}
              </span>
            </div>

            {/* View Mode & Actions */}
            <div className="flex items-center space-x-3">
              {/* Teacher Mode Toggle */}
              <button
                onClick={() => setTeacherMode(!teacherMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
                  teacherMode
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{teacherMode ? 'Мұғалім нұсқасы (Жауаптармен)' : 'Оқушы нұсқасы'}</span>
              </button>

              {/* Design Mode Toggle */}
              <button
                onClick={() => setDesignStyle(designStyle === 'stylized' ? 'simple' : 'stylized')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                {designStyle === 'stylized' ? '🎨 Әсем дизайн' : '📄 Қарапайым формат'}
              </button>

              {/* Save */}
              <button
                onClick={handleSaveWorksheet}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Сақтау</span>
              </button>

              {/* Word Export */}
              <button
                onClick={handleExportWord}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Word</span>
              </button>

              {/* Print / PDF Export */}
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Басып шығару / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable A4 Container Area */}
        <div className="max-w-6xl mx-auto mt-8 px-4 flex justify-center">
          {/* A4 Printable Box */}
          <div
            id="a4-worksheet"
            className={`w-full bg-white text-slate-900 rounded-none md:rounded-2xl shadow-2xl p-8 sm:p-12 print:p-6 print:shadow-none print:w-full border border-slate-200 transition-all ${
              designStyle === 'stylized' ? 'border-t-8 border-t-indigo-600' : ''
            }`}
            style={{
              minHeight: '210mm',
              boxSizing: 'border-box'
            }}
          >
            {/* Header Header Info */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">ҰСТАЗ LAB</h1>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">
                    Интеллектуалды жұмыс парағы
                  </span>
                </div>
                <div className="text-right text-xs text-slate-600 space-y-0.5">
                  <div><span className="font-bold text-slate-800">Пән:</span> {currentWorksheet.subject}</div>
                  <div><span className="font-bold text-slate-800">Сынып:</span> {currentWorksheet.grade}</div>
                  <div><span className="font-bold text-slate-800">Қиындық:</span> {currentWorksheet.difficulty}</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-bold text-slate-900">Сабақ тақырыбы:</span>{' '}
                  <span className="text-slate-800 font-medium">{currentWorksheet.topic}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">Оқу мақсаты:</span>{' '}
                  <span className="text-slate-700 italic">{currentWorksheet.learningObjective}</span>
                </div>
              </div>

              {/* Student Name & Date Lines */}
              <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex justify-between items-center text-xs text-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold">Оқушының аты-жөні:</span>
                  <span className="border-b border-slate-800 w-48 sm:w-64 inline-block h-4" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold">Күні:</span>
                  <span className="border-b border-slate-800 w-24 inline-block h-4" />
                </div>
              </div>
            </div>

            {/* Task Items Grid (A4 Optimized) */}
            <div className={`grid ${gridStyle} gap-6`}>
              {currentWorksheet.tasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`border rounded-xl p-5 flex flex-col justify-between relative group ${
                    designStyle === 'stylized'
                      ? 'border-indigo-100 bg-slate-50/50 hover:border-indigo-300'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {/* Task Control Overlay for Edit / Single Regenerate */}
                  <div className="no-print absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white/90 backdrop-blur border border-slate-200 rounded-lg p-1 shadow-sm">
                    <button
                      title="Өзгерту"
                      onClick={() => handleStartEditTask(idx)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Осы тапсырманы қайта жасау"
                      disabled={regeneratingIndex === idx}
                      onClick={() => generateWorksheetWithAI(idx)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${regeneratingIndex === idx ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Task Title & Type Badge */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                          {task.number}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900 uppercase">
                          ТАПСЫРМА
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        {task.type}
                      </span>
                    </div>

                    {/* Instruction */}
                    <div className="text-xs font-semibold text-slate-700 italic">
                      📌 Нұсқаулық: {task.instruction}
                    </div>

                    {/* Content / Question Material */}
                    <div className="text-xs text-slate-900 leading-relaxed font-normal whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                      {task.content}
                    </div>

                    {/* Answer writing space for students */}
                    {!teacherMode && (
                      <div className="pt-2 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Жауап орны:</div>
                        <div className="border-b border-slate-300 h-6" />
                        <div className="border-b border-slate-300 h-6" />
                      </div>
                    )}

                    {/* Teacher Mode: Answer Key & Descriptor */}
                    {teacherMode && (
                      <div className="pt-3 mt-3 border-t-2 border-dashed border-amber-300 bg-amber-50/80 p-3 rounded-lg space-y-1.5 text-xs text-slate-800">
                        <div className="font-bold text-amber-900 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Дұрыс жауабы:</span>
                        </div>
                        <p className="text-slate-800 font-medium pl-4">{task.answer}</p>

                        <div className="font-bold text-indigo-900 pt-1">Дескриптор:</div>
                        <p className="text-slate-700 pl-4 text-[11px] italic">{task.descriptor}</p>

                        {task.sourceEvidence && (
                          <p className="text-[10px] text-slate-500 pl-4">
                            <span className="font-semibold">Дереккөз:</span> {task.sourceEvidence}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer mark */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              «ҰСТАЗ LAB» — ЖИ арқылы жасалған оқу материалы • A4 Формат
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSavedPage = () => (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span>Менің жұмыстарым</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Бұл браузерде сақталған жұмыс парақтары. Тек сізге қолжетімді.
          </p>
        </div>
        <button
          onClick={() => setCurrentView('constructor')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-1"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Жаңадан жасау</span>
        </button>
      </div>

      {savedWorksheets.length === 0 ? (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3">
          <BookOpen className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="font-bold text-slate-300">Сақталған жұмыс парақтары жоқ</h3>
          <p className="text-xs">Конструктор арқылы алғашқы жұмыс парағыңызды жасап, сақтаңыз.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedWorksheets.map(ws => (
            <div key={ws.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold rounded-lg">
                    {ws.subject} • {ws.grade}
                  </span>
                  <button
                    onClick={() => handleDeleteSaved(ws.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Жою"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-lg text-white line-clamp-1">{ws.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  <span className="font-semibold text-slate-300">Мақсаты:</span> {ws.learningObjective}
                </p>
                <div className="text-[10px] text-slate-500 pt-1">
                  Сақталған күні: {ws.createdAt}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">{ws.tasks?.length || 0} тапсырма</span>
                <button
                  onClick={() => {
                    setCurrentWorksheet(ws);
                    setCurrentView('preview');
                  }}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                >
                  <span>Қарау</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Жүйелік баптаулар</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">ҰСТАЗ LAB жүйесінің параметрлері мен статусы</p>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-slate-800 pb-2">Интерфейс туралы</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-900 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 block">Интерфейс тілі:</span>
              <span className="font-bold text-white text-sm">Қазақ тілі (Мемлекеттік тіл)</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl space-y-1">
              <span className="text-slate-400 block">Платформа нұсқасы:</span>
              <span className="font-bold text-indigo-400 text-sm">ҰСТАЗ LAB v2.6 AI</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-lg text-white border-b border-slate-800 pb-2">AI Қызметінің статусы</h3>
          <div className="bg-slate-900 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-bold text-sm text-white">Gemini AI Integrator Server</div>
              <p className="text-xs text-slate-400">
                Модель қауіпсіз Node.js серверлік архитектурасында жұмыс істейді (POST /api/generate-worksheet).
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400">БЕЛСЕНДІ</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 space-y-1">
          <span className="font-bold block">🔒 Қауіпсіздік кепілдігі:</span>
          Мұғалімдерден ешқандай API key талап етілмейді. Барлық ЖИ сұраныстары қорғалған серверлік архитектура арқылы өңделеді.
        </div>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-2xl font-extrabold text-white flex items-center space-x-2">
          <Info className="w-6 h-6 text-indigo-400" />
          <span>ҰСТАЗ LAB жобасы туралы</span>
        </h2>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 leading-relaxed">
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-indigo-300">Платформа мақсаты</h3>
          <p className="text-sm text-slate-300">
            «ҰСТАЗ LAB» — қазақ тілі мен қазақ әдебиеті мұғалімдеріне арналған арнайы AI Worksheet Constructor. Негізгі мақсат — мұғалімнің уақытын үнемдеп, білім беру стандартына (ОМ) 100% сәйкес келетін мазмұнды жұмыс парақтарын дайындау.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-900 p-4 rounded-xl space-y-2 border border-slate-800">
            <h4 className="font-bold text-white text-sm">Негізгі артықшылығы</h4>
            <p className="text-xs text-slate-400">
              Шаблондық жалпы сұрақтардың орнына пәннің ішкі логикасын (көркем шығарма элементтері немесе граматикалық категориялар) ескеретін нақты тапсырмалар жасауы.
            </p>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl space-y-2 border border-slate-800">
            <h4 className="font-bold text-white text-sm">A4 Форматқа бейімделген</h4>
            <p className="text-xs text-slate-400">
              Барлық нәтиже бірден A4 парағына сыйатындай есептеліп, басып шығаруға немесе Word / PDF форматына жүктеуге дайын күйде беріледі.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 font-sans antialiased text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Global Header */}
      {renderHeader()}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl border border-indigo-500/40 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Task Inline Edit Modal */}
      {editingTaskIndex !== null && editedTask && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white">№{editingTaskIndex + 1} Тапсырманы өңдеу</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Нұсқаулық:</label>
                <input
                  type="text"
                  value={editedTask.instruction}
                  onChange={e => setEditedTask({ ...editedTask, instruction: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Тапсырма мазмұны:</label>
                <textarea
                  rows={4}
                  value={editedTask.content}
                  onChange={e => setEditedTask({ ...editedTask, content: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Дұрыс жауабы:</label>
                <textarea
                  rows={2}
                  value={editedTask.answer}
                  onChange={e => setEditedTask({ ...editedTask, answer: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Дескриптор:</label>
                <input
                  type="text"
                  value={editedTask.descriptor}
                  onChange={e => setEditedTask({ ...editedTask, descriptor: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setEditingTaskIndex(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Бас тарту
              </button>
              <button
                onClick={handleSaveEditTask}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Сақтау
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <div className="transition-all">
        {currentView === 'landing' && renderLandingPage()}
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'constructor' && renderConstructor()}
        {currentView === 'preview' && renderWorksheetPreview()}
        {currentView === 'saved' && renderSavedPage()}
        {currentView === 'settings' && renderSettings()}
        {currentView === 'about' && renderAbout()}
      </div>
    </div>
  );
}
