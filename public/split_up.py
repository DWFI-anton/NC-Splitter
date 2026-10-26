"""
Разделитель УП — утилита для разделения файла с несколькими управляющими программами
на отдельные файлы по маркеру %.

Требования: Python 3.x, tkinter (встроен в Python)

Запуск: python split_up.py
"""

import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import os


class UPSplitterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Разделитель УП — Split CNC Programs")
        self.root.geometry("900x650")
        self.root.configure(bg="#1e293b")

        self.programs = []
        self.source_file = ""

        self._build_ui()

    def _build_ui(self):
        # Стили
        bg_dark = "#1e293b"
        bg_card = "#334155"
        text_color = "#e2e8f0"
        accent = "#06b6d4"

        # === Верхняя панель ===
        top_frame = tk.Frame(self.root, bg=bg_dark)
        top_frame.pack(fill=tk.X, padx=10, pady=(10, 5))

        title_label = tk.Label(
            top_frame,
            text="⚙ Разделитель УП",
            font=("Segoe UI", 16, "bold"),
            fg=accent,
            bg=bg_dark,
        )
        title_label.pack(side=tk.LEFT)

        subtitle_label = tk.Label(
            top_frame,
            text="Разделение файлов с управляющими программами по маркеру %",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg=bg_dark,
        )
        subtitle_label.pack(side=tk.LEFT, padx=10)

        # === Панель кнопок ===
        btn_frame = tk.Frame(self.root, bg=bg_dark)
        btn_frame.pack(fill=tk.X, padx=10, pady=5)

        self.btn_open = tk.Button(
            btn_frame,
            text="📂 Открыть файл",
            command=self.open_file,
            font=("Segoe UI", 10),
            bg="#3b82f6",
            fg="white",
            activebackground="#2563eb",
            relief=tk.FLAT,
            padx=15,
            pady=5,
            cursor="hand2",
        )
        self.btn_open.pack(side=tk.LEFT, padx=(0, 5))

        self.btn_split = tk.Button(
            btn_frame,
            text="✂ Разделить",
            command=self.split_programs,
            font=("Segoe UI", 10),
            bg="#06b6d4",
            fg="white",
            activebackground="#0891b2",
            relief=tk.FLAT,
            padx=15,
            pady=5,
            cursor="hand2",
            state=tk.DISABLED,
        )
        self.btn_split.pack(side=tk.LEFT, padx=(0, 5))

        self.btn_save = tk.Button(
            btn_frame,
            text="💾 Сохранить все",
            command=self.save_all,
            font=("Segoe UI", 10),
            bg="#10b981",
            fg="white",
            activebackground="#059669",
            relief=tk.FLAT,
            padx=15,
            pady=5,
            cursor="hand2",
            state=tk.DISABLED,
        )
        self.btn_save.pack(side=tk.LEFT, padx=(0, 5))

        self.btn_save_zip = tk.Button(
            btn_frame,
            text="📦 Сохранить в ZIP",
            command=self.save_as_zip,
            font=("Segoe UI", 10),
            bg="#8b5cf6",
            fg="white",
            activebackground="#7c3aed",
            relief=tk.FLAT,
            padx=15,
            pady=5,
            cursor="hand2",
            state=tk.DISABLED,
        )
        self.btn_save_zip.pack(side=tk.LEFT)

        # === Информация о файле ===
        info_frame = tk.Frame(self.root, bg=bg_dark)
        info_frame.pack(fill=tk.X, padx=10, pady=5)

        self.info_label = tk.Label(
            info_frame,
            text="Файл не выбран",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg=bg_dark,
            anchor=tk.W,
        )
        self.info_label.pack(side=tk.LEFT)

        # === Основная область — список программ ===
        list_frame = tk.LabelFrame(
            self.root,
            text=" Найденные программы ",
            font=("Segoe UI", 10, "bold"),
            fg=accent,
            bg=bg_dark,
            bd=1,
            relief=tk.GROOVE,
        )
        list_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        # Список программ (Treeview)
        list_inner = tk.Frame(list_frame, bg=bg_dark)
        list_inner.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Используем Text widget для простоты
        self.program_list = scrolledtext.ScrolledText(
            list_inner,
            font=("Consolas", 10),
            bg="#0f172a",
            fg=text_color,
            insertbackground=text_color,
            selectbackground="#3b82f6",
            relief=tk.FLAT,
            wrap=tk.WORD,
            state=tk.DISABLED,
        )
        self.program_list.pack(fill=tk.BOTH, expand=True)

        # Настройка тегов
        self.program_list.tag_configure("header", foreground=accent, font=("Consolas", 10, "bold"))
        self.program_list.tag_configure("info", foreground="#94a3b8", font=("Consolas", 9))
        self.program_list.tag_configure("separator", foreground="#475569")

        # === Область предпросмотра ===
        preview_frame = tk.LabelFrame(
            self.root,
            text=" Предпросмотр выбранной программы ",
            font=("Segoe UI", 10, "bold"),
            fg=accent,
            bg=bg_dark,
            bd=1,
            relief=tk.GROOVE,
        )
        preview_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=(5, 10))

        self.preview_text = scrolledtext.ScrolledText(
            preview_frame,
            font=("Consolas", 9),
            bg="#0f172a",
            fg="#a5f3fc",
            insertbackground=text_color,
            selectbackground="#3b82f6",
            relief=tk.FLAT,
            wrap=tk.NONE,
            state=tk.DISABLED,
            height=8,
        )
        self.preview_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Горизонтальный скролл
        h_scroll = tk.Scrollbar(preview_frame, orient=tk.HORIZONTAL, command=self.preview_text.xview)
        h_scroll.pack(fill=tk.X, padx=5)
        self.preview_text.configure(xscrollcommand=h_scroll.set)

        # Привязка клика для предпросмотра
        self.program_list.bind("<ButtonRelease-1>", self.on_program_click)

        # === Статусная строка ===
        self.status_bar = tk.Label(
            self.root,
            text="Готов к работе. Откройте файл с управляющими программами.",
            font=("Segoe UI", 9),
            fg="#64748b",
            bg="#0f172a",
            anchor=tk.W,
            padx=10,
            pady=3,
        )
        self.status_bar.pack(fill=tk.X, side=tk.BOTTOM)

    def open_file(self):
        """Открыть диалог выбора файла"""
        file_path = filedialog.askopenfilename(
            title="Выберите файл с управляющими программами",
            filetypes=[
                ("Все поддерживаемые", "*.txt *.nc *.anc *.cnc *.gcode *.tap *.mpf *.spf *"),
                ("Текстовые файлы", "*.txt"),
                ("NC файлы", "*.nc"),
                ("ANC файлы", "*.anc"),
                ("G-code файлы", "*.gcode"),
                ("Все файлы", "*.*"),
            ],
        )
        if file_path:
            self.source_file = file_path
            filename = os.path.basename(file_path)
            self.info_label.config(text=f"📄 {filename} ({os.path.getsize(file_path):,} байт)")
            self.btn_split.config(state=tk.NORMAL)
            self.status_bar.config(text=f"Файл загружен: {file_path}")

            # Автоматически разделяем
            self.split_programs()

    def split_programs(self):
        """Разделить файл на программы по маркеру %"""
        if not self.source_file:
            messagebox.showwarning("Внимание", "Сначала откройте файл!")
            return

        try:
            with open(self.source_file, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось прочитать файл:\n{e}")
            return

        # Извлекаем base_name и расширение из исходного файла
        file_basename = os.path.basename(self.source_file)
        base_name, ext = os.path.splitext(file_basename)

        # Разделяем по %, сохраняя символы % в начале и конце каждой программы
        parts = content.split("%")
        self.programs = []
        idx = 0

        for part in parts:
            if part.strip():  # есть содержимое между маркерами
                # Оборачиваем обратно в %...% как в оригинальном файле
                prog_content = "%" + part + "%"

                # Формируем имя: {base_name}-A{i+1}{ext}
                name = f"{base_name}-A{idx + 1}{ext}"

                self.programs.append({
                    "name": name,
                    "content": prog_content,
                    "lines": len(prog_content.split("\n")),
                    "size": len(prog_content.encode("utf-8")),
                })
                idx += 1

        # Обновляем список
        self.program_list.config(state=tk.NORMAL)
        self.program_list.delete("1.0", tk.END)

        if not self.programs:
            self.program_list.insert(tk.END, "❌ Программы не найдены. Убедитесь, что файл содержит маркеры %.\n", "info")
            self.btn_save.config(state=tk.DISABLED)
            self.btn_save_zip.config(state=tk.DISABLED)
            self.status_bar.config(text="Программы не найдены!")
        else:
            for i, prog in enumerate(self.programs):
                self.program_list.insert(tk.END, f"  #{i+1}  ", "info")
                self.program_list.insert(tk.END, f"{prog['name']}", "header")
                self.program_list.insert(tk.END, f"  —  {prog['lines']} строк, {prog['size']} байт\n", "info")
                self.program_list.insert(tk.END, "  " + "─" * 60 + "\n", "separator")

            self.btn_save.config(state=tk.NORMAL)
            self.btn_save_zip.config(state=tk.NORMAL)
            self.status_bar.config(text=f"Найдено программ: {len(self.programs)}")

        self.program_list.config(state=tk.DISABLED)

    def on_program_click(self, event):
        """Показать предпросмотр при клике на программу"""
        if not self.programs:
            return

        # Определяем, на какую программу кликнули
        index = event.widget.index(f"@{event.x},{event.y}")
        line_num = int(index.split(".")[0])

        # Каждая программа занимает 2 строки (имя + разделитель)
        prog_index = (line_num - 1) // 2
        if 0 <= prog_index < len(self.programs):
            prog = self.programs[prog_index]
            self.preview_text.config(state=tk.NORMAL)
            self.preview_text.delete("1.0", tk.END)
            self.preview_text.insert(tk.END, prog["content"])
            self.preview_text.config(state=tk.DISABLED)

    def save_all(self):
        """Сохранить все программы в выбранную папку"""
        if not self.programs:
            return

        folder = filedialog.askdirectory(title="Выберите папку для сохранения")
        if not folder:
            return

        saved = 0
        for prog in self.programs:
            file_path = os.path.join(folder, prog['name'])

            # Если файл уже существует, добавляем номер
            counter = 1
            base_path = file_path
            while os.path.exists(file_path):
                name_part, ext_part = os.path.splitext(base_path)
                file_path = f"{name_part}_{counter}{ext_part}"
                counter += 1

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(prog["content"])
            saved += 1

        self.status_bar.config(text=f"✅ Сохранено {saved} файлов в: {folder}")
        messagebox.showinfo("Готово", f"Сохранено {saved} файлов в папку:\n{folder}")

    def save_as_zip(self):
        """Сохранить все программы в ZIP-архив"""
        if not self.programs:
            return

        try:
            import zipfile
        except ImportError:
            messagebox.showerror("Ошибка", "Модуль zipfile не найден!")
            return

        file_path = filedialog.asksaveasfilename(
            title="Сохранить ZIP-архив",
            defaultextension=".zip",
            filetypes=[("ZIP архив", "*.zip")],
            initialfile="programs.zip",
        )
        if not file_path:
            return

        try:
            with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for prog in self.programs:
                    zf.writestr(prog['name'], prog["content"])

            self.status_bar.config(text=f"✅ ZIP-архив сохранён: {file_path}")
            messagebox.showinfo("Готово", f"Архив сохранён:\n{file_path}\n\nФайлов в архиве: {len(self.programs)}")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось создать архив:\n{e}")


def main():
    root = tk.Tk()

    # Попытка установить иконку (если есть)
    try:
        root.iconbitmap(default="")
    except Exception:
        pass

    app = UPSplitterApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
