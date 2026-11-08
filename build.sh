#!/bin/sh
# Tạo index.html (trang chạy trên GitHub Pages) từ mã nguồn src/sa-ban-chien-thuat.html.
# Mã nguồn không có <!doctype>/<head> để dùng được cả làm Artifact trên claude.ai;
# script này bọc thêm phần đầu trang chuẩn.
set -e
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  cat src/sa-ban-chien-thuat.html
  printf '\n</html>\n'
} > index.html
echo "Đã tạo index.html"
