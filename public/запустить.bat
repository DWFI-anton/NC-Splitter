@echo off
chcp 65001 >nul
echo Запуск Разделителя УП...
python split_up.py
if errorlevel 1 (
    echo.
    echo ОШИБКА: Python не найден!
    echo Установите Python с https://python.org
    echo При установке отметьте галочку "Add Python to PATH"
    echo.
    pause
)
