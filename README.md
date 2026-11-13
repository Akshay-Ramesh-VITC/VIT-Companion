# VIT Companion

## Overview

VIT Companion is a lightweight browser extension designed to speed up common student workflows on the VIT college portal. It automates credential autofill, helps parse captchas, and exposes quick-access utilities (timetable, marks, attendance, exam schedule) from a popup UI so you can get into the portal and find what you need faster.

## Features

- Autofill login form fields (username, password) to reduce manual typing.
- Captcha parsing helper to speed up login during peak hours (best-effort; not guaranteed for all captcha types).
- Quick-access popup for:
	- Timetable
	- Marks view
	- Attendance
	- Exam schedule
- Small, self-contained codebase: no build step required to load the extension in Developer mode.
- New automated functionality to scrape all marks and saved in db
- Export all semester marks as Excel
- Updated "Enhance Marks Page" to enhance for Embedded Courses and Online Courses
  
## Why This Project?

Everytime I needed to access the College's website, the login page is the most time taking part. Thus, I made this self-hosted extension to quickly login especially during the time where the network traffic to the site is high.

## NEW!
- Academic Calendar Scraper (latest semester), local save + display
- Export as HTML to use in Phones
- Export universal .ics calendar to add academic holidays, exams & personal events to phone calendar (iPhone / Android)
- Personal Events & Deadlines planner with automatic semester date bounds
- Custom box and tag color selection for "Exam / Quiz" personal events (hex picker & 8 color presets)
- Manual Day Status Override: easily toggle any day between Working Day (with Day Order) and Holiday for sudden classes or rain holidays announced via email
- Automatic Academic Calendar overlay highlighting upcoming CAT & FAT exam dates directly on the calendar grid and day details
- Exam Schedule & Seat Finder with offline access, venue/hall lookup, and live next-exam countdown
- Intelligent FAT Seat No. fallback when Seat Location is omitted or '-'
- One-click exam schedule export (.ics for phones) and instant copy (WhatsApp format & Markdown table)
- VTOP in-page navigation bar with instant SPA loading without full-page refresh
- 🎯 FAT Target Calculator & GPA Simulator (calculates required FAT marks out of 100 for target grades and forecasts semester GPA/CGPA)
