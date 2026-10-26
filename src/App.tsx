import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface Program {
  name: string;
  content: string;
  index: number;
}

function App() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [selectedPrograms, setSelectedPrograms] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [prefix, setPrefix] = useState<string>('');
  const [suffix, setSuffix] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePrograms = useCallback((content: string, name: string) => {
    setError('');
    setFileName(name);

    // Split by % marker
    const parts = content.split('%');
    const found: Program[] = [];

    // Filter out empty parts and trim
    let idx = 0;
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        // Try to extract program name from O-number or first line
        let progName = '';
        const lines = trimmed.split('\n');
        const firstLine = lines[0]?.trim() || '';

        // Check for O-number pattern (common in CNC)
        const oNumberMatch = firstLine.match(/^[Oo](\d+)/);
        if (oNumberMatch) {
          progName = `O${oNumberMatch[1]}`;
        } else if (firstLine.match(/^%/)) {
          // If first line is %, check second line
          const secondLine = lines[1]?.trim() || '';
          const oMatch = secondLine.match(/^[Oo](\d+)/);
          if (oMatch) {
            progName = `O${oMatch[1]}`;
          }
        }

        if (!progName) {
          // Use first meaningful line or index
          progName = firstLine.substring(0, 30).replace(/[^a-zA-Z0-9_\-]/g, '_') || `program_${idx + 1}`;
        }

        found.push({
          name: progName,
          content: trimmed,
          index: idx,
        });
        idx++;
      }
    }

    if (found.length === 0) {
      setError('Не найдено управляющих программ в файле. Убедитесь, что файл содержит маркеры %.');
      setPrograms([]);
    } else {
      setPrograms(found);
      setSelectedPrograms(new Set(found.map((_, i) => i)));
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parsePrograms(content, file.name);
    };
    reader.onerror = () => {
      setError('Ошибка чтения файла');
    };
    reader.readAsText(file);
  }, [parsePrograms]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const toggleSelection = useCallback((index: number) => {
    setSelectedPrograms(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPrograms(new Set(programs.map((_, i) => i)));
  }, [programs]);

  const deselectAll = useCallback(() => {
    setSelectedPrograms(new Set());
  }, []);

  const downloadSingle = useCallback((program: Program) => {
    const blob = new Blob([program.content], { type: 'text/plain;charset=utf-8' });
    const safeName = program.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    saveAs(blob, `${prefix}${safeName}${suffix}.txt`);
  }, [prefix, suffix]);

  const downloadAll = useCallback(async () => {
    const selected = programs.filter((_, i) => selectedPrograms.has(i));
    if (selected.length === 0) return;

    if (selected.length === 1) {
      downloadSingle(selected[0]);
      return;
    }

    const zip = new JSZip();
    for (const program of selected) {
      const safeName = program.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      zip.file(`${prefix}${safeName}${suffix}.txt`, program.content);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const baseName = fileName.replace(/\.[^.]+$/, '');
    saveAs(content, `${baseName}_split.zip`);
  }, [programs, selectedPrograms, fileName, downloadSingle, prefix, suffix]);

  const downloadAllAsFiles = useCallback(() => {
    const selected = programs.filter((_, i) => selectedPrograms.has(i));
    for (const program of selected) {
      downloadSingle(program);
    }
  }, [programs, selectedPrograms, downloadSingle]);

  const reset = useCallback(() => {
    setPrograms([]);
    setFileName('');
    setError('');
    setSelectedPrograms(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Разделитель УП</h1>
            <p className="text-xs text-slate-400">Разделение файлов с управляющими программами по маркерам %</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload Area */}
        {programs.length === 0 && (
          <div className="flex flex-col items-center">
            <div
              className={`w-full max-w-2xl border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
                ${isDragging
                  ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]'
                  : 'border-slate-600 hover:border-slate-400 hover:bg-slate-800/50'
                }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-200 mb-2">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="text-sm text-slate-400">
                Поддерживаются файлы с управляющими программами (G-code, CNC)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInput}
                accept=".txt,.nc,.cnc,.gcode,.tap,.mpf,.spf,*"
              />
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm max-w-2xl w-full">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Info section */}
            <div className="mt-8 max-w-2xl w-full">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Как это работает
                </h3>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    Загрузите файл, содержащий несколько управляющих программ
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    Программы разделяются по маркеру <code className="px-1.5 py-0.5 bg-slate-700 rounded text-cyan-300 text-xs">%</code>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    Выберите нужные программы и скачайте их по отдельности или все вместе в ZIP-архиве
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-2">Пример структуры файла:</p>
                  <pre className="text-xs text-slate-300 font-mono overflow-x-auto">{`%
O0001
G90 G21
G00 X0 Y0
...
%
O0002
G90 G21
G00 X10 Y10
...
%`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {programs.length > 0 && (
          <div className="space-y-6">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Загрузить другой файл
                </button>
                <div className="text-sm text-slate-400">
                  <span className="text-white font-medium">{fileName}</span>
                  <span className="mx-2">→</span>
                  <span className="text-cyan-400 font-medium">{programs.length} программ</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                >
                  Выбрать все
                </button>
                <button
                  onClick={deselectAll}
                  className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                >
                  Снять выбор
                </button>
              </div>
            </div>

            {/* Naming options */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Настройки имён файлов</h3>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Префикс:</label>
                  <input
                    type="text"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="нет"
                    className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-32"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Суффикс:</label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="нет"
                    className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-32"
                  />
                </div>
                <div className="text-xs text-slate-500 flex items-center">
                  Имя файла: <code className="mx-1 px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{prefix}O0001{suffix}.txt</code>
                </div>
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadAll}
                disabled={selectedPrograms.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Скачать выбранные в ZIP ({selectedPrograms.size})
              </button>
              <button
                onClick={downloadAllAsFiles}
                disabled={selectedPrograms.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Скачать каждый файл отдельно
              </button>
            </div>

            {/* Program list */}
            <div className="grid gap-3">
              {programs.map((program, index) => (
                <div
                  key={index}
                  className={`bg-slate-800/70 rounded-xl border transition-all duration-200 ${
                    selectedPrograms.has(index)
                      ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/5'
                      : 'border-slate-700/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelection(index)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        selectedPrograms.has(index)
                          ? 'bg-cyan-500 border-cyan-400'
                          : 'border-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {selectedPrograms.has(index) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* Program info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
                        <span className="font-medium text-white truncate">{program.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {program.content.split('\n').length} строк • {new Blob([program.content]).size} байт
                      </div>
                    </div>

                    {/* Preview toggle */}
                    <ProgramPreview content={program.content} />

                    {/* Download button */}
                    <button
                      onClick={() => downloadSingle(program)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Скачать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-500">
          Разделитель управляющих программ • Файлы обрабатываются локально в вашем браузере
        </div>
      </footer>
    </div>
  );
}

function ProgramPreview({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const lines = content.split('\n');
  const previewLines = lines.slice(0, 10);

  return (
    <div className="flex-shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Просмотр
      </button>
      {isOpen && (
        <div className="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-700 max-h-48 overflow-auto">
          <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
            {previewLines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-slate-600 w-8 text-right mr-3 select-none flex-shrink-0">{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
            {lines.length > 10 && (
              <div className="text-slate-500 mt-1">... ещё {lines.length - 10} строк</div>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
