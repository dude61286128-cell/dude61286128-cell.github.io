@echo off
git add .
git commit -m "자동 수정 업데이트 %date% %time%"
git push origin main
pause